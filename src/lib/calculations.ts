import type { RecurrenceClass, RecurrenceType } from "@prisma/client";

type CalculateInput = {
  amountCents: number;
  recurrenceType: RecurrenceType;
  recurrenceClass: RecurrenceClass;
  recurrenceCustomRule?: string | null;
};

type CustomRule = {
  paymentsPerYear?: number;
  everyMonths?: number;
  everyWeeks?: number;
};

export function calculateValues(input: CalculateInput) {
  const amountCents = Number.isFinite(input.amountCents) ? input.amountCents : 0;

  if (input.recurrenceClass === "ONE_TIME" || input.recurrenceType === "ONE_TIME") {
    return {
      monthlyValueCents: 0,
      yearlyValueCents: 0,
    };
  }

  const yearlyValueCents = yearlyValueFromRecurrence(input);
  return {
    yearlyValueCents,
    monthlyValueCents: Math.round(yearlyValueCents / 12),
  };
}

function yearlyValueFromRecurrence(input: CalculateInput): number {
  switch (input.recurrenceType) {
    case "MONTHLY":
      return input.amountCents * 12;
    case "EVERY_TWO_MONTHS":
      return input.amountCents * 6;
    case "QUARTERLY":
      return input.amountCents * 4;
    case "SEMI_YEARLY":
      return input.amountCents * 2;
    case "YEARLY":
      return input.amountCents;
    case "WEEKLY":
      return input.amountCents * 52;
    case "EVERY_FOUR_WEEKS":
      return input.amountCents * 13;
    case "CUSTOM":
      return yearlyValueFromCustomRule(input.amountCents, input.recurrenceCustomRule);
    case "IRREGULAR":
    case "UNCLEAR":
    case "ONE_TIME":
      return 0;
  }
}

function yearlyValueFromCustomRule(amountCents: number, rawRule?: string | null): number {
  if (!rawRule) {
    return 0;
  }

  try {
    const rule = JSON.parse(rawRule) as CustomRule;
    if (rule.paymentsPerYear && rule.paymentsPerYear > 0) {
      return Math.round(amountCents * rule.paymentsPerYear);
    }
    if (rule.everyMonths && rule.everyMonths > 0) {
      return Math.round((amountCents * 12) / rule.everyMonths);
    }
    if (rule.everyWeeks && rule.everyWeeks > 0) {
      return Math.round((amountCents * 52) / rule.everyWeeks);
    }
  } catch {
    return 0;
  }

  return 0;
}
