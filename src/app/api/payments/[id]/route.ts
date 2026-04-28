import { ok, readJson, routeError } from "@/server/http";
import { updatePayment } from "@/server/services/payments";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    return ok(await updatePayment(id, await readJson(request)));
  } catch (error) {
    return routeError(error);
  }
}
