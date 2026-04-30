import { addMonths, addYears, startOfMonth, startOfYear, subMonths } from "date-fns";
import type { ConfidenceStatus, CostPosition, CostPositionVersion, Payment, PurchaseDocument } from "@prisma/client";
import { prisma } from "@/server/prisma";
import { getPaymentForecast } from "@/server/services/payment-forecast";

const effectiveConfidence: ConfidenceStatus[] = ["SAFE", "ESTIMATED", "MANUALLY_CONFIRMED"];
const ignoredPurchaseStatuses = ["IGNORED", "DUPLICATE", "CANCELLED", "RETURNED", "REFUNDED"];
const expensePaymentTypes = ["NORMAL", "PREPAYMENT", "INSTALLMENT", "UNKNOWN"] as const;
const expensePaymentStatuses = ["BOOKED", "RECONCILED"] as const;

type DashboardPeriod = {
  mode: "year" | "month";
  year: number;
  month: number | null;
  start: Date;
  end: Date;
  label: string;
};

type PurchaseDocumentWithRelations = PurchaseDocument & {
  provider: { name: string } | null;
  category: { name: string } | null;
  linkedCostPosition: {
    id: string;
    title: string;
    currency: string;
    confidenceStatus: ConfidenceStatus;
    provider: { name: string } | null;
    category: { name: string } | null;
  } | null;
};

type PaymentWithCostPosition = Payment & {
  provider: { name: string } | null;
  costPosition: {
    id: string;
    title: string;
    confidenceStatus: ConfidenceStatus;
    category: { name: string } | null;
    purchaseDocuments?: Array<{ id: string }>;
  } | null;
};

type RecurringCostPositionWithVersions = CostPosition & {
  category: { name: string } | null;
  provider: { name: string } | null;
  householdScope: { name: string } | null;
  versions: CostPositionVersion[];
};

type PeriodFixedCostRow = RecurringCostPositionWithVersions & {
  periodValueCents: number;
  periodMonthlyAverageCents: number;
  periodActiveMonths: number;
};

type DashboardGroup = {
  key: string;
  kind: "ONE_TIME" | "RECURRING";
  title: string;
  category: string;
  costPositionId: string | null;
  totalCents: number;
  itemCount: number;
  documentCount: number;
  paymentCount: number;
  currency: string;
  confidenceStatus: ConfidenceStatus | null;
  items: Array<{
    id: string;
    type: "PURCHASE_DOCUMENT" | "PAYMENT";
    title: string;
    date: string;
    amountCents: number;
    currency: string;
    providerName: string | null;
    status: string;
  }>;
};

