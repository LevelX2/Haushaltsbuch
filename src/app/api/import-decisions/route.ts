import { ok, routeError } from "@/server/http";
import { listImportDecisions } from "@/server/services/import-control";

export async function GET(request: Request) {
  try {
    return ok(await listImportDecisions(new URL(request.url).searchParams));
  } catch (error) {
    return routeError(error);
  }
}
