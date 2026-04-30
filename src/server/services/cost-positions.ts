import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { calculateValues } from "@/lib/calculations";
import { eurosToCents } from "@/lib/money";
import { prisma } from "@/server/prisma";

const emptyToNull = z.preprocess((value) => (value === "" ? null : value), z.string().nullable().optional());
const dateValue = emptyToNull.transform((value) => (value ? new Date(`${value}T00:00:00`) : null));
const amountValue = z.union([z.string(), z.number()]).transform(eurosToCents);

const mergeCostPositionInput = z.object({
  targetCostPositionId: z.string().min(1),
});

export const costPositionInput = z.object({
  title: z.string().trim().min(1, "Bezeichnung fehlt"),
  providerId: emptyToNull,
  categoryId: emptyToNull,
  householdScopeId: emptyToNull,
  amount: amountValue,
  currency: z.string().trim().default("EUR"),
  recurrenceType: z
    .enum([
      "MONTHLY",
      "EVERY_TWO_MONTHS",
      "QUARTERLY",
      "SEMI_YEARLY",
      "YEARLY",
      "WEEKLY",
      "EVERY_FOUR_WEEKS",
      "ONE_TIME",
      "IRREGULAR",
      "CUSTOM",
      "UNCLEAR",
    ])
    .default("UNCLEAR"),
  recurrenceCustomRule: emptyToNull,
  recurrenceClass: z.enum(["RECURRING", "ONE_TIME", "UNCLEAR"]).default("UNCLEAR"),
  limitationType: z
    .enum(["UNLIMITED", "UNTIL_DATE", "NUMBER_OF_PAYMENTS", "UNKNOWN", "NOT_APPLICABLE"])
    .default("UNKNOWN"),
  paymentCountLimit: z.coerce.number().int().positive().nullable().optional(),
  startDate: dateValue,
  endDate: dateValue,
  nextDueDate: dateValue,
  paymentMethod: emptyToNull,
  status: z.enum(["ACTIVE", "INACTIVE", "ENDED"]).default("ACTIVE"),
  confidenceStatus: z
    .enum([
      "SAFE",
      "ESTIMATED",
      "AUTO_DETECTED",
      "MANUALLY_CONFIRMED",
      "NEEDS_REVIEW",
      "OBSOLETE",
      "REPLACED",
      "IGNORED",
    ])
    .default("MANUALLY_CONFIRMED"),
  notes: emptyToNull,
});

export type CostPositionInput = z.infer<typeof costPositionInput>;

export async function listCostPositions(searchParams: URLSearchParams) {
  const where: Prisma.CostPositionWhereInput = {};
  const query = searchParams.get("q")?.trim();

  if (query) {
    where.OR = [
      { title: { contains: query } },
      { notes: { contains: query } },
      { provider: { name: { contains: query } } },
      { category: { name: { contains: query } } },
    ];
  }

  const recurrenceClass = searchParams.get("recurrenceClass");
  if (recurrenceClass) {
    where.recurrenceClass = recurrenceClass as Prisma.EnumRecurrenceClassFilter["equals"];
  }

  const status = searchParams.get("status") ?? "ACTIVE";
  if (status && status !== "ALL") {
    where.status = status as Prisma.EnumLifecycleStatusFilter["equals"];
  }

  const categoryId = searchParams.get("categoryId");
  if (categoryId) {
    where.categoryId = categoryId;
  }

  const providerId = searchParams.get("providerId");
  if (providerId) {
    where.providerId = providerId;
  }

  const limited = searchParams.get("limited");
  if (limited === "true") {
    where.limitationType = { in: ["UNTIL_DATE", "NUMBER_OF_PAYMENTS"] };
  }

  const due = searchParams.get("due");
  if (due === "true") {
    where.nextDueDate = { not: null };
  }

  const sort = searchParams.get("sort") ?? "updatedAt";
  const direction = searchParams.get("direction") === "asc" ? "asc" : "desc";
  const orderBy = sortOrder(sort, direction);

  return prisma.costPosition.findMany({
    where,
    include: {
      provider: true,
      category: true,
      householdScope: true,
    },
    orderBy,
  });
}

export async function getCostPosition(id: string) {
  return prisma.costPosition.findUniqueOrThrow({
    where: { id },
    include: {
      provider: true,
      category: true,
      householdScope: true,
      payments: { include: { provider: true }, orderBy: { date: "desc" } },
      documents: { orderBy: { createdAt: "desc" } },
      purchaseDocuments: {
        include: {
          provider: true,
          paymentMatches: { include: { payment: true }, orderBy: { score: "desc" } },
        },
        orderBy: [{ documentDate: "desc" }, { createdAt: "desc" }],
      },
      versions: { orderBy: { validFrom: "desc" } },
    },
  });
}

