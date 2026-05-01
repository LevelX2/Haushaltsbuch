import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { calculateValues } from "@/lib/calculations";
import { prisma } from "@/server/prisma";

const actorInput = z.enum(["CODEX", "SYSTEM", "USER"]).default("CODEX");

const actionInput = z.enum([
  "LINK_PURCHASE_DOCUMENT_TO_COST_POSITION",
  "SET_PURCHASE_DOCUMENT_CATEGORY",
  "SET_PURCHASE_DOCUMENT_RECURRENCE",
  "CREATE_COST_POSITION_FROM_PURCHASE_DOCUMENT",
  "LINK_PAYMENT_TO_COST_POSITION",
  "CONFIRM_PAYMENT_MATCH",
  "MARK_DOCUMENT_DUPLICATE",
  "IGNORE_DOCUMENT",
  "CREATE_OR_UPDATE_IMPORT_RULE",
]);

const entityTypeInput = z
  .enum(["PURCHASE_DOCUMENT", "PAYMENT", "DOCUMENT", "COST_POSITION", "CATEGORY", "IMPORT_RULE", "PAYMENT_MATCH"])
  .optional();

const importRunInput = z.object({
  source: z.string().trim().min(1),
  sourcePath: z.string().trim().nullable().optional(),
  sourceHash: z.string().trim().nullable().optional(),
  parserVersion: z.string().trim().nullable().optional(),
  actor: actorInput,
  status: z.enum(["RUNNING", "SUCCESS", "PARTIAL", "FAILED"]).default("RUNNING"),
  parsedCount: z.coerce.number().int().min(0).default(0),
  createdCount: z.coerce.number().int().min(0).default(0),
  updatedCount: z.coerce.number().int().min(0).default(0),
  skippedCount: z.coerce.number().int().min(0).default(0),
  errorCount: z.coerce.number().int().min(0).default(0),
  summaryJson: z.string().default("{}"),
  message: z.string().trim().nullable().optional(),
});

const importRuleInput = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().nullable().optional(),
  source: z.string().trim().nullable().optional(),
  action: actionInput,
  status: z.enum(["ACTIVE", "PAUSED", "NEEDS_REVIEW"]).default("ACTIVE"),
  priority: z.coerce.number().int().default(100),
  confidenceThreshold: z.coerce.number().min(0).max(1).default(0.86),
  sampleRate: z.coerce.number().min(0).max(1).default(0.1),
  matchJson: z.string().default("{}"),
  actionJson: z.string().default("{}"),
  targetEntityType: z.string().trim().nullable().optional(),
  targetEntityId: z.string().trim().nullable().optional(),
  notes: z.string().trim().nullable().optional(),
});

const importDecisionInput = z.object({
  importRunId: z.string().trim().nullable().optional(),
  importRuleId: z.string().trim().nullable().optional(),
  action: actionInput,
  actor: actorInput,
  confidence: z.coerce.number().min(0).max(1).default(0),
  reason: z.string().trim().nullable().optional(),
  sourceEntityType: entityTypeInput,
  sourceEntityId: z.string().trim().nullable().optional(),
  targetEntityType: entityTypeInput,
  targetEntityId: z.string().trim().nullable().optional(),
  sourceHash: z.string().trim().nullable().optional(),
  payload: z.record(z.unknown()).default({}),
});

type ImportDecisionInput = z.infer<typeof importDecisionInput>;
type PreviewIssue = { severity: "error" | "warning"; path: string; message: string };
type PlannedChange = { entityType: string; entityId: string | null; before: unknown; after: unknown };
type DbClient = Prisma.TransactionClient | typeof prisma;

export async function listImportRuns() {
  return prisma.importRun.findMany({ orderBy: { startedAt: "desc" }, take: 100 });
}

export async function createImportRun(raw: unknown) {
  const input = importRunInput.parse(raw);
  return prisma.importRun.create({
    data: {
      ...input,
      finishedAt: input.status === "RUNNING" ? null : new Date(),
    },
  });
}

export async function listImportRules() {
  return prisma.importRule.findMany({ orderBy: [{ status: "asc" }, { priority: "asc" }, { updatedAt: "desc" }] });
}

export async function createImportRule(raw: unknown) {
  const input = importRuleInput.parse(raw);
  validateJsonString(input.matchJson, "matchJson");
  validateJsonString(input.actionJson, "actionJson");
  return prisma.importRule.create({ data: input });
}

export async function updateImportRule(id: string, raw: unknown) {
  const input = importRuleInput.partial().parse(raw);
  if (input.matchJson !== undefined) validateJsonString(input.matchJson, "matchJson");
  if (input.actionJson !== undefined) validateJsonString(input.actionJson, "actionJson");
  return prisma.importRule.update({ where: { id }, data: input });
}

