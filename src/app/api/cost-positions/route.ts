import { created, ok, readJson, routeError } from "@/server/http";
import { createCostPosition, listCostPositions } from "@/server/services/cost-positions";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    return ok(await listCostPositions(searchParams));
  } catch (error) {
    return routeError(error);
  }
}

export async function POST(request: Request) {
  try {
    return created(await createCostPosition(await readJson(request)));
  } catch (error) {
    return routeError(error);
  }
}
