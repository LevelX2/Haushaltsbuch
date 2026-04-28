import { ok, readJson, routeError } from "@/server/http";
import { updateImportSuggestion } from "@/server/services/import-suggestions";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    return ok(await updateImportSuggestion(id, await readJson(request)));
  } catch (error) {
    return routeError(error);
  }
}
