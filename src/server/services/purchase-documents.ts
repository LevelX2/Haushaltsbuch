import { z } from "zod";
import { eurosToCents } from "@/lib/money";
import { normalizeName, timestampForFile } from "@/lib/format";
import { prisma } from "@/server/prisma";

const amazonTextImportInput = z.object({
  text: z.string().min(20),
});

const paymentMatchStatusInput = z.object({
  status: z.enum(["MANUAL_CONFIRMED", "REJECTED"]),
});

const purchaseDocumentUpdateInput = z.object({
  recurrenceCandidate: z.enum(["RECURRING", "POTENTIAL_RECURRING", "ONE_TIME", "UNCLEAR"]).optional(),
});

type ParsedPurchase = {
  source: string;
  externalProviderName: string;
  externalDocumentNumber: string;
  title: string;
  documentDate: Date | null;
  amountCents: number;
  status: string;
  recurrenceCandidate: string;
  deliveryStatus?: string;
  items: string[];
  raw: Record<string, unknown>;
};

const amazonProviderName = "Amazon.de";

export async function listPurchaseDocuments() {
  return prisma.purchaseDocument.findMany({
    include: {
      provider: true,
      category: true,
      householdScope: true,
      linkedCostPosition: true,
      sourceDocument: true,
      items: { orderBy: { createdAt: "asc" } },
      paymentMatches: { include: { payment: { include: { provider: true } } }, orderBy: { score: "desc" } },
    },
    orderBy: [{ documentDate: "desc" }, { createdAt: "desc" }],
  });
}

export async function autoMatchPurchaseDocuments() {
  const [purchaseDocuments, payments] = await Promise.all([
    prisma.purchaseDocument.findMany({
      where: { status: { notIn: ["CANCELLED"] }, amountCents: { gt: 0 } },
      include: { provider: true, items: true },
      orderBy: [{ documentDate: "asc" }, { createdAt: "asc" }],
    }),
    prisma.payment.findMany({
      where: {
        status: { not: "IGNORED" },
        amountCents: { not: 0 },
      },
      include: { provider: true, sourceDocument: true },
      orderBy: { date: "asc" },
    }),
  ]);

  let created = 0;
  let updated = 0;
  let autoConfirmed = 0;
  let proposed = 0;
  let ambiguous = 0;
  let unmatched = 0;

  for (const document of purchaseDocuments) {
    const candidates = payments
      .map((payment) => scorePaymentMatch(document, payment))
      .filter((candidate) => candidate.score >= 0.62)
      .sort((left, right) => right.score - left.score);

    if (!candidates.length) {
      unmatched += 1;
      continue;
    }

    const best = candidates[0];
    const competing = candidates[1];
    const status =
      competing && best.score - competing.score < 0.08
        ? "AMBIGUOUS"
        : best.score >= 0.86
          ? "AUTO_CONFIRMED"
          : "PROPOSED";

    const result = await prisma.paymentMatch.upsert({
      where: {
        purchaseDocumentId_paymentId: {
          purchaseDocumentId: document.id,
          paymentId: best.payment.id,
        },
      },
      update: {
        status,
        score: best.score,
        reason: best.reason,
        amountDeltaCents: best.amountDeltaCents,
        dateDeltaDays: best.dateDeltaDays,
      },
      create: {
        purchaseDocumentId: document.id,
        paymentId: best.payment.id,
        status,
        score: best.score,
        reason: best.reason,
        amountDeltaCents: best.amountDeltaCents,
        dateDeltaDays: best.dateDeltaDays,
      },
      select: { createdAt: true, updatedAt: true },
    });

    if (result.createdAt.getTime() === result.updatedAt.getTime()) {
      created += 1;
    } else {
      updated += 1;
    }

    if (status === "AUTO_CONFIRMED") {
      autoConfirmed += 1;
    } else if (status === "AMBIGUOUS") {
      ambiguous += 1;
    } else {
      proposed += 1;
    }
  }

  return {
    scannedPurchaseDocuments: purchaseDocuments.length,
    scannedPayments: payments.length,
    created,
    updated,
    autoConfirmed,
    proposed,
    ambiguous,
    unmatched,
  };
}

