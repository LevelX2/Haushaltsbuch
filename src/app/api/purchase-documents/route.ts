import { ok, routeError } from "@/server/http";
import { listPurchaseDocuments } from "@/server/services/purchase-documents";

export const runtime = "nodejs";

export async function GET() {
  try {
    return ok(await listPurchaseDocuments());
  } catch (error) {
    return routeError(error);
  }
}
