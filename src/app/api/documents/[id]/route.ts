import { ok, readJson, routeError } from "@/server/http";
import { updateDocument } from "@/server/services/documents";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    return ok(await updateDocument(id, await readJson(request)));
  } catch (error) {
    return routeError(error);
  }
}
