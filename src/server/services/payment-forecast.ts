import type { CostPosition, Payment, Prisma, RecurrenceType } from "@prisma/client";
import { prisma } from "@/server/prisma";

type ForecastSource = CostPosition & {
  provider: { name: string } | null;
  category: { name: string } | null;
  payments: Payment[];
};

export type PaymentForecastRow = {
  id: string;
  costPositionId: string;
  title: string;
  providerName: string | null;
  categoryName: string | null;
  expectedDate: string | null;
  amountCents: number;
  currency: string;
  recurrenceType: RecurrenceType;
  paymentMethod: string;
  confidenceStatus: string;
  basis: string;
  note: string | null;
};

export type PaymentForecastMode = "next-only" | "all-until";

export type PaymentForecast = {
  rows: PaymentForecastRow[];
  mode: PaymentForecastMode;
  forecastUntil: string;
  totals: {
    predictableCount: number;
    unclearCount: number;
    totalCents: number;
    next30DaysCents: number;
    next90DaysCents: number;
  };
};

export type PaymentForecastOptions = {
  mode?: PaymentForecastMode;
  forecastUntil?: Date;
};

const defaultForecastDays = 90;
const maxForecastMonths = 24;

export async function getPaymentForecast(options: PaymentForecastOptions = {}): Promise<PaymentForecast> {
  const items = await prisma.costPosition.findMany({
    where: {
      status: "ACTIVE",
      recurrenceClass: "RECURRING",
      confidenceStatus: { notIn: ["IGNORED", "OBSOLETE", "REPLACED"] },
    },
    include: {
      provider: true,
      category: true,
      payments: {
        where: { status: { in: ["BOOKED", "RECONCILED"] } },
        orderBy: { date: "desc" },
        take: 1,
      },
    },
    orderBy: [{ nextDueDate: "asc" }, { title: "asc" }],
  });

  const today = startOfDay(new Date());
  const mode = options.mode ?? "next-only";
  const forecastUntil = clampForecastUntil(options.forecastUntil, today);
  const rows = items.flatMap((item) => toForecastRows(item, today, forecastUntil, mode));
  const predictableRows = rows.filter((row) => row.expectedDate);
  const in30Days = addDays(today, 30);
  const in90Days = addDays(today, 90);

  return {
    rows: rows.sort(compareForecastRows),
    mode,
    forecastUntil: forecastUntil.toISOString(),
    totals: {
      predictableCount: new Set(predictableRows.map((row) => row.costPositionId)).size,
      unclearCount: rows.length - predictableRows.length,
      totalCents: predictableRows.reduce((sum, row) => sum + row.amountCents, 0),
      next30DaysCents: sumUntil(predictableRows, in30Days),
      next90DaysCents: sumUntil(predictableRows, in90Days),
    },
  };
}

function toForecastRows(
  item: ForecastSource,
  today: Date,
  forecastUntil: Date,
  mode: PaymentForecastMode,
): PaymentForecastRow[] {
  const interval = intervalFor(item.recurrenceType, item.recurrenceCustomRule);
  const latestPayment = item.payments[0] ?? null;
  const base = item.nextDueDate ?? latestPayment?.date ?? item.startDate ?? null;
  const basis = item.nextDueDate ? "Fälligkeitsdatum" : latestPayment ? "letzte Zahlung" : item.startDate ? "Startdatum" : "keine Datumsbasis";

  if (!base || !interval) {
    return [toForecastRow(item, null, latestPayment, basis, missingForecastNote(item, interval, base))];
  }

  const expectedDate = nextExpectedDate(base, interval, today);

  if (mode === "next-only") {
    return [toForecastRow(item, expectedDate, latestPayment, basis, null)];
  }

  const rows: PaymentForecastRow[] = [];
  let next = expectedDate;
  let guard = 0;

  while (next <= forecastUntil && guard < 800) {
    rows.push(toForecastRow(item, next, latestPayment, basis, null));
    next = addInterval(next, interval);
    guard += 1;
  }

  return rows.length ? rows : [toForecastRow(item, expectedDate, latestPayment, basis, null)];
}

function toForecastRow(
  item: ForecastSource,
  expectedDate: Date | null,
  latestPayment: Payment | null,
  basis: string,
  note: string | null,
): PaymentForecastRow {
  return {
    id: expectedDate ? `${item.id}:${toDateKey(expectedDate)}` : item.id,
    costPositionId: item.id,
    title: item.title,
    providerName: item.provider?.name ?? null,
    categoryName: item.category?.name ?? null,
    expectedDate: expectedDate?.toISOString() ?? null,
    amountCents: item.amountCents,
    currency: item.currency,
    recurrenceType: item.recurrenceType,
    paymentMethod: classifyPaymentMethod(item.paymentMethod, latestPayment),
    confidenceStatus: item.confidenceStatus,
    basis,
    note,
  };
}

