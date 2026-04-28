import { ok, readJson, routeError } from "@/server/http";
import { getCostPosition, updateCostPosition } from "@/server/services/cost-positions";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    return ok(await getCostPosition(id));
  } catch (error) {
    return routeError(error);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    return ok(await updateCostPosition(id, await readJson(request)));
  } catch (error) {
    return routeError(error);
  }
}
