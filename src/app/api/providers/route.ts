import { created, ok, readJson, routeError } from "@/server/http";
import { createProvider, listProviders } from "@/server/services/master-data";

export const runtime = "nodejs";

export async function GET() {
  try {
    return ok(await listProviders());
  } catch (error) {
    return routeError(error);
  }
}

export async function POST(request: Request) {
  try {
    return created(await createProvider(await readJson(request)));
  } catch (error) {
    return routeError(error);
  }
}
