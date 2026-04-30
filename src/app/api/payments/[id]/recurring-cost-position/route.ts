import { created, readJson, routeError } from "@/server/http";
import { createRecurringCostPositionFromPayment } from "@/server/services/payments";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    return created(await createRecurringCostPositionFromPayment(id, await readJson(request)));
  } catch (error) {
    return routeError(error);
  }
}