export async function updatePaymentMatchStatus(id: string, raw: unknown) {
  const input = paymentMatchStatusInput.parse(raw);
  return prisma.paymentMatch.update({
    where: { id },
    data: {
      status: input.status,
      notes: input.status === "MANUAL_CONFIRMED" ? "Manuell bestätigter Zahlungsabgleich." : "Manuell abgelehnter Zahlungsabgleich.",
    },
    include: { payment: { include: { provider: true } } },
  });
}

export async function updatePurchaseDocument(id: string, raw: unknown) {
  const input = purchaseDocumentUpdateInput.parse(raw);
  return prisma.purchaseDocument.update({
    where: { id },
    data: input,
    include: {
      provider: true,
      category: true,
      householdScope: true,
      linkedCostPosition: true,
      sourceDocument: true,
      items: { orderBy: { createdAt: "asc" } },
      paymentMatches: { include: { payment: { include: { provider: true } } }, orderBy: { score: "desc" } },
    },
  });
}

export async function importAmazonOrderText(raw: unknown) {
  const input = amazonTextImportInput.parse(raw);
  const parsedOrders = parseAmazonOrders(input.text);
  const provider = await ensureProvider(amazonProviderName);
  const sourceDocument = await prisma.document.create({
    data: {
      filePath: `import://amazon-orders/${timestampForFile()}.txt`,
      fileName: `Amazon Bestellseiten ${timestampForFile()}.txt`,
      documentType: "AUFTRAGSBESTÄTIGUNG",
      documentGroup: "ZAHLUNGSBELEGE",
      providerId: provider.id,
      extractionJson: JSON.stringify({ source: "AMAZON", rawText: input.text }),
      importStatus: "IMPORTED",
      notes: "Aus kopiertem Amazon-Bestellseitentext importiert.",
    },
  });

  let created = 0;
  let skipped = 0;
  const documents = [];

  for (const order of parsedOrders) {
    const duplicate = await prisma.purchaseDocument.findUnique({
      where: {
        source_externalDocumentNumber: {
          source: order.source,
          externalDocumentNumber: order.externalDocumentNumber,
        },
      },
    });

    if (duplicate) {
      skipped += 1;
      continue;
    }

    const document = await prisma.purchaseDocument.create({
      data: {
        source: order.source,
        externalProviderName: order.externalProviderName,
        externalDocumentNumber: order.externalDocumentNumber,
        title: order.title,
        documentDate: order.documentDate,
        dueDate: null,
        amountCents: order.amountCents,
        status: order.status,
        recurrenceCandidate: order.recurrenceCandidate,
        confidenceStatus: "NEEDS_REVIEW",
        providerId: provider.id,
        linkedCostPositionId: null,
        sourceDocumentId: sourceDocument.id,
        rawJson: JSON.stringify(order.raw),
        notes: order.deliveryStatus ?? null,
        items: {
          create: order.items.map((title) => ({
            title,
            recurrenceCandidate: order.recurrenceCandidate,
          })),
        },
      },
      include: { items: true },
    });
    documents.push(document);
    created += 1;
  }

  return {
    sourceDocument,
    parsed: parsedOrders.length,
    created,
    skipped,
    documents,
  };
}

