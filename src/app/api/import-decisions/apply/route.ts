import { created, readJson, routeError } from "@/server/http";
import { applyImportDecision } from "@/server/services/import-control";

export async function POST(request: Request) {
  try {
    return created(await applyImportDecision(await readJson(request)));
  } catch (error) {
    return routeError(error);
  }
}
