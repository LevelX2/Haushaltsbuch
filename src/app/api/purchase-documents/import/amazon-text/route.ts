import { created, readJson, routeError } from "@/server/http";
import { importAmazonOrderText } from "@/server/services/purchase-documents";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    return created(await importAmazonOrderText(await readJson(request)));
  } catch (error) {
    return routeError(error);
  }
}
