import { created, ok, readJson, routeError } from "@/server/http";
import { createImportRule, listImportRules } from "@/server/services/import-control";

export async function GET() {
  try {
    return ok(await listImportRules());
  } catch (error) {
    return routeError(error);
  }
}

export async function POST(request: Request) {
  try {
    return created(await createImportRule(await readJson(request)));
  } catch (error) {
    return routeError(error);
  }
}