function scorePaymentMatch(
  document: {
    amountCents: number;
    documentDate: Date | null;
    dueDate: Date | null;
    externalDocumentNumber: string | null;
    externalProviderName: string | null;
    title: string;
    provider: { name: string } | null;
    items: Array<{ title: string }>;
  },
  payment: {
    id: string;
    date: Date;
    amountCents: number;
    description: string | null;
    provider: { name: string } | null;
  },
) {
  const reasons: string[] = [];
  let score = 0;
  const amountDeltaCents = Math.abs(Math.abs(payment.amountCents) - document.amountCents);
  if (amountDeltaCents === 0) {
    score += 0.42;
    reasons.push("Betrag exakt");
  } else if (amountDeltaCents <= 2) {
    score += 0.36;
    reasons.push("Betrag fast exakt");
  } else if (amountDeltaCents <= 100) {
    score += 0.18;
    reasons.push("Betrag ähnlich");
  }

  const paymentText = normalizeMatchText([payment.provider?.name, payment.description].filter(Boolean).join(" "));
  const documentNumber = document.externalDocumentNumber ? normalizeMatchText(document.externalDocumentNumber) : "";
  if (documentNumber && paymentText.includes(documentNumber)) {
    score += 0.42;
    reasons.push("Belegnummer im Verwendungszweck");
  }

  const providerText = normalizeMatchText([document.externalProviderName, document.provider?.name].filter(Boolean).join(" "));
  if (providerText && paymentText.includes(providerText)) {
    score += 0.11;
    reasons.push("Anbieter erkannt");
  } else if (providerText && providerText.includes("amazon") && paymentText.includes("amzn")) {
    score += 0.11;
    reasons.push("Amazon/AMZN erkannt");
  }

  const itemHit = document.items.some((item) => {
    const words = normalizeMatchText(item.title)
      .split(" ")
      .filter((word) => word.length >= 5);
    return words.slice(0, 4).some((word) => paymentText.includes(word));
  });
  if (itemHit) {
    score += 0.06;
    reasons.push("Artikeltext ähnlich");
  }

  const dateDeltaDays = closestDateDeltaDays(payment.date, [document.dueDate, document.documentDate]);
  if (dateDeltaDays !== null) {
    if (dateDeltaDays <= 14) {
      score += 0.15;
      reasons.push("Datum nah");
    } else if (dateDeltaDays <= 45) {
      score += 0.08;
      reasons.push("Datum plausibel");
    }
  }

  return {
    payment,
    score: Math.min(1, Number(score.toFixed(3))),
    reason: reasons.join(", "),
    amountDeltaCents,
    dateDeltaDays,
  };
}

function closestDateDeltaDays(paymentDate: Date, dates: Array<Date | null>) {
  const deltas = dates
    .filter((date): date is Date => Boolean(date))
    .map((date) => Math.abs(daysBetween(paymentDate, date)));
  return deltas.length ? Math.min(...deltas) : null;
}

function daysBetween(left: Date, right: Date) {
  const day = 24 * 60 * 60 * 1000;
  return Math.round((Date.UTC(left.getUTCFullYear(), left.getUTCMonth(), left.getUTCDate()) - Date.UTC(right.getUTCFullYear(), right.getUTCMonth(), right.getUTCDate())) / day);
}

function normalizeMatchText(value: string) {
  return normalizeName(value).replace(/\s+/g, " ");
}

export async function migrateDocumentPaymentsToPurchaseDocuments() {
  const legacyPayments = await prisma.payment.findMany({
    where: {
      bankAccountRef: null,
      status: { not: "IGNORED" },
      OR: [
        { sourceDocument: { is: null } },
        { sourceDocument: { documentType: { not: "KONTOAUSZUG" } } },
      ],
    },
    include: {
      provider: true,
      sourceDocument: true,
      costPosition: true,
    },
    orderBy: { date: "asc" },
  });

  let created = 0;
  let skipped = 0;

  for (const payment of legacyPayments) {
    const externalDocumentNumber = payment.id;
    const duplicate = await prisma.purchaseDocument.findUnique({
      where: {
        source_externalDocumentNumber: {
          source: "LEGACY_DOCUMENT_PAYMENT",
          externalDocumentNumber,
        },
      },
    });

    if (duplicate) {
      skipped += 1;
    } else {
      await prisma.purchaseDocument.create({
        data: {
          source: "LEGACY_DOCUMENT_PAYMENT",
          externalProviderName: payment.provider?.name ?? null,
          externalDocumentNumber,
          title: payment.description ?? payment.costPosition?.title ?? payment.sourceDocument?.fileName ?? "Aus Beleg übernommene Forderung",
          documentDate: payment.sourceDocument?.documentDate ?? null,
          dueDate: payment.date,
          amountCents: payment.amountCents,
          currency: payment.currency,
          status: statusFromLegacyPayment(payment),
          recurrenceCandidate: recurrenceFromLegacyPayment(payment),
          confidenceStatus: payment.status === "BOOKED" ? "MANUALLY_CONFIRMED" : "NEEDS_REVIEW",
          providerId: payment.providerId,
          categoryId: payment.costPosition?.categoryId ?? null,
          householdScopeId: payment.costPosition?.householdScopeId ?? null,
          linkedCostPositionId: payment.costPositionId,
          sourceDocumentId: payment.sourceDocumentId,
          rawJson: JSON.stringify({
            migratedFromPaymentId: payment.id,
            legacyPaymentType: payment.paymentType,
            legacyPaymentStatus: payment.status,
            legacyDescription: payment.description,
          }),
          notes: "Aus früher als Zahlung geführtem Beleg-/Forderungseintrag übernommen.",
          items: {
            create: [
              {
                title: payment.description ?? payment.costPosition?.title ?? payment.sourceDocument?.fileName ?? "Forderung",
                amountCents: payment.amountCents,
                recurrenceCandidate: recurrenceFromLegacyPayment(payment),
              },
            ],
          },
        },
      });
      created += 1;
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "IGNORED" },
    });
  }

  return { scanned: legacyPayments.length, created, skipped, ignoredPayments: legacyPayments.length };
}