type ForecastInterval =
  | { kind: "months"; value: number }
  | { kind: "days"; value: number };

function intervalFor(recurrenceType: RecurrenceType, rawRule?: string | null): ForecastInterval | null {
  switch (recurrenceType) {
    case "MONTHLY":
      return { kind: "months", value: 1 };
    case "EVERY_TWO_MONTHS":
      return { kind: "months", value: 2 };
    case "QUARTERLY":
      return { kind: "months", value: 3 };
    case "SEMI_YEARLY":
      return { kind: "months", value: 6 };
    case "YEARLY":
      return { kind: "months", value: 12 };
    case "WEEKLY":
      return { kind: "days", value: 7 };
    case "EVERY_FOUR_WEEKS":
      return { kind: "days", value: 28 };
    case "CUSTOM":
      return customInterval(rawRule);
    case "IRREGULAR":
    case "ONE_TIME":
    case "UNCLEAR":
      return null;
  }
}

function customInterval(rawRule?: string | null): ForecastInterval | null {
  if (!rawRule) {
    return null;
  }

  try {
    const rule = JSON.parse(rawRule) as { everyMonths?: number; everyWeeks?: number };
    if (rule.everyMonths && rule.everyMonths > 0) {
      return { kind: "months", value: rule.everyMonths };
    }
    if (rule.everyWeeks && rule.everyWeeks > 0) {
      return { kind: "days", value: rule.everyWeeks * 7 };
    }
  } catch {
    return null;
  }

  return null;
}

function nextExpectedDate(base: Date, interval: ForecastInterval, today: Date) {
  let next = startOfDay(base);
  let guard = 0;

  while (next < today && guard < 600) {
    next = addInterval(next, interval);
    guard += 1;
  }

  return next;
}

function addInterval(date: Date, interval: ForecastInterval) {
  if (interval.kind === "days") {
    return addDays(date, interval.value);
  }

  const next = new Date(date);
  next.setMonth(next.getMonth() + interval.value);
  return startOfDay(next);
}

function classifyPaymentMethod(rawMethod?: string | null, latestPayment?: Payment | null) {
  const value = [rawMethod, latestPayment?.description, latestPayment?.bankAccountRef].filter(Boolean).join(" ").toLocaleLowerCase("de-DE");

  if (!value.trim()) {
    return "unklar";
  }
  if (value.includes("paypal")) {
    return "PayPal";
  }
  if (value.includes("lastschrift") || value.includes("sepa") || value.includes("einzug") || value.includes("abbuchung")) {
    return "Lastschrift";
  }
  if (value.includes("überweisung") || value.includes("ueberweisung") || value.includes("banküberweisung") || value.includes("bank transfer")) {
    return "Überweisung";
  }
  if (value.includes("karte") || value.includes("visa") || value.includes("mastercard")) {
    return "Karte";
  }

  return rawMethod?.trim() || "unklar";
}

function missingForecastNote(item: ForecastSource, interval: ForecastInterval | null, base: Date | null) {
  if (!interval) {
    return "Rhythmus ist nicht berechenbar.";
  }
  if (!base) {
    return "Kein Fälligkeits-, Zahlungs- oder Startdatum vorhanden.";
  }
  return "Keine Prognose möglich.";
}

function compareForecastRows(left: PaymentForecastRow, right: PaymentForecastRow) {
  if (!left.expectedDate && !right.expectedDate) {
    return left.title.localeCompare(right.title, "de-DE");
  }
  if (!left.expectedDate) {
    return 1;
  }
  if (!right.expectedDate) {
    return -1;
  }
  const dateDiff = new Date(left.expectedDate).getTime() - new Date(right.expectedDate).getTime();
  return dateDiff || left.title.localeCompare(right.title, "de-DE");
}

function sumUntil(rows: PaymentForecastRow[], maxDate: Date) {
  return rows.reduce((sum, row) => {
    if (!row.expectedDate) {
      return sum;
    }
    return new Date(row.expectedDate) <= maxDate ? sum + row.amountCents : sum;
  }, 0);
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return startOfDay(next);
}

function clampForecastUntil(rawDate: Date | undefined, today: Date) {
  const defaultDate = addDays(today, defaultForecastDays);
  const maxDate = addMonths(today, maxForecastMonths);
  const requested = rawDate && !Number.isNaN(rawDate.getTime()) ? startOfDay(rawDate) : defaultDate;

  if (requested < today) {
    return today;
  }
  if (requested > maxDate) {
    return maxDate;
  }
  return requested;
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return startOfDay(next);
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}