export async function listImportDecisions(searchParams?: URLSearchParams) {
  const status = searchParams?.get("status");
  return prisma.importDecision.findMany({
    where: status && status !== "ALL" ? { status: status as Prisma.EnumImportDecisionStatusFilter["equals"] } : {},
    include: { importRun: true, importRule: true, auditLogs: { orderBy: { createdAt: "desc" }, take: 3 } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export async function previewImportDecision(raw: unknown) {
  const input = importDecisionInput.parse(raw);
  return buildPreview(prisma, input);
}

export async function applyImportDecision(raw: unknown) {
  const input = importDecisionInput.parse(raw);
  return prisma.$transaction(async (tx) => {
    const preview = await buildPreview(tx, input);
    const blocked = preview.validationIssues.some((issue) => issue.severity === "error");
    const status = blocked ? "BLOCKED" : decisionStatus(input, preview.sample);
    const decision = await tx.importDecision.create({
      data: {
        importRunId: input.importRunId ?? null,
        importRuleId: input.importRuleId ?? null,
        action: input.action,
        status,
        actor: input.actor,
        confidence: input.confidence,
        reason: input.reason ?? null,
        sourceEntityType: input.sourceEntityType ?? null,
        sourceEntityId: input.sourceEntityId ?? null,
        targetEntityType: input.targetEntityType ?? null,
        targetEntityId: input.targetEntityId ?? null,
        sourceHash: input.sourceHash ?? null,
        sample: preview.sample,
        payloadJson: JSON.stringify(input.payload),
        validationJson: JSON.stringify(preview.validationIssues),
      },
    });

    if (blocked) {
      await createBlockedSuggestion(tx, decision.id, input, preview.validationIssues);
      return { ...preview, decision };
    }

    const result = await executeAction(tx, input, decision.id, preview.plannedChanges);
    const updatedDecision = await tx.importDecision.update({
      where: { id: decision.id },
      data: {
        targetEntityType: result.targetEntityType ?? decision.targetEntityType,
        targetEntityId: result.targetEntityId ?? decision.targetEntityId,
        resultJson: JSON.stringify(result.result),
        appliedAt: new Date(),
      },
    });

    if (input.importRuleId) {
      await tx.importRule.update({
        where: { id: input.importRuleId },
        data: { applicationCount: { increment: 1 }, lastAppliedAt: new Date() },
      });
    }

    return { ...preview, decision: updatedDecision, result: result.result };
  });
}

export async function recordImportDecisionForReview(raw: unknown, validationIssues: PreviewIssue[] = []) {
  const input = importDecisionInput.parse(raw);
  const decision = await prisma.importDecision.create({
    data: {
      importRunId: input.importRunId ?? null,
      importRuleId: input.importRuleId ?? null,
      action: input.action,
      status: "NEEDS_REVIEW",
      actor: input.actor,
      confidence: input.confidence,
      reason: input.reason ?? null,
      sourceEntityType: input.sourceEntityType ?? null,
      sourceEntityId: input.sourceEntityId ?? null,
      targetEntityType: input.targetEntityType ?? null,
      targetEntityId: input.targetEntityId ?? null,
      sourceHash: input.sourceHash ?? null,
      sample: true,
      payloadJson: JSON.stringify(input.payload),
      validationJson: JSON.stringify(validationIssues),
    },
  });
  await prisma.importSuggestion.create({
    data: {
      suggestionType: "IMPORT_DECISION_REVIEW",
      suggestedAction: input.action,
      extractedJson: JSON.stringify({ decisionId: decision.id, validationIssues }),
      confidence: input.confidence,
      status: "OPEN",
      notes: input.reason ?? "Importentscheidung benötigt Prüfung.",
    },
  });
  return decision;
}

export async function pauseRulesForEntityCorrection(entityType: string, entityId: string, reason: string) {
  const decisions = await prisma.importDecision.findMany({
    where: {
      status: { in: ["AUTO_APPLIED", "APPLIED"] },
      importRuleId: { not: null },
      OR: [
        { sourceEntityType: entityType, sourceEntityId: entityId },
        { targetEntityType: entityType, targetEntityId: entityId },
      ],
    },
    select: { importRuleId: true },
    distinct: ["importRuleId"],
  });
  const ruleIds = decisions.map((decision) => decision.importRuleId).filter((id): id is string => Boolean(id));
  if (!ruleIds.length) {
    return { paused: 0 };
  }
  const result = await prisma.importRule.updateMany({
    where: { id: { in: ruleIds }, status: "ACTIVE" },
    data: { status: "NEEDS_REVIEW", notes: reason },
  });
  return { paused: result.count };
}

async function buildPreview(db: DbClient, input: ImportDecisionInput) {
  const validationIssues: PreviewIssue[] = [];
  const plannedChanges: PlannedChange[] = [];
  const affectedEntities: Array<{ entityType: string; entityId: string | null }> = [];
  const rule = input.importRuleId ? await db.importRule.findUnique({ where: { id: input.importRuleId } }) : null;

  if (input.importRunId && !(await db.importRun.findUnique({ where: { id: input.importRunId } }))) {
    validationIssues.push({ severity: "error", path: "importRunId", message: "Der Importlauf existiert nicht." });
  }
  if (input.importRuleId && !rule) {
    validationIssues.push({ severity: "error", path: "importRuleId", message: "Die Importregel existiert nicht." });
  }
  if (rule && rule.status !== "ACTIVE") {
    validationIssues.push({ severity: "error", path: "importRuleId", message: "Die Importregel ist nicht aktiv." });
  }

  addAutomationThresholdIssue(validationIssues, input, rule);
  addActionPolicyIssue(validationIssues, input, rule);

  switch (input.action) {
    case "LINK_PURCHASE_DOCUMENT_TO_COST_POSITION":
      await previewPurchaseDocumentLink(db, input, validationIssues, plannedChanges, affectedEntities);
      break;
    case "SET_PURCHASE_DOCUMENT_CATEGORY":
      await previewPurchaseDocumentCategory(db, input, validationIssues, plannedChanges, affectedEntities);
      break;
    case "SET_PURCHASE_DOCUMENT_RECURRENCE":
      await previewPurchaseDocumentRecurrence(db, input, validationIssues, plannedChanges, affectedEntities);
      break;
    case "CREATE_COST_POSITION_FROM_PURCHASE_DOCUMENT":
      await previewCreateCostPosition(db, input, validationIssues, plannedChanges, affectedEntities);
      break;
    case "LINK_PAYMENT_TO_COST_POSITION":
      await previewPaymentLink(db, input, validationIssues, plannedChanges, affectedEntities);
      break;
    case "CONFIRM_PAYMENT_MATCH":
      await previewPaymentMatch(db, input, validationIssues, plannedChanges, affectedEntities);
      break;
    case "MARK_DOCUMENT_DUPLICATE":
    case "IGNORE_DOCUMENT":
      await previewDocumentStatus(db, input, validationIssues, plannedChanges, affectedEntities);
      break;
    case "CREATE_OR_UPDATE_IMPORT_RULE":
      await previewRuleMutation(db, input, validationIssues, plannedChanges, affectedEntities);
      break;
  }

  const severity = validationIssues.some((issue) => issue.severity === "error")
    ? "error"
    : validationIssues.some((issue) => issue.severity === "warning")
      ? "warning"
      : "ok";

  return {
    canApply: severity !== "error",
    severity,
    sample: shouldSample(input, rule),
    validationIssues,
    affectedEntities,
    plannedChanges,
  };
}

function addAutomationThresholdIssue(issues: PreviewIssue[], input: ImportDecisionInput, rule: { confidenceThreshold: number } | null) {
  if (input.actor === "USER") {
    return;
  }
  const threshold = rule ? rule.confidenceThreshold : input.payload.historicalMatch === true ? 0.86 : 0.94;
  if (input.confidence < threshold) {
    issues.push({
      severity: "error",
      path: "confidence",
      message: `Confidence ${Math.round(input.confidence * 100)} % liegt unter der Automatikschwelle ${Math.round(threshold * 100)} %.`,
    });
  }
}

function addActionPolicyIssue(issues: PreviewIssue[], input: ImportDecisionInput, rule: { id: string } | null) {
  if (!["MARK_DOCUMENT_DUPLICATE", "IGNORE_DOCUMENT"].includes(input.action)) {
    return;
  }
  if (input.actor !== "USER" && !rule) {
    issues.push({
      severity: "error",
      path: "action",
      message: "Ignorieren oder Dublettenmarkierung durch Automatik benötigt eine aktive Regel.",
    });
  }
}

async function previewPurchaseDocumentLink(
  db: DbClient,
  input: ImportDecisionInput,
  issues: PreviewIssue[],
  changes: PlannedChange[],
  affected: Array<{ entityType: string; entityId: string | null }>,
) {
  const purchaseDocumentId = requiredId(input.sourceEntityId, "sourceEntityId", issues);
  const costPositionId = requiredId(input.targetEntityId, "targetEntityId", issues);
  if (!purchaseDocumentId || !costPositionId) return;
  const [document, costPosition] = await Promise.all([
    db.purchaseDocument.findUnique({ where: { id: purchaseDocumentId } }),
    db.costPosition.findUnique({ where: { id: costPositionId } }),
  ]);
  validatePurchaseDocument(document, input, issues);
  validateCostPosition(costPosition, issues);
  if (document) {
    changes.push({
      entityType: "PURCHASE_DOCUMENT",
      entityId: document.id,
      before: pick(document, ["id", "linkedCostPositionId", "confidenceStatus"]),
      after: { linkedCostPositionId: costPositionId },
    });
    affected.push({ entityType: "PURCHASE_DOCUMENT", entityId: document.id }, { entityType: "COST_POSITION", entityId: costPositionId });
  }
}

async function previewPurchaseDocumentCategory(
  db: DbClient,
  input: ImportDecisionInput,
  issues: PreviewIssue[],
  changes: PlannedChange[],
  affected: Array<{ entityType: string; entityId: string | null }>,
) {
  const purchaseDocumentId = requiredId(input.sourceEntityId, "sourceEntityId", issues);
  const categoryId = stringPayload(input, "categoryId") ?? input.targetEntityId ?? null;
  if (!purchaseDocumentId) return;
  const [document, category] = await Promise.all([
    db.purchaseDocument.findUnique({ where: { id: purchaseDocumentId } }),
    categoryId ? db.category.findUnique({ where: { id: categoryId } }) : null,
  ]);
  validatePurchaseDocument(document, input, issues);
  if (categoryId && (!category || !category.active)) {
    issues.push({ severity: "error", path: "categoryId", message: "Die Kategorie existiert nicht oder ist inaktiv." });
  }
  if (document) {
    changes.push({
      entityType: "PURCHASE_DOCUMENT",
      entityId: document.id,
      before: pick(document, ["id", "categoryId", "confidenceStatus"]),
      after: { categoryId },
    });
    affected.push({ entityType: "PURCHASE_DOCUMENT", entityId: document.id }, { entityType: "CATEGORY", entityId: categoryId });
  }
}

async function previewPurchaseDocumentRecurrence(
  db: DbClient,
  input: ImportDecisionInput,
  issues: PreviewIssue[],
  changes: PlannedChange[],
  affected: Array<{ entityType: string; entityId: string | null }>,
) {
  const purchaseDocumentId = requiredId(input.sourceEntityId, "sourceEntityId", issues);
  const recurrenceCandidate = stringPayload(input, "recurrenceCandidate");
  if (!purchaseDocumentId || !recurrenceCandidate) {
    if (!recurrenceCandidate) issues.push({ severity: "error", path: "payload.recurrenceCandidate", message: "Wiederkehr-Einschätzung fehlt." });
    return;
  }
  if (!["RECURRING", "POTENTIAL_RECURRING", "ONE_TIME", "UNCLEAR"].includes(recurrenceCandidate)) {
    issues.push({ severity: "error", path: "payload.recurrenceCandidate", message: "Wiederkehr-Einschätzung ist ungültig." });
  }
  const document = await db.purchaseDocument.findUnique({ where: { id: purchaseDocumentId } });
  validatePurchaseDocument(document, input, issues);
  if (document) {
    changes.push({
      entityType: "PURCHASE_DOCUMENT",
      entityId: document.id,
      before: pick(document, ["id", "recurrenceCandidate", "confidenceStatus"]),
      after: { recurrenceCandidate },
    });
    affected.push({ entityType: "PURCHASE_DOCUMENT", entityId: document.id });
  }
}

async function previewCreateCostPosition(
  db: DbClient,
  input: ImportDecisionInput,
  issues: PreviewIssue[],
  changes: PlannedChange[],
  affected: Array<{ entityType: string; entityId: string | null }>,
) {
  const purchaseDocumentId = requiredId(input.sourceEntityId, "sourceEntityId", issues);
  if (!purchaseDocumentId) return;
  const document = await db.purchaseDocument.findUnique({ where: { id: purchaseDocumentId } });
  validatePurchaseDocument(document, input, issues);
  if (!document) return;
  if (document.linkedCostPositionId) {
    issues.push({ severity: "error", path: "sourceEntityId", message: "Der Ausgabenbeleg ist bereits mit einer Kostenposition verknüpft." });
  }
  if (document.amountCents <= 0) {
    issues.push({ severity: "error", path: "sourceEntityId", message: "Aus einem Null- oder Stornobeleg wird keine Kostenposition automatisch angelegt." });
  }
  const categoryId = stringPayload(input, "categoryId") ?? document.categoryId;
  if (categoryId && !(await db.category.findUnique({ where: { id: categoryId } }))) {
    issues.push({ severity: "error", path: "payload.categoryId", message: "Die Kategorie existiert nicht." });
  }
  changes.push({
    entityType: "COST_POSITION",
    entityId: null,
    before: null,
    after: {
      title: stringPayload(input, "title") ?? document.title,
      amountCents: Math.abs(document.amountCents),
      recurrenceType: stringPayload(input, "recurrenceType") ?? recurrenceTypeFromPurchaseDocument(document.recurrenceCandidate),
      categoryId,
    },
  });
  affected.push({ entityType: "PURCHASE_DOCUMENT", entityId: document.id });
}

async function previewPaymentLink(
  db: DbClient,
  input: ImportDecisionInput,
  issues: PreviewIssue[],
  changes: PlannedChange[],
  affected: Array<{ entityType: string; entityId: string | null }>,
) {
  const paymentId = requiredId(input.sourceEntityId, "sourceEntityId", issues);
  const costPositionId = requiredId(input.targetEntityId, "targetEntityId", issues);
  if (!paymentId || !costPositionId) return;
  const [payment, costPosition] = await Promise.all([
    db.payment.findUnique({ where: { id: paymentId } }),
    db.costPosition.findUnique({ where: { id: costPositionId } }),
  ]);
  if (!payment) issues.push({ severity: "error", path: "sourceEntityId", message: "Die Zahlung existiert nicht." });
  if (payment?.status === "IGNORED") issues.push({ severity: "error", path: "sourceEntityId", message: "Ignorierte Zahlungen werden nicht automatisch verknüpft." });
  validateCostPosition(costPosition, issues);
  if (payment) {
    changes.push({
      entityType: "PAYMENT",
      entityId: payment.id,
      before: pick(payment, ["id", "costPositionId", "status"]),
      after: { costPositionId },
    });
    affected.push({ entityType: "PAYMENT", entityId: payment.id }, { entityType: "COST_POSITION", entityId: costPositionId });
  }
}

async function previewPaymentMatch(
  db: DbClient,
  input: ImportDecisionInput,
  issues: PreviewIssue[],
  changes: PlannedChange[],
  affected: Array<{ entityType: string; entityId: string | null }>,
) {
  const paymentMatchId = stringPayload(input, "paymentMatchId");
  const purchaseDocumentId = stringPayload(input, "purchaseDocumentId") ?? input.sourceEntityId ?? null;
  const paymentId = stringPayload(input, "paymentId") ?? input.targetEntityId ?? null;
  const existing = paymentMatchId ? await db.paymentMatch.findUnique({ where: { id: paymentMatchId } }) : null;
  const resolvedPurchaseDocumentId = existing?.purchaseDocumentId ?? purchaseDocumentId;
  const resolvedPaymentId = existing?.paymentId ?? paymentId;
  if (!resolvedPurchaseDocumentId || !resolvedPaymentId) {
    issues.push({ severity: "error", path: "payload", message: "Für den Zahlungsabgleich fehlen Beleg oder Zahlung." });
    return;
  }
  const [document, payment] = await Promise.all([
    db.purchaseDocument.findUnique({ where: { id: resolvedPurchaseDocumentId } }),
    db.payment.findUnique({ where: { id: resolvedPaymentId } }),
  ]);
  if (!document) issues.push({ severity: "error", path: "purchaseDocumentId", message: "Der Ausgabenbeleg existiert nicht." });
  if (!payment) issues.push({ severity: "error", path: "paymentId", message: "Die Zahlung existiert nicht." });
  if (document && (document.status === "CANCELLED" || document.amountCents === 0)) {
    issues.push({ severity: "error", path: "purchaseDocumentId", message: "Nicht zahlungsrelevante Belege werden nicht abgeglichen." });
  }
  if (payment?.status === "IGNORED") {
    issues.push({ severity: "error", path: "paymentId", message: "Ignorierte Zahlungen werden nicht abgeglichen." });
  }
  changes.push({
    entityType: "PAYMENT_MATCH",
    entityId: paymentMatchId ?? null,
    before: existing ? pick(existing, ["id", "status", "score", "reason"]) : null,
    after: {
      purchaseDocumentId: resolvedPurchaseDocumentId,
      paymentId: resolvedPaymentId,
      status: input.actor === "USER" ? "MANUAL_CONFIRMED" : "AUTO_CONFIRMED",
      score: input.confidence,
    },
  });
  affected.push({ entityType: "PURCHASE_DOCUMENT", entityId: resolvedPurchaseDocumentId }, { entityType: "PAYMENT", entityId: resolvedPaymentId });
}

async function previewDocumentStatus(
  db: DbClient,
  input: ImportDecisionInput,
  issues: PreviewIssue[],
  changes: PlannedChange[],
  affected: Array<{ entityType: string; entityId: string | null }>,
) {
  const entityId = requiredId(input.sourceEntityId, "sourceEntityId", issues);
  const entityType = input.sourceEntityType;
  if (!entityId) return;
  if (entityType === "DOCUMENT") {
    const document = await db.document.findUnique({ where: { id: entityId } });
    if (!document) issues.push({ severity: "error", path: "sourceEntityId", message: "Das Dokument existiert nicht." });
    if (document) {
      changes.push({
        entityType,
        entityId,
        before: pick(document, ["id", "importStatus"]),
        after: { importStatus: input.action === "IGNORE_DOCUMENT" ? "IGNORED" : "DUPLICATE" },
      });
    }
  } else if (entityType === "PURCHASE_DOCUMENT") {
    const document = await db.purchaseDocument.findUnique({ where: { id: entityId } });
    validatePurchaseDocument(document, input, issues);
    if (document) {
      changes.push({
        entityType,
        entityId,
        before: pick(document, ["id", "status", "confidenceStatus"]),
        after: {
          status: input.action === "IGNORE_DOCUMENT" ? "IGNORED" : "DUPLICATE",
          confidenceStatus: "IGNORED",
        },
      });
    }
  } else {
    issues.push({ severity: "error", path: "sourceEntityType", message: "Diese Aktion unterstützt nur Dokumente oder Ausgabenbelege." });
  }
  affected.push({ entityType: entityType ?? "UNKNOWN", entityId });
}

async function previewRuleMutation(
  db: DbClient,
  input: ImportDecisionInput,
  issues: PreviewIssue[],
  changes: PlannedChange[],
  affected: Array<{ entityType: string; entityId: string | null }>,
) {
  const ruleId = stringPayload(input, "ruleId");
  const existing = ruleId ? await db.importRule.findUnique({ where: { id: ruleId } }) : null;
  if (ruleId && !existing) {
    issues.push({ severity: "error", path: "payload.ruleId", message: "Die zu ändernde Importregel existiert nicht." });
  }
  const data = ruleDataFromPayload(input.payload, issues);
  changes.push({
    entityType: "IMPORT_RULE",
    entityId: ruleId ?? null,
    before: existing,
    after: data,
  });
  affected.push({ entityType: "IMPORT_RULE", entityId: ruleId ?? null });
}

async function executeAction(tx: Prisma.TransactionClient, input: ImportDecisionInput, decisionId: string, plannedChanges: PlannedChange[]) {
  switch (input.action) {
    case "LINK_PURCHASE_DOCUMENT_TO_COST_POSITION": {
      const before = await tx.purchaseDocument.findUniqueOrThrow({ where: { id: input.sourceEntityId ?? "" } });
      const updated = await tx.purchaseDocument.update({
        where: { id: input.sourceEntityId ?? "" },
        data: { linkedCostPositionId: input.targetEntityId },
      });
      await audit(tx, decisionId, input, "PURCHASE_DOCUMENT", updated.id, before, updated);
      return result("PURCHASE_DOCUMENT", updated.id, updated);
    }
    case "SET_PURCHASE_DOCUMENT_CATEGORY": {
      const categoryId = stringPayload(input, "categoryId") ?? input.targetEntityId ?? null;
      const before = await tx.purchaseDocument.findUniqueOrThrow({ where: { id: input.sourceEntityId ?? "" } });
      const updated = await tx.purchaseDocument.update({ where: { id: before.id }, data: { categoryId } });
      await audit(tx, decisionId, input, "PURCHASE_DOCUMENT", updated.id, before, updated);
      return result("PURCHASE_DOCUMENT", updated.id, updated);
    }
    case "SET_PURCHASE_DOCUMENT_RECURRENCE": {
      const before = await tx.purchaseDocument.findUniqueOrThrow({ where: { id: input.sourceEntityId ?? "" } });
      const updated = await tx.purchaseDocument.update({
        where: { id: before.id },
        data: { recurrenceCandidate: stringPayload(input, "recurrenceCandidate") ?? "UNCLEAR" },
      });
      await audit(tx, decisionId, input, "PURCHASE_DOCUMENT", updated.id, before, updated);
      return result("PURCHASE_DOCUMENT", updated.id, updated);
    }
    case "CREATE_COST_POSITION_FROM_PURCHASE_DOCUMENT":
      return createCostPositionFromPurchaseDocument(tx, input, decisionId);
    case "LINK_PAYMENT_TO_COST_POSITION": {
      const before = await tx.payment.findUniqueOrThrow({ where: { id: input.sourceEntityId ?? "" } });
      const updated = await tx.payment.update({ where: { id: before.id }, data: { costPositionId: input.targetEntityId } });
      await audit(tx, decisionId, input, "PAYMENT", updated.id, before, updated);
      return result("PAYMENT", updated.id, updated);
    }
    case "CONFIRM_PAYMENT_MATCH":
      return confirmPaymentMatch(tx, input, decisionId);
    case "MARK_DOCUMENT_DUPLICATE":
    case "IGNORE_DOCUMENT":
      return updateDocumentStatus(tx, input, decisionId);
    case "CREATE_OR_UPDATE_IMPORT_RULE":
      return createOrUpdateRule(tx, input, decisionId);
  }
}

async function createCostPositionFromPurchaseDocument(tx: Prisma.TransactionClient, input: ImportDecisionInput, decisionId: string) {
  const document = await tx.purchaseDocument.findUniqueOrThrow({ where: { id: input.sourceEntityId ?? "" } });
  const recurrenceType = stringPayload(input, "recurrenceType") ?? recurrenceTypeFromPurchaseDocument(document.recurrenceCandidate);
  const recurrenceClass = recurrenceType === "ONE_TIME" ? "ONE_TIME" : "RECURRING";
  const values = calculateValues({
    amountCents: Math.abs(document.amountCents),
    recurrenceType: recurrenceType as never,
    recurrenceClass: recurrenceClass as never,
    recurrenceCustomRule: null,
  });
  const costPosition = await tx.costPosition.create({
    data: {
      title: stringPayload(input, "title") ?? document.title,
      providerId: document.providerId,
      categoryId: stringPayload(input, "categoryId") ?? document.categoryId,
      householdScopeId: document.householdScopeId,
      amountCents: Math.abs(document.amountCents),
      currency: document.currency,
      recurrenceType: recurrenceType as never,
      recurrenceClass: recurrenceClass as never,
      limitationType: recurrenceType === "ONE_TIME" ? "NOT_APPLICABLE" : "UNLIMITED",
      startDate: document.documentDate,
      status: "ACTIVE",
      confidenceStatus: "AUTO_DETECTED",
      sourceType: "IMPORT",
      monthlyValueCents: values.monthlyValueCents,
      yearlyValueCents: values.yearlyValueCents,
      notes: `Automatisch aus Ausgabenbeleg ${document.id} angelegt.`,
    },
  });
  await tx.costPositionVersion.create({
    data: {
      costPositionId: costPosition.id,
      validFrom: document.documentDate ?? new Date(),
      amountCents: costPosition.amountCents,
      recurrenceType: costPosition.recurrenceType,
      recurrenceClass: costPosition.recurrenceClass,
      limitationType: costPosition.limitationType,
      monthlyValueCents: costPosition.monthlyValueCents,
      yearlyValueCents: costPosition.yearlyValueCents,
      notes: "Automatisch aus Importentscheidung angelegt.",
      sourceType: "IMPORT",
    },
  });
  const updatedDocument = await tx.purchaseDocument.update({
    where: { id: document.id },
    data: { linkedCostPositionId: costPosition.id, categoryId: costPosition.categoryId },
  });
  await audit(tx, decisionId, input, "COST_POSITION", costPosition.id, null, costPosition);
  await audit(tx, decisionId, input, "PURCHASE_DOCUMENT", updatedDocument.id, document, updatedDocument);
  return result("COST_POSITION", costPosition.id, { costPosition, purchaseDocument: updatedDocument });
}

async function confirmPaymentMatch(tx: Prisma.TransactionClient, input: ImportDecisionInput, decisionId: string) {
  const paymentMatchId = stringPayload(input, "paymentMatchId");
  const purchaseDocumentId = stringPayload(input, "purchaseDocumentId") ?? input.sourceEntityId ?? "";
  const paymentId = stringPayload(input, "paymentId") ?? input.targetEntityId ?? "";
  const before = paymentMatchId ? await tx.paymentMatch.findUnique({ where: { id: paymentMatchId } }) : null;
  const status = input.actor === "USER" ? "MANUAL_CONFIRMED" : "AUTO_CONFIRMED";
  const paymentMatch = before
    ? await tx.paymentMatch.update({
        where: { id: before.id },
        data: { status, score: input.confidence, reason: input.reason ?? before.reason },
      })
    : await tx.paymentMatch.upsert({
        where: { purchaseDocumentId_paymentId: { purchaseDocumentId, paymentId } },
        update: { status, score: input.confidence, reason: input.reason ?? null },
        create: { purchaseDocumentId, paymentId, status, score: input.confidence, reason: input.reason ?? null },
      });
  await audit(tx, decisionId, input, "PAYMENT_MATCH", paymentMatch.id, before, paymentMatch);
  return result("PAYMENT_MATCH", paymentMatch.id, paymentMatch);
}

async function updateDocumentStatus(tx: Prisma.TransactionClient, input: ImportDecisionInput, decisionId: string) {
  if (input.sourceEntityType === "DOCUMENT") {
    const before = await tx.document.findUniqueOrThrow({ where: { id: input.sourceEntityId ?? "" } });
    const updated = await tx.document.update({
      where: { id: before.id },
      data: { importStatus: input.action === "IGNORE_DOCUMENT" ? "IGNORED" : "DUPLICATE" },
    });
    await audit(tx, decisionId, input, "DOCUMENT", updated.id, before, updated);
    return result("DOCUMENT", updated.id, updated);
  }
  const before = await tx.purchaseDocument.findUniqueOrThrow({ where: { id: input.sourceEntityId ?? "" } });
  const updated = await tx.purchaseDocument.update({
    where: { id: before.id },
    data: { status: input.action === "IGNORE_DOCUMENT" ? "IGNORED" : "DUPLICATE", confidenceStatus: "IGNORED" },
  });
  await audit(tx, decisionId, input, "PURCHASE_DOCUMENT", updated.id, before, updated);
  return result("PURCHASE_DOCUMENT", updated.id, updated);
}

async function createOrUpdateRule(tx: Prisma.TransactionClient, input: ImportDecisionInput, decisionId: string) {
  const ruleId = stringPayload(input, "ruleId");
  const data = ruleDataFromPayload(input.payload, []);
  const before = ruleId ? await tx.importRule.findUnique({ where: { id: ruleId } }) : null;
  const rule = ruleId
    ? await tx.importRule.update({ where: { id: ruleId }, data })
    : await tx.importRule.create({ data: data as Prisma.ImportRuleCreateInput });
  await audit(tx, decisionId, input, "IMPORT_RULE", rule.id, before, rule);
  return result("IMPORT_RULE", rule.id, rule);
}

function result(targetEntityType: string, targetEntityId: string, value: unknown) {
  return { targetEntityType, targetEntityId, result: value };
}

async function audit(
  tx: Prisma.TransactionClient,
  decisionId: string,
  input: ImportDecisionInput,
  entityType: string,
  entityId: string,
  before: unknown,
  after: unknown,
) {
  await tx.auditLog.create({
    data: {
      importDecisionId: decisionId,
      entityType,
      entityId,
      action: input.action,
      actor: input.actor,
      beforeJson: before ? JSON.stringify(compactObject(before)) : null,
      afterJson: after ? JSON.stringify(compactObject(after)) : null,
      reason: input.reason ?? null,
      sourceHash: input.sourceHash ?? null,
    },
  });
}

async function createBlockedSuggestion(
  tx: Prisma.TransactionClient,
  decisionId: string,
  input: ImportDecisionInput,
  issues: PreviewIssue[],
) {
  await tx.importSuggestion.create({
    data: {
      suggestionType: "IMPORT_DECISION_BLOCKED",
      suggestedAction: input.action,
      extractedJson: JSON.stringify({ decisionId, issues }),
      confidence: input.confidence,
      status: "OPEN",
      notes: input.reason ?? "Automatische Importentscheidung wurde durch Validierung blockiert.",
    },
  });
}

function validatePurchaseDocument(
  document: { id: string; confidenceStatus: string; status: string } | null,
  input: ImportDecisionInput,
  issues: PreviewIssue[],
) {
  if (!document) {
    issues.push({ severity: "error", path: "sourceEntityId", message: "Der Ausgabenbeleg existiert nicht." });
    return;
  }
  if (document.confidenceStatus === "IGNORED" || document.status === "IGNORED") {
    issues.push({ severity: "error", path: "sourceEntityId", message: "Ignorierte Ausgabenbelege werden nicht automatisch verändert." });
  }
  if (document.confidenceStatus === "MANUALLY_CONFIRMED" && input.actor !== "USER" && input.payload.allowManualOverwrite !== true) {
    issues.push({
      severity: "error",
      path: "sourceEntityId",
      message: "Manuell bestätigte Belegdaten werden nicht automatisch überschrieben.",
    });
  }
}

function validateCostPosition(
  costPosition: { id: string; status: string; confidenceStatus: string } | null,
  issues: PreviewIssue[],
) {
  if (!costPosition) {
    issues.push({ severity: "error", path: "targetEntityId", message: "Die Kostenposition existiert nicht." });
    return;
  }
  if (!["ACTIVE", "ENDED"].includes(costPosition.status) || ["IGNORED", "OBSOLETE", "REPLACED"].includes(costPosition.confidenceStatus)) {
    issues.push({ severity: "error", path: "targetEntityId", message: "Die Ziel-Kostenposition ist nicht automatisch beschreibbar." });
  }
}

function ruleDataFromPayload(payload: Record<string, unknown>, issues: PreviewIssue[]) {
  const name = stringPayload({ payload } as ImportDecisionInput, "name");
  const action = stringPayload({ payload } as ImportDecisionInput, "action");
  if (!name) issues.push({ severity: "error", path: "payload.name", message: "Regelname fehlt." });
  if (!action || !actionInput.safeParse(action).success) {
    issues.push({ severity: "error", path: "payload.action", message: "Regelaktion fehlt oder ist ungültig." });
  }
  return {
    name: name ?? "Importregel",
    description: stringPayload({ payload } as ImportDecisionInput, "description"),
    source: stringPayload({ payload } as ImportDecisionInput, "source"),
    action: (action ?? "LINK_PURCHASE_DOCUMENT_TO_COST_POSITION") as never,
    status: (stringPayload({ payload } as ImportDecisionInput, "status") ?? "ACTIVE") as never,
    priority: numberPayload(payload, "priority") ?? 100,
    confidenceThreshold: numberPayload(payload, "confidenceThreshold") ?? 0.86,
    sampleRate: numberPayload(payload, "sampleRate") ?? 0.1,
    matchJson: JSON.stringify(payload.match ?? {}),
    actionJson: JSON.stringify(payload.ruleAction ?? payload.actionPayload ?? {}),
    targetEntityType: stringPayload({ payload } as ImportDecisionInput, "targetEntityType"),
    targetEntityId: stringPayload({ payload } as ImportDecisionInput, "targetEntityId"),
    notes: stringPayload({ payload } as ImportDecisionInput, "notes"),
  };
}

function requiredId(value: string | null | undefined, path: string, issues: PreviewIssue[]) {
  if (!value) {
    issues.push({ severity: "error", path, message: "Pflicht-ID fehlt." });
    return null;
  }
  return value;
}

function stringPayload(input: ImportDecisionInput, key: string) {
  const value = input.payload[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberPayload(payload: Record<string, unknown>, key: string) {
  const value = payload[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function recurrenceTypeFromPurchaseDocument(recurrenceCandidate: string) {
  if (recurrenceCandidate === "ONE_TIME") return "ONE_TIME";
  if (recurrenceCandidate === "RECURRING" || recurrenceCandidate === "POTENTIAL_RECURRING") return "MONTHLY";
  return "UNCLEAR";
}

function shouldSample(input: ImportDecisionInput, rule: { sampleRate: number } | null) {
  if (input.action === "CREATE_OR_UPDATE_IMPORT_RULE") {
    return true;
  }
  if (input.actor === "USER") {
    return false;
  }
  const sampleRate = rule?.sampleRate ?? 0.1;
  return Math.random() < sampleRate;
}

function decisionStatus(input: ImportDecisionInput, sample: boolean) {
  if (input.actor === "USER") {
    return "APPLIED" as const;
  }
  return sample ? ("AUTO_APPLIED" as const) : ("AUTO_APPLIED" as const);
}

function pick<T extends Record<string, unknown>>(value: T, keys: string[]) {
  return Object.fromEntries(keys.map((key) => [key, value[key]]));
}

function compactObject(value: unknown) {
  if (!value || typeof value !== "object") return value;
  const record = value as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const key of ["id", "title", "name", "status", "confidenceStatus", "categoryId", "linkedCostPositionId", "costPositionId", "paymentId", "purchaseDocumentId", "action", "source", "externalDocumentNumber"]) {
    if (key in record) result[key] = record[key];
  }
  return Object.keys(result).length ? result : record;
}

function validateJsonString(value: string, field: string) {
  try {
    JSON.parse(value);
  } catch {
    throw new Error(`${field} muss gültiges JSON enthalten.`);
  }
}