function statusFromLegacyPayment(payment: { paymentType: string; status: string }) {
  if (payment.paymentType === "REFUND" || payment.paymentType === "INCOME") {
    return "CREDIT";
  }
  if (payment.status === "PLANNED") {
    return "OPEN_CLAIM";
  }
  if (payment.status === "NEEDS_REVIEW") {
    return "NEEDS_REVIEW";
  }
  return "INVOICE";
}

function recurrenceFromLegacyPayment(payment: {
  description: string | null;
  provider: { name: string } | null;
  costPosition: { title: string; recurrenceType: string } | null;
}) {
  if (payment.costPosition?.recurrenceType && payment.costPosition.recurrenceType !== "UNCLEAR") {
    return payment.costPosition.recurrenceType === "ONE_TIME" ? "ONE_TIME" : "RECURRING";
  }
  return inferRecurrenceCandidate([payment.provider?.name, payment.description, payment.costPosition?.title].filter(Boolean).join(" "));
}

export function parseAmazonOrders(text: string): ParsedPurchase[] {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const chunks = normalized
    .split(/(?:^|\n)Bestellung aufgegeben\n/g)
    .slice(1);

  return chunks
    .map((chunk) => parseAmazonOrderChunk(chunk))
    .filter((order): order is ParsedPurchase => Boolean(order));
}

function parseAmazonOrderChunk(chunk: string): ParsedPurchase | null {
  const lines = chunk
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const orderNumber = chunk.match(/Bestellnr\.\s*([0-9-]+)/)?.[1];
  if (!orderNumber) {
    return null;
  }

  const dateLabel = lines[0] ?? "";
  const amountMatch = chunk.match(/Summe\s*\n\s*([0-9.]+,[0-9]{2})\s*€/);
  const cancelled = /\nStorniert\n|wurde storniert/i.test(chunk);
  const refunded = /Rücksendung abgeschlossen|Erstattet|Gutschrift wurde veranlasst/i.test(chunk);
  const delivered = /Zugestellt:|Abgeholt am|E-Mail-Zustellung/i.test(chunk);
  const deliveryStatus = extractDeliveryStatus(lines);
  const items = extractAmazonItems(lines);

  return {
    source: "AMAZON",
    externalProviderName: amazonProviderName,
    externalDocumentNumber: orderNumber,
    title: items[0] ?? `Amazon-Bestellung ${orderNumber}`,
    documentDate: parseGermanDate(dateLabel),
    amountCents: cancelled ? 0 : eurosToCents(amountMatch?.[1] ?? "0"),
    status: cancelled ? "CANCELLED" : refunded ? "REFUNDED" : delivered ? "DELIVERED" : "ORDERED",
    recurrenceCandidate: /Automatisch geliefert|Spar-Abo/i.test(chunk) ? "RECURRING" : inferRecurrenceCandidate(chunk),
    deliveryStatus,
    items,
    raw: {
      dateLabel,
      orderNumber,
      amountLabel: amountMatch?.[1] ?? null,
      deliveryStatus,
      cancelled,
      refunded,
    },
  };
}

