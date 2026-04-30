import { created, readJson, routeError } from "@/server/http";
import { importCamtDirectory } from "@/server/services/bank-imports";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    return created(await importCamtDirectory(await readJson(request)));
  } catch (error) {
    return routeError(error);
  }
}