export async function getDashboard(searchParams = new URLSearchParams()) {
  const today = new Date();
  const period = dashboardPeriod(searchParams, today);
  const includeRecurring = searchParams.get("includeRecurring") === "true";
  const inSixMonths = addMonths(today, 6);
  const recentExpenseStart = startOfMonth(subMonths(today, 11));
  const recentExpenseEnd = addMonths(startOfMonth(today), 1);

  const [
    paymentForecast,
    activeFixedCosts,
    oneTimeCosts,
    openSuggestions,
    unclearPositions,
    activeCount,
    limitedCount,
    lastReport,
    lastBackup,
    recentExpensePayments,
    oneTimePurchaseDocuments,
    oneTimePayments,
    recurringPayments,
    availableYears,
  ] = await Promise.all([
    getPaymentForecast({ mode: "all-until", forecastUntil: inSixMonths }),
    prisma.costPosition.findMany({
      where: {
        status: { in: ["ACTIVE", "ENDED"] },
        recurrenceClass: "RECURRING",
        confidenceStatus: { in: effectiveConfidence },
      },
      include: { provider: true, category: true, householdScope: true, versions: { orderBy: { validFrom: "asc" } } },
      orderBy: { monthlyValueCents: "desc" },
    }) as Promise<RecurringCostPositionWithVersions[]>,
    prisma.costPosition.findMany({
      where: {
        status: "ACTIVE",
        recurrenceClass: "ONE_TIME",
        createdAt: { gte: startOfYear(today) },
      },
      include: { provider: true, category: true },
      orderBy: { amountCents: "desc" },
    }),
    prisma.importSuggestion.count({ where: { status: "OPEN" } }),
    prisma.costPosition.count({
      where: {
        OR: [{ recurrenceClass: "UNCLEAR" }, { confidenceStatus: "NEEDS_REVIEW" }],
        status: { not: "ENDED" },
      },
    }),
    prisma.costPosition.count({ where: { status: "ACTIVE" } }),
    prisma.costPosition.count({
      where: { status: "ACTIVE", limitationType: { in: ["UNTIL_DATE", "NUMBER_OF_PAYMENTS"] } },
    }),
    prisma.reportRun.findFirst({ orderBy: { generatedAt: "desc" } }),
    prisma.backupRun.findFirst({ orderBy: { generatedAt: "desc" } }),
    prisma.payment.findMany({
      where: {
        date: { gte: recentExpenseStart, lt: recentExpenseEnd },
        status: { in: [...expensePaymentStatuses] },
        paymentType: { in: [...expensePaymentTypes] },
      },
      orderBy: { date: "asc" },
    }),
    prisma.purchaseDocument.findMany({
      where: {
        linkedCostPosition: {
          status: "ACTIVE",
          recurrenceClass: "ONE_TIME",
        },
        NOT: { status: { in: ignoredPurchaseStatuses } },
        OR: [
          { documentDate: { gte: period.start, lt: period.end } },
          { dueDate: { gte: period.start, lt: period.end } },
          { createdAt: { gte: period.start, lt: period.end } },
        ],
      },
      include: {
        provider: true,
        category: true,
        linkedCostPosition: { include: { category: true, provider: true } },
      },
      orderBy: [{ documentDate: "asc" }, { createdAt: "asc" }],
    }) as Promise<PurchaseDocumentWithRelations[]>,
    prisma.payment.findMany({
      where: {
        date: { gte: period.start, lt: period.end },
        status: { in: [...expensePaymentStatuses] },
        paymentType: { in: [...expensePaymentTypes] },
        costPosition: { status: "ACTIVE", recurrenceClass: "ONE_TIME" },
      },
      include: { provider: true, costPosition: { include: { category: true, purchaseDocuments: { select: { id: true } } } } },
      orderBy: { date: "asc" },
    }) as Promise<PaymentWithCostPosition[]>,
    prisma.payment.findMany({
      where: {
        date: { gte: period.start, lt: period.end },
        status: { in: [...expensePaymentStatuses] },
        paymentType: { in: [...expensePaymentTypes] },
        costPosition: { status: "ACTIVE", recurrenceClass: "RECURRING" },
      },
      include: { provider: true, costPosition: { include: { category: true } } },
      orderBy: { date: "asc" },
    }) as Promise<PaymentWithCostPosition[]>,
    getAvailableDashboardYears(today),
  ]);

  const oneTimeGroups = buildOneTimeGroups(oneTimePurchaseDocuments, oneTimePayments, period);
  const recurringGroups = includeRecurring ? buildRecurringGroups(recurringPayments) : [];
  const periodFixedCosts = buildPeriodFixedCosts(activeFixedCosts, period);
  const spendingGroups = [...oneTimeGroups, ...recurringGroups].sort((left, right) => {
    const amountDelta = Math.abs(right.totalCents) - Math.abs(left.totalCents);
    return amountDelta === 0 ? left.title.localeCompare(right.title, "de-DE") : amountDelta;
  });
  const oneTimeTotalCents = oneTimeGroups.reduce((sum, group) => sum + group.totalCents, 0);
  const recurringActualCents = recurringGroups.reduce((sum, group) => sum + group.totalCents, 0);

  const byCategory = new Map<
    string,
    { monthlyValueCents: number; yearlyValueCents: number; periodValueCents: number; positionCount: number }
  >();
  for (const item of periodFixedCosts) {
    const category = item.category?.name ?? "Unklar";
    const current = byCategory.get(category) ?? {
      monthlyValueCents: 0,
      yearlyValueCents: 0,
      periodValueCents: 0,
      positionCount: 0,
    };
    current.monthlyValueCents += item.periodMonthlyAverageCents;
    current.yearlyValueCents += item.periodValueCents;
    current.periodValueCents += item.periodValueCents;
    current.positionCount += 1;
    byCategory.set(category, current);
  }

  const recentExpenses = Array.from({ length: 12 }, (_, index) => 11 - index).map((offset) => {
    const date = startOfMonth(subMonths(today, offset));
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    return { key, month: date.toISOString(), totalCents: 0, paymentCount: 0, currency: "EUR" };
  });
  const recentExpensesByKey = new Map(recentExpenses.map((item) => [item.key, item]));

  for (const payment of recentExpensePayments) {
    const key = `${payment.date.getFullYear()}-${String(payment.date.getMonth() + 1).padStart(2, "0")}`;
    const current = recentExpensesByKey.get(key);
    if (!current) {
      continue;
    }

    current.totalCents += payment.amountCents;
    current.paymentCount += 1;
    current.currency = payment.currency;
  }

  return {
    totals: {
      monthlyFixedCents: periodFixedCosts.reduce((sum, item) => sum + item.periodMonthlyAverageCents, 0),
      yearlyFixedCents: periodFixedCosts.reduce((sum, item) => sum + item.periodValueCents, 0),
      fixedCostCount: periodFixedCosts.length,
      activeCount,
      limitedCount,
      oneTimeCurrentYearCount: oneTimeCosts.length,
      openSuggestions,
      unclearPositions,
      oneTimeCurrentYearCents: oneTimeCosts.reduce((sum, item) => sum + item.amountCents, 0),
    },
    period: {
      mode: period.mode,
      year: period.year,
      month: period.month,
      start: period.start.toISOString(),
      end: period.end.toISOString(),
      label: period.label,
      includeRecurring,
      availableYears,
    },
    spending: {
      oneTimeTotalCents,
      recurringActualCents,
      totalCents: oneTimeTotalCents + recurringActualCents,
      oneTimeGroupCount: oneTimeGroups.length,
      recurringGroupCount: recurringGroups.length,
      oneTimeItemCount: oneTimeGroups.reduce((sum, group) => sum + group.itemCount, 0),
      recurringPaymentCount: recurringGroups.reduce((sum, group) => sum + group.paymentCount, 0),
      groups: spendingGroups,
    },
    topCosts: periodFixedCosts
      .slice(0, 10)
      .map((item) => ({
        ...item,
        monthlyValueCents: item.periodMonthlyAverageCents,
        yearlyValueCents: item.periodValueCents,
      })),
    byCategory: Array.from(byCategory.entries())
      .map(([category, values]) => ({ category, ...values }))
      .sort((a, b) => b.monthlyValueCents - a.monthlyValueCents),
    dueItems: paymentForecast.rows.filter((item) => item.expectedDate && new Date(item.expectedDate) <= inSixMonths),
    oneTimeCosts: oneTimeCosts.slice(0, 10),
    recentExpenses,
    lastReport,
    lastBackup,
  };
}