function extractDeliveryStatus(lines: string[]) {
  return lines.find((line) =>
    /^(Zugestellt:|Zustellung:|Abgeholt am|E-Mail-Zustellung|Rücksendung abgeschlossen|Erstattet|Storniert)/i.test(line),
  );
}

function extractAmazonItems(lines: string[]) {
  const skip = new Set([
    "Summe",
    "Versandadresse",
    "Hirth Ludwig",
    "Bestelldetails anzeigen  Rechnung",
    "Nochmals kaufen",
    "Deinen Artikel anzeigen",
    "Lieferung verfolgen",
    "Produktsupport erhalten",
    "Problem bei Bestellung",
    "Artikel zurücksenden oder ersetzen",
    "Artikel zurückgeben",
    "Geschenkbestätigung teilen",
    "Schreib eine Produktrezension",
    "Eine Frage zum Produkt stellen",
    "Verkäufer-Feedback abgeben",
    "Bestellung ansehen oder ändern",
    "Dein Spar-Abo anzeigen",
    "Status der Rücksendung/Erstattung",
    "Wann erhalte ich meine Gutschrift?",
    "Details zur Einwilligung anzeigen",
  ]);
  const result: string[] = [];
  let previous = "";
  let canCollect = false;

  for (const line of lines) {
    if (/^Bestelldetails anzeigen/.test(line) || /^(Zugestellt:|Zustellung:|Abgeholt am|E-Mail-Zustellung)/.test(line)) {
      canCollect = true;
      continue;
    }
    if (!canCollect || skip.has(line) || /^Bestellnr\./.test(line) || /^Artikel zurück/.test(line)) {
      continue;
    }
    if (
      /^(Die Sendung|Das Paket|Paket wurde|Deine Bestellung|Deine Rücksendung|Zeitraum für Rückgabe|Rücksendungsberechtigung|Automatisch geliefert)/.test(
        line,
      )
    ) {
      continue;
    }
    if (/^[0-9.]+,[0-9]{2}\s*€$/.test(line) || /^←Zurück$|^Weiter→$|^\d+$/.test(line)) {
      continue;
    }
    if (line === previous || result.includes(line)) {
      previous = line;
      continue;
    }
    if (line.length >= 8) {
      result.push(line);
    }
    previous = line;
  }

  return result.slice(0, 12);
}

function parseGermanDate(value: string) {
  const match = value.match(/^(\d{1,2})\.\s+([A-Za-zäöüÄÖÜß]+)\s+(\d{4})$/);
  if (!match) {
    return null;
  }
  const months: Record<string, number> = {
    januar: 0,
    februar: 1,
    märz: 2,
    maerz: 2,
    april: 3,
    mai: 4,
    juni: 5,
    juli: 6,
    august: 7,
    september: 8,
    oktober: 9,
    november: 10,
    dezember: 11,
  };
  const month = months[match[2].toLocaleLowerCase("de-DE")];
  if (month === undefined) {
    return null;
  }
  return new Date(Date.UTC(Number(match[3]), month, Number(match[1])));
}

async function ensureProvider(name: string) {
  const normalizedName = normalizeName(name);
  return prisma.provider.upsert({
    where: { normalizedName },
    update: {},
    create: {
      name,
      normalizedName,
      aliasesJson: JSON.stringify(["Amazon", "Amazon EU", "Amazon Payments"]),
    },
  });
}

function inferRecurrenceCandidate(text: string) {
  if (!text.trim()) {
    return "UNCLEAR";
  }
  if (/\b(verwarnung|bußgeld|bussgeld|ordnungsamt|parkvorgang|hotel|schuhe|kommode|wasserbett|elektroarbeiten|malerarbeiten|schlussrechnung|bestellung\s+\d+)\b/i.test(text)) {
    return "ONE_TIME";
  }
  if (/\b(abo|subscription|premium|duolingo|apple services|youtube premium|kinomap|telekom|1\+1|rundfunk|versicherung|beitrag|grundsteuer|hundesteuer|abfallgebühren|abschlag|strom|wasser|abwasser|fernwärme)\b/i.test(text)) {
    return "POTENTIAL_RECURRING";
  }
  return "UNCLEAR";
}