export async function createCostPosition(raw: unknown) {
  const input = costPositionInput.parse(raw);
  const values = calculateValues({
    amountCents: input.amount,
    recurrenceType: input.recurrenceType,
    recurrenceClass: input.recurrenceClass,
    recurrenceCustomRule: input.recurrenceCustomRule,
  });

  return prisma.$transaction(async (tx) => {
    const costPosition = await tx.costPosition.create({
      data: {
        title: input.title,
        providerId: input.providerId,
        categoryId: input.categoryId,
        householdScopeId: input.householdScopeId,
        amountCents: input.amount,
        currency: input.currency || "EUR",
        recurrenceType: input.recurrenceType,
        recurrenceCustomRule: input.recurrenceCustomRule,
        recurrenceClass: input.recurrenceClass,
        limitationType: input.limitationType,
        paymentCountLimit: input.paymentCountLimit ?? null,
        startDate: input.startDate,
        endDate: input.endDate,
        nextDueDate: input.nextDueDate,
        paymentMethod: input.paymentMethod,
        status: input.status,
        confidenceStatus: input.confidenceStatus,
        monthlyValueCents: values.monthlyValueCents,
        yearlyValueCents: values.yearlyValueCents,
        sourceType: "MANUAL",
        notes: input.notes,
      },
    });

    await tx.costPositionVersion.create({
      data: {
        costPositionId: costPosition.id,
        validFrom: input.startDate ?? new Date(),
        amountCents: costPosition.amountCents,
        recurrenceType: costPosition.recurrenceType,
        recurrenceClass: costPosition.recurrenceClass,
        limitationType: costPosition.limitationType,
        monthlyValueCents: costPosition.monthlyValueCents,
        yearlyValueCents: costPosition.yearlyValueCents,
        notes: "Initiale manuelle Erfassung.",
        sourceType: "MANUAL",
      },
    });

    return costPosition;
  });
}

export async function updateCostPosition(id: string, raw: unknown) {
  const input = costPositionInput.partial().parse(raw);
  const current = await prisma.costPosition.findUniqueOrThrow({ where: { id } });
  const amountCents = input.amount ?? current.amountCents;
  const recurrenceType = input.recurrenceType ?? current.recurrenceType;
  const recurrenceClass = input.recurrenceClass ?? current.recurrenceClass;
  const recurrenceCustomRule =
    input.recurrenceCustomRule === undefined ? current.recurrenceCustomRule : input.recurrenceCustomRule;
  const values = calculateValues({
    amountCents,
    recurrenceType,
    recurrenceClass,
    recurrenceCustomRule,
  });

  return prisma.$transaction(async (tx) => {
    const costPosition = await tx.costPosition.update({
      where: { id },
      data: {
        ...("title" in input ? { title: input.title } : {}),
        ...("providerId" in input ? { providerId: input.providerId } : {}),
        ...("categoryId" in input ? { categoryId: input.categoryId } : {}),
        ...("householdScopeId" in input ? { householdScopeId: input.householdScopeId } : {}),
        ...("amount" in input ? { amountCents } : {}),
        ...("currency" in input ? { currency: input.currency } : {}),
        ...("recurrenceType" in input ? { recurrenceType } : {}),
        ...("recurrenceCustomRule" in input ? { recurrenceCustomRule } : {}),
        ...("recurrenceClass" in input ? { recurrenceClass } : {}),
        ...("limitationType" in input ? { limitationType: input.limitationType } : {}),
        ...("paymentCountLimit" in input ? { paymentCountLimit: input.paymentCountLimit ?? null } : {}),
        ...("startDate" in input ? { startDate: input.startDate } : {}),
        ...("endDate" in input ? { endDate: input.endDate } : {}),
        ...("nextDueDate" in input ? { nextDueDate: input.nextDueDate } : {}),
        ...("paymentMethod" in input ? { paymentMethod: input.paymentMethod } : {}),
        ...("status" in input ? { status: input.status } : {}),
        ...("confidenceStatus" in input ? { confidenceStatus: input.confidenceStatus } : {}),
        ...("notes" in input ? { notes: input.notes } : {}),
        monthlyValueCents: values.monthlyValueCents,
        yearlyValueCents: values.yearlyValueCents,
      },
    });

    if (
      input.amount !== undefined ||
      input.recurrenceType !== undefined ||
      input.recurrenceClass !== undefined ||
      input.limitationType !== undefined
    ) {
      await tx.costPositionVersion.create({
        data: {
          costPositionId: id,
          validFrom: input.startDate ?? new Date(),
          amountCents: costPosition.amountCents,
          recurrenceType: costPosition.recurrenceType,
          recurrenceClass: costPosition.recurrenceClass,
          limitationType: costPosition.limitationType,
          monthlyValueCents: costPosition.monthlyValueCents,
          yearlyValueCents: costPosition.yearlyValueCents,
          notes: "Manuelle Änderung.",
          sourceType: "MANUAL",
        },
      });
    }

    return costPosition;
  });
}

