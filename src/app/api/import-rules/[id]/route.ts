import { ok, readJson, routeError } from "@/server/http";
import { updateImportRule } from "@/server/services/import-control";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    return ok(await updateImportRule(id, await readJson(request)));
  } catch (error) {
    return routeError(error);
  }
}
