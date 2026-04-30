import { z } from "zod";
import { eurosToCents } from "@/lib/money";
import { prisma } from "@/server/prisma";

const emptyToNull = z.preprocess((value) => (value === "" ? null : value), z.string().nullable().optional());
const dateValue = z.string().min(1).transform((value) => new Date(`${value}T00:00:00`));

const paymentInput = z.object({
  costPositionId: emptyToNull,
  providerId: emptyToNull,
  date: dateValue,
  amount: z.union([z.string(), z.number()]).transform(eurosToCents),
  currency: z.string().default("EUR"),
  paymentType: z
    .enum([
      "NORMAL",
      "PREPAYMENT",
      "INSTALLMENT",
      "REFUND",
      "CORRECTION",
      "REVERSAL",
      "INCOME",
      "CASH_WITHDRAWAL",
      "TRANSFER",
      "UNKNOWN",
    ])
    .default("NORMAL"),
  description: emptyToNull,
  bankAccountRef: emptyToNull,
  sourceDocumentId: emptyToNull,
  status: z.enum(["PLANNED", "BOOKED", "RECONCILED", "NEEDS_REVIEW", "IGNORED"]).default("BOOKED"),
});

const recurringCostInput = z.object({
  title: z.string().trim().min(1).optional(),
  categoryId: emptyToNull,
  recurrenceType: z
    .enum([
      "MONTHLY",
      "EVERY_TWO_MONTHS",
      "QUARTERLY",
      "SEMI_YEARLY",
      "YEARLY",
      "WEEKLY",
      "EVERY_FOUR_WEEKS",
      "IRREGULAR",
      "CUSTOM",
      "UNCLEAR",
    ])
    .default("MONTHLY"),
});

export async function listPayments(searchParams: URLSearchParams) {
  const year = searchParams.get("year");
  const includeIgnored = searchParams.get("includeIgnored") === "true";
  const where = {
    ...(year
      ? {
          date: {
            gte: new Date(`${year}-01-01T00:00:00`),
            lt: new Date(`${Number(year) + 1}-01-01T00:00:00`),
          },
        }
      : {}),
    ...(includeIgnored ? {} : { status: { not: "IGNORED" as const } }),
  };

  return prisma.payment.findMany({
    where,
    include: {
      provider: true,
      costPosition: true,
      sourceDocument: true,
      paymentMatches: {
        include: { purchaseDocument: true },
        orderBy: { score: "desc" },
      },
    },
    orderBy: { date: "desc" },
  });
}

export async function createRecurringCostPositionFromPayment(id: string, raw: unknown) {
  const input = recurringCostInput.parse(raw);
  const payment = await prisma.payment.findUniqueOrThrow({
    where: { id },
    include: { provider: true },
  });
  const title = input.title ?? payment.provider?.name ?? payment.description?.split("|")[0]?.trim() ?? "Wiederkehrende Zahlung";
  const values = calculatePaymentValues(Math.abs(payment.amountCents), input.recurrenceType);
  const nextDueDate = addMonths(payment.date, input.recurrenceType === "YEARLY" ? 12 : 1);
  const paymentMethod = inferPaymentMethod(payment.description);

  return prisma.$transaction(async (tx) => {
    const costPosition = await tx.costPosition.create({
      data: {
        title,
        providerId: payment.providerId,
        categoryId: input.categoryId,
        amountCents: Math.abs(payment.amountCents),
        currency: payment.currency,
        recurrenceType: input.recurrenceType,
        recurrenceClass: "RECURRING",
        limitationType: "UNLIMITED",
        startDate: payment.date,
        nextDueDate,
        paymentMethod,
        status: "ACTIVE",
        confidenceStatus: "MANUALLY_CONFIRMED",
        monthlyValueCents: values.monthlyValueCents,
        yearlyValueCents: values.yearlyValueCents,
        sourceType: "MANUAL",
        notes: "Aus wiederkehrender Zahlung ohne Rechnungsbeleg angelegt.",
      },
    });

    await tx.costPositionVersion.create({
      data: {
        costPositionId: costPosition.id,
        validFrom: payment.date,
        amountCents: costPosition.amountCents,
        recurrenceType: costPosition.recurrenceType,
        recurrenceClass: costPosition.recurrenceClass,
        limitationType: costPosition.limitationType,
        monthlyValueCents: costPosition.monthlyValueCents,
        yearlyValueCents: costPosition.yearlyValueCents,
        notes: "Initial aus Zahlung ohne Rechnungsbeleg übernommen.",
        sourceType: "MANUAL",
      },
    });

    const linked = await tx.payment.updateMany({
      where: {
        providerId: payment.providerId,
        amountCents: payment.amountCents,
        description: payment.description,
        status: { not: "IGNORED" },
        costPositionId: null,
      },
      data: { costPositionId: costPosition.id },
    });

    return { costPosition, linkedPayments: linked.count };
  });
}

