export function eurosToCents(value: unknown): number {
  if (typeof value === "number") {
    return Math.round(value * 100);
  }

  if (typeof value !== "string") {
    return 0;
  }

  const normalized = value.trim().replace(/\./g, "").replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}

export function centsToEuros(cents: number | null | undefined): number {
  return Math.round((cents ?? 0)) / 100;
}

export function formatMoney(cents: number | null | undefined, currency = "EUR"): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency,
  }).format(centsToEuros(cents));
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("de-DE", {
    maximumFractionDigits: 2,
  }).format(value);
}
