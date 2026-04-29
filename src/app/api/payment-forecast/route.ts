import { ok, routeError } from "@/server/http";
import { getPaymentForecast, type PaymentForecastMode } from "@/server/services/payment-forecast";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const rawMode = url.searchParams.get("mode");
    const mode: PaymentForecastMode = rawMode === "all-until" ? "all-until" : "next-only";
    const rawUntil = url.searchParams.get("until");
    const forecastUntil = rawUntil ? new Date(`${rawUntil}T00:00:00`) : undefined;

    return ok(await getPaymentForecast({ mode, forecastUntil }));
  } catch (error) {
    return routeError(error);
  }
}