function dashboardPeriod(searchParams: URLSearchParams, today: Date): DashboardPeriod {
  const year = parseInteger(searchParams.get("year")) ?? today.getFullYear();
  const month = parseInteger(searchParams.get("month"));
  const mode = searchParams.get("period") === "month" && month && month >= 1 && month <= 12 ? "month" : "year";

  if (mode === "month") {
    const selectedMonth = month ?? today.getMonth() + 1;
    const start = new Date(year, selectedMonth - 1, 1);
    const end = addMonths(start, 1);
    return {
      mode,
      year,
      month: selectedMonth,
      start,
      end,
      label: new Intl.DateTimeFormat("de-DE", { month: "long", year: "numeric" }).format(start),
    };
  }

  const start = startOfYear(new Date(year, 0, 1));
  const end = addYears(start, 1);
  return { mode, year, month: null, start, end, label: String(year) };
}

function parseInteger(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildPeriodFixedCosts(items: RecurringCostPositionWithVersions[], period: DashboardPeriod): PeriodFixedCostRow[] {
  const months = monthsInPeriod(period);

  return items
    .map((item) => {
      const monthlyValues = months.map((monthStart) => fixedMonthlyValueForMonth(item, monthStart));
      const periodValueCents = monthlyValues.reduce((sum, value) => sum + value, 0);
      const periodActiveMonths = monthlyValues.filter((value) => value !== 0).length;
      return {
        ...item,
        periodValueCents,
        periodMonthlyAverageCents: months.length ? Math.round(periodValueCents / months.length) : 0,
        periodActiveMonths,
      };
    })
    .filter((item) => item.periodValueCents !== 0)
    .sort((left, right) => Math.abs(right.periodValueCents) - Math.abs(left.periodValueCents));
}

function monthsInPeriod(period: DashboardPeriod) {
  const months: Date[] = [];
  let cursor = startOfMonth(period.start);
  while (cursor < period.end) {
    months.push(cursor);
    cursor = addMonths(cursor, 1);
  }
  return months;
}

function fixedMonthlyValueForMonth(item: RecurringCostPositionWithVersions, monthStart: Date) {
  const monthEnd = addMonths(monthStart, 1);
  if (!costPositionOverlapsMonth(item, monthStart, monthEnd)) {
    return 0;
  }

  const version = [...item.versions]
    .reverse()
    .find((candidate) => candidate.validFrom < monthEnd && (!candidate.validTo || candidate.validTo >= monthStart));

  if (version) {
    return version.monthlyValueCents;
  }

  return item.monthlyValueCents;
}

function costPositionOverlapsMonth(item: RecurringCostPositionWithVersions, monthStart: Date, monthEnd: Date) {
  if (item.startDate && item.startDate >= monthEnd) {
    return false;
  }

  if (item.endDate && item.endDate < monthStart) {
    return false;
  }

  return true;
}

function buildOneTimeGroups(
  purchaseDocuments: PurchaseDocumentWithRelations[],
  payments: PaymentWithCostPosition[],
  period: DashboardPeriod,
): DashboardGroup[] {
  const groups = new Map<string, DashboardGroup>();
  const costPositionsWithDocuments = new Set<string>();

  for (const document of purchaseDocuments) {
    const date = document.documentDate ?? document.dueDate ?? document.createdAt;
    if (!dateInPeriod(date, period)) {
      continue;
    }

    const costPosition = document.linkedCostPosition;
    const key = `ONE_TIME:${costPosition?.id ?? document.id}`;
    const group = groups.get(key) ?? {
      key,
      kind: "ONE_TIME" as const,
      title: costPosition?.title ?? "Nicht zugeordnet",
      category: costPosition?.category?.name ?? document.category?.name ?? "Unklar",
      costPositionId: costPosition?.id ?? null,
      totalCents: 0,
      itemCount: 0,
      documentCount: 0,
      paymentCount: 0,
      currency: document.currency,
      confidenceStatus: costPosition?.confidenceStatus ?? document.confidenceStatus,
      items: [],
    };

    group.totalCents += document.amountCents;
    group.itemCount += 1;
    group.documentCount += 1;
    group.items.push({
      id: document.id,
      type: "PURCHASE_DOCUMENT",
      title: document.title,
      date: date.toISOString(),
      amountCents: document.amountCents,
      currency: document.currency,
      providerName: document.provider?.name ?? document.externalProviderName ?? costPosition?.provider?.name ?? null,
      status: document.status,
    });
    groups.set(key, group);
    if (costPosition?.id) {
      costPositionsWithDocuments.add(costPosition.id);
    }
  }

  for (const payment of payments) {
    const costPosition = payment.costPosition;
    if (!costPosition || costPositionsWithDocuments.has(costPosition.id)) {
      continue;
    }

    const key = `ONE_TIME:${costPosition.id}`;
    const group = groups.get(key) ?? {
      key,
      kind: "ONE_TIME" as const,
      title: costPosition.title,
      category: costPosition.category?.name ?? "Unklar",
      costPositionId: costPosition.id,
      totalCents: 0,
      itemCount: 0,
      documentCount: 0,
      paymentCount: 0,
      currency: payment.currency,
      confidenceStatus: costPosition.confidenceStatus,
      items: [],
    };

    group.totalCents += payment.amountCents;
    group.itemCount += 1;
    group.paymentCount += 1;
    group.items.push({
      id: payment.id,
      type: "PAYMENT",
      title: payment.description ?? costPosition.title,
      date: payment.date.toISOString(),
      amountCents: payment.amountCents,
      currency: payment.currency,
      providerName: payment.provider?.name ?? null,
      status: payment.status,
    });
    groups.set(key, group);
  }

  return sortedDashboardGroups(groups);
}

function buildRecurringGroups(payments: PaymentWithCostPosition[]): DashboardGroup[] {
  const groups = new Map<string, DashboardGroup>();

  for (const payment of payments) {
    const costPosition = payment.costPosition;
    if (!costPosition) {
      continue;
    }

    const key = `RECURRING:${costPosition.id}`;
    const group = groups.get(key) ?? {
      key,
      kind: "RECURRING" as const,
      title: costPosition.title,
      category: costPosition.category?.name ?? "Unklar",
      costPositionId: costPosition.id,
      totalCents: 0,
      itemCount: 0,
      documentCount: 0,
      paymentCount: 0,
      currency: payment.currency,
      confidenceStatus: costPosition.confidenceStatus,
      items: [],
    };

    group.totalCents += payment.amountCents;
    group.itemCount += 1;
    group.paymentCount += 1;
    group.items.push({
      id: payment.id,
      type: "PAYMENT",
      title: payment.description ?? costPosition.title,
      date: payment.date.toISOString(),
      amountCents: payment.amountCents,
      currency: payment.currency,
      providerName: payment.provider?.name ?? null,
      status: payment.status,
    });
    groups.set(key, group);
  }

  return sortedDashboardGroups(groups);
}

function sortedDashboardGroups(groups: Map<string, DashboardGroup>) {
  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      items: group.items.sort((left, right) => left.date.localeCompare(right.date)),
    }))
    .sort((left, right) => {
      const amountDelta = Math.abs(right.totalCents) - Math.abs(left.totalCents);
      return amountDelta === 0 ? left.title.localeCompare(right.title, "de-DE") : amountDelta;
    });
}

function dateInPeriod(date: Date, period: DashboardPeriod) {
  return date >= period.start && date < period.end;
}

async function getAvailableDashboardYears(today: Date) {
  const [purchaseDocuments, payments] = await Promise.all([
    prisma.purchaseDocument.findMany({
      select: { documentDate: true, dueDate: true, createdAt: true },
      where: { NOT: { status: { in: ignoredPurchaseStatuses } } },
    }),
    prisma.payment.findMany({
      select: { date: true },
      where: {
        status: { in: [...expensePaymentStatuses] },
        paymentType: { in: [...expensePaymentTypes] },
      },
    }),
  ]);

  const years = new Set<number>([today.getFullYear()]);
  for (const document of purchaseDocuments) {
    years.add((document.documentDate ?? document.dueDate ?? document.createdAt).getFullYear());
  }
  for (const payment of payments) {
    years.add(payment.date.getFullYear());
  }

  return Array.from(years).sort((left, right) => right - left);
}
