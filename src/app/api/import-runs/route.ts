import { created, ok, readJson, routeError } from "@/server/http";
import { createImportRun, listImportRuns } from "@/server/services/import-control";

export async function GET() {
  try {
    return ok(await listImportRuns());
  } catch (error) {
    return routeError(error);
  }
}

export async function POST(request: Request) {
  try {
    return created(await createImportRun(await readJson(request)));
  } catch (error) {
    return routeError(error);
  }
}
