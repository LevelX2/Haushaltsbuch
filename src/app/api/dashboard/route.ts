import { ok, routeError } from "@/server/http";
import { getDashboard } from "@/server/services/dashboard";

export const runtime = "nodejs";

export async function GET() {
  try {
    return ok(await getDashboard());
  } catch (error) {
    return routeError(error);
  }
}
