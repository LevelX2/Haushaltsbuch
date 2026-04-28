import { ok, routeError } from "@/server/http";
import { listHouseholdScopes } from "@/server/services/master-data";

export const runtime = "nodejs";

export async function GET() {
  try {
    return ok(await listHouseholdScopes());
  } catch (error) {
    return routeError(error);
  }
}
