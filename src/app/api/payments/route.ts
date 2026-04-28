import { created, ok, readJson, routeError } from "@/server/http";
import { createPayment, listPayments } from "@/server/services/payments";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    return ok(await listPayments(searchParams));
  } catch (error) {
    return routeError(error);
  }
}

export async function POST(request: Request) {
  try {
    return created(await createPayment(await readJson(request)));
  } catch (error) {
    return routeError(error);
  }
}
