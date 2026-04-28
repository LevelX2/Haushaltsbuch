import { ok, readJson, routeError } from "@/server/http";
import { getSettings, updateSettings } from "@/server/services/settings";

export const runtime = "nodejs";

export async function GET() {
  try {
    return ok(await getSettings());
  } catch (error) {
    return routeError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    return ok(await updateSettings(await readJson(request)));
  } catch (error) {
    return routeError(error);
  }
}