export async function createPayment(raw: unknown) {
  const input = paymentInput.parse(raw);
  return prisma.payment.create({
    data: {
      costPositionId: input.costPositionId,
      providerId: input.providerId,
      date: input.date,
      amountCents: input.amount,
      currency: input.currency,
      paymentType: input.paymentType,
      description: input.description,
      bankAccountRef: input.bankAccountRef,
      sourceDocumentId: input.sourceDocumentId,
      status: input.status,
    },
  });
}

export async function updatePayment(id: string, raw: unknown) {
  const input = paymentInput.partial().parse(raw);
  return prisma.payment.update({
    where: { id },
    data: {
      ...("costPositionId" in input ? { costPositionId: input.costPositionId } : {}),
      ...("providerId" in input ? { providerId: input.providerId } : {}),
      ...("date" in input ? { date: input.date } : {}),
      ...("amount" in input ? { amountCents: input.amount } : {}),
      ...("currency" in input ? { currency: input.currency } : {}),
      ...("paymentType" in input ? { paymentType: input.paymentType } : {}),
      ...("description" in input ? { description: input.description } : {}),
      ...("bankAccountRef" in input ? { bankAccountRef: input.bankAccountRef } : {}),
      ...("sourceDocumentId" in input ? { sourceDocumentId: input.sourceDocumentId } : {}),
      ...("status" in input ? { status: input.status } : {}),
    },
  });
}

function calculatePaymentValues(amountCents: number, recurrenceType: string) {
  switch (recurrenceType) {
    case "MONTHLY":
      return { monthlyValueCents: amountCents, yearlyValueCents: amountCents * 12 };
    case "QUARTERLY":
      return { monthlyValueCents: Math.round((amountCents * 4) / 12), yearlyValueCents: amountCents * 4 };
    case "YEARLY":
      return { monthlyValueCents: Math.round(amountCents / 12), yearlyValueCents: amountCents };
    case "SEMI_YEARLY":
      return { monthlyValueCents: Math.round((amountCents * 2) / 12), yearlyValueCents: amountCents * 2 };
    case "EVERY_TWO_MONTHS":
      return { monthlyValueCents: Math.round((amountCents * 6) / 12), yearlyValueCents: amountCents * 6 };
    case "WEEKLY":
      return { monthlyValueCents: Math.round((amountCents * 52) / 12), yearlyValueCents: amountCents * 52 };
    case "EVERY_FOUR_WEEKS":
      return { monthlyValueCents: Math.round((amountCents * 13) / 12), yearlyValueCents: amountCents * 13 };
    default:
      return { monthlyValueCents: 0, yearlyValueCents: 0 };
  }
}

function inferPaymentMethod(description: string | null) {
  if (/dauerauftrag/i.test(description ?? "")) {
    return "Dauerauftrag";
  }
  if (/lastschrift/i.test(description ?? "")) {
    return "Lastschrift";
  }
  if (/paypal/i.test(description ?? "")) {
    return "PayPal";
  }
  return null;
}

function addMonths(date: Date, months: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, date.getUTCDate()));
}