export async function mergeCostPosition(id: string, raw: unknown) {
  const input = mergeCostPositionInput.parse(raw);
  if (id === input.targetCostPositionId) {
    throw new Error("Eine Kostenposition kann nicht mit sich selbst zusammengeführt werden.");
  }

  return prisma.$transaction(async (tx) => {
    const [source, target] = await Promise.all([
      tx.costPosition.findUniqueOrThrow({ where: { id }, include: { provider: true } }),
      tx.costPosition.findUniqueOrThrow({ where: { id: input.targetCostPositionId } }),
    ]);
    if (!["ACTIVE", "ENDED"].includes(source.status) || ["IGNORED", "OBSOLETE", "REPLACED"].includes(source.confidenceStatus)) {
      throw new Error("Diese Kostenposition kann nicht zusammengeführt werden.");
    }
    if (!["ACTIVE", "ENDED"].includes(target.status) || ["IGNORED", "OBSOLETE", "REPLACED"].includes(target.confidenceStatus)) {
      throw new Error("Das Ziel muss eine nicht ersetzte Kostenposition sein.");
    }

    const [payments, documents, importSuggestions, purchaseDocuments] = await Promise.all([
      tx.payment.updateMany({ where: { costPositionId: source.id }, data: { costPositionId: target.id } }),
      tx.document.updateMany({ where: { linkedCostPositionId: source.id }, data: { linkedCostPositionId: target.id } }),
      tx.importSuggestion.updateMany({ where: { linkedCostPositionId: source.id }, data: { linkedCostPositionId: target.id } }),
      tx.purchaseDocument.updateMany({ where: { linkedCostPositionId: source.id }, data: { linkedCostPositionId: target.id } }),
    ]);

    const targetStartDate = earlierDate(target.startDate, source.startDate);
    const targetNextDueDate = target.nextDueDate ?? source.nextDueDate;
    const mergedAt = new Date();
    const sourceNote = `Zusammengeführt in "${target.title}" (${target.id}) am ${mergedAt.toISOString().slice(0, 10)}.`;
    const targetNote = `Dublette "${source.title}" (${source.id}) wurde am ${mergedAt.toISOString().slice(0, 10)} zusammengeführt.`;

    const updatedTarget = await tx.costPosition.update({
      where: { id: target.id },
      data: {
        startDate: targetStartDate,
        nextDueDate: targetNextDueDate,
        notes: appendNote(target.notes, targetNote),
      },
    });

    await tx.costPositionVersion.create({
      data: {
        costPositionId: target.id,
        validFrom: mergedAt,
        amountCents: updatedTarget.amountCents,
        recurrenceType: updatedTarget.recurrenceType,
        recurrenceClass: updatedTarget.recurrenceClass,
        limitationType: updatedTarget.limitationType,
        monthlyValueCents: updatedTarget.monthlyValueCents,
        yearlyValueCents: updatedTarget.yearlyValueCents,
        notes: `Zusammenführung mit Dublette "${source.title}".`,
        sourceType: "MANUAL",
      },
    });

    await tx.costPosition.delete({ where: { id: source.id } });

    return {
      target: updatedTarget,
      sourceId: source.id,
      sourceDeleted: true,
      moved: {
        payments: payments.count,
        documents: documents.count,
        importSuggestions: importSuggestions.count,
        purchaseDocuments: purchaseDocuments.count,
      },
    };
  });
}

function earlierDate(left: Date | null, right: Date | null) {
  if (!left) return right;
  if (!right) return left;
  return left <= right ? left : right;
}

function appendNote(current: string | null, note: string) {
  return [current?.trim(), note].filter(Boolean).join("\n");
}

function sortOrder(sort: string, direction: "asc" | "desc"): Prisma.CostPositionOrderByWithRelationInput {
  switch (sort) {
    case "monthlyValue":
      return { monthlyValueCents: direction };
    case "yearlyValue":
      return { yearlyValueCents: direction };
    case "amount":
      return { amountCents: direction };
    case "nextDueDate":
      return { nextDueDate: direction };
    case "provider":
      return { provider: { name: direction } };
    case "category":
      return { category: { name: direction } };
    case "title":
      return { title: direction };
    default:
      return { updatedAt: direction };
  }
}
