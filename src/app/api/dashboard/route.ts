import { ok, routeError } from "@/server/http";
import { getDashboard } from "@/server/services/dashboard";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    return ok(await getDashboard(searchParams));
  } catch (error) {
    return routeError(error);
  }
}
