import { ok, readJson, routeError } from "@/server/http";
import { previewImportDecision } from "@/server/services/import-control";

export async function POST(request: Request) {
  try {
    return ok(await previewImportDecision(await readJson(request)));
  } catch (error) {
    return routeError(error);
  }
}
