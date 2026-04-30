import { addMonths, startOfMonth, startOfYear, subMonths } from "date-fns";
import type { ConfidenceStatus } from "@prisma/client";
import { prisma } from "@/server/prisma";
import { getPaymentForecast } from "@/server/services/payment-forecast";

const effectiveConfidence: ConfidenceStatus[] = ["SAFE", "ESTIMATED", "MANUALLY_CONFIRMED"];

export async function getDashboard() {
  const today = new Date();
  const inSixMonths = addMonths(today, 6);
  const recentExpenseStart = startOfMonth(subMonths(today, 11));
  const recentExpenseEnd = addMonths(startOfMonth(today), 1);
  const paymentForecast = await getPaymentForecast({ mode: "all-until", forecastUntil: inSixMonths });
  const activeFixedCosts = await prisma.costPosition.findMany({
    where: {
      status: "ACTIVE",
      recurrenceClass: "RECURRING",
      confidenceStatus: { in: effectiveConfidence },
    },
    include: { provider: true, category: true, householdScope: true },
    orderBy: { monthlyValueCents: "desc" },
  });

  const oneTimeCosts = await prisma.costPosition.findMany({
    where: {
      status: "ACTIVE",
      recurrenceClass: "ONE_TIME",
      createdAt: { gte: startOfYear(today) },
    },
    include: { provider: true, category: true },
    orderBy: { amountCents: "desc" },
  });

  const openSuggestions = await prisma.importSuggestion.count({ where: { status: "OPEN" } });
  const unclearPositions = await prisma.costPosition.count({
    where: {
      OR: [{ recurrenceClass: "UNCLEAR" }, { confidenceStatus: "NEEDS_REVIEW" }],
      status: { not: "ENDED" },
    },
  });
  const activeCount = await prisma.costPosition.count({ where: { status: "ACTIVE" } });
  const limitedCount = await prisma.costPosition.count({
    where: { status: "ACTIVE", limitationType: { in: ["UNTIL_DATE", "NUMBER_OF_PAYMENTS"] } },
  });
  const lastReport = await prisma.reportRun.findFirst({ orderBy: { generatedAt: "desc" } });
  const lastBackup = await prisma.backupRun.findFirst({ orderBy: { generatedAt: "desc" } });
  const recentExpensePayments = await prisma.payment.findMany({
    where: {
      date: { gte: recentExpenseStart, lt: recentExpenseEnd },
      status: { in: ["BOOKED", "RECONCILED"] },
      paymentType: { in: ["NORMAL", "PREPAYMENT", "INSTALLMENT", "UNKNOWN"] },
    },
    orderBy: { date: "asc" },
  });

  const byCategory = new Map<string, { monthlyValueCents: number; yearlyValueCents: number; positionCount: number }>();
  for (const item of activeFixedCosts) {
    const category = item.category?.name ?? "Unklar";
    const current = byCategory.get(category) ?? { monthlyValueCents: 0, yearlyValueCents: 0, positionCount: 0 };
    current.monthlyValueCents += item.monthlyValueCents;
    current.yearlyValueCents += item.yearlyValueCents;
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
      monthlyFixedCents: activeFixedCosts.reduce((sum, item) => sum + item.monthlyValueCents, 0),
      yearlyFixedCents: activeFixedCosts.reduce((sum, item) => sum + item.yearlyValueCents, 0),
      fixedCostCount: activeFixedCosts.length,
      activeCount,
      limitedCount,
      oneTimeCurrentYearCount: oneTimeCosts.length,
      openSuggestions,
      unclearPositions,
      oneTimeCurrentYearCents: oneTimeCosts.reduce((sum, item) => sum + item.amountCents, 0),
    },
    topCosts: activeFixedCosts.slice(0, 10),
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
