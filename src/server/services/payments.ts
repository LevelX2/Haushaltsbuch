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
    .enum(["NORMAL", "PREPAYMENT", "INSTALLMENT", "REFUND", "CORRECTION", "REVERSAL", "INCOME", "UNKNOWN"])
    .default("NORMAL"),
  description: emptyToNull,
  bankAccountRef: emptyToNull,
  sourceDocumentId: emptyToNull,
  status: z.enum(["PLANNED", "BOOKED", "RECONCILED", "NEEDS_REVIEW", "IGNORED"]).default("BOOKED"),
});

export async function listPayments(searchParams: URLSearchParams) {
  const year = searchParams.get("year");
  const where = year
    ? {
        date: {
          gte: new Date(`${year}-01-01T00:00:00`),
          lt: new Date(`${Number(year) + 1}-01-01T00:00:00`),
        },
      }
    : {};

  return prisma.payment.findMany({
    where,
    include: { provider: true, costPosition: true, sourceDocument: true },
    orderBy: { date: "desc" },
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
