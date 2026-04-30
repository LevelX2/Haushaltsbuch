import { ok, readJson, routeError } from "@/server/http";
import { mergeCostPosition } from "@/server/services/cost-positions";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    return ok(await mergeCostPosition(id, await readJson(request)));
  } catch (error) {
    return routeError(error);
  }
}
