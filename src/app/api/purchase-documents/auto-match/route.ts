import { ok, routeError } from "@/server/http";
import { autoMatchPurchaseDocuments } from "@/server/services/purchase-documents";

export const runtime = "nodejs";

export async function POST() {
  try {
    return ok(await autoMatchPurchaseDocuments());
  } catch (error) {
    return routeError(error);
  }
}
