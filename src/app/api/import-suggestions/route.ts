import { created, ok, readJson, routeError } from "@/server/http";
import { createImportSuggestion, listImportSuggestions } from "@/server/services/import-suggestions";

export const runtime = "nodejs";

export async function GET() {
  try {
    return ok(await listImportSuggestions());
  } catch (error) {
    return routeError(error);
  }
}

export async function POST(request: Request) {
  try {
    return created(await createImportSuggestion(await readJson(request)));
  } catch (error) {
    return routeError(error);
  }
}
