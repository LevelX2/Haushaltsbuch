import { addMonths, startOfYear } from "date-fns";
import type { ConfidenceStatus } from "@prisma/client";
import { prisma } from "@/server/prisma";
import { getPaymentForecast } from "@/server/services/payment-forecast";

const effectiveConfidence: ConfidenceStatus[] = ["SAFE", "ESTIMATED", "MANUALLY_CONFIRMED"];

export async function getDashboard() {
  const today = new Date();
  const inSixMonths = addMonths(today, 6);
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

  const byCategory = new Map<string, { monthlyValueCents: number; yearlyValueCents: number }>();
  for (const item of activeFixedCosts) {
    const category = item.category?.name ?? "Unklar";
    const current = byCategory.get(category) ?? { monthlyValueCents: 0, yearlyValueCents: 0 };
    current.monthlyValueCents += item.monthlyValueCents;
    current.yearlyValueCents += item.yearlyValueCents;
    byCategory.set(category, current);
  }

  return {
    totals: {
      monthlyFixedCents: activeFixedCosts.reduce((sum, item) => sum + item.monthlyValueCents, 0),
      yearlyFixedCents: activeFixedCosts.reduce((sum, item) => sum + item.yearlyValueCents, 0),
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
    lastReport,
    lastBackup,
  };
}
