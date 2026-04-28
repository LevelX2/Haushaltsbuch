import { created, ok, readJson, routeError } from "@/server/http";
import { createCategory, listCategories } from "@/server/services/master-data";

export const runtime = "nodejs";

export async function GET() {
  try {
    return ok(await listCategories());
  } catch (error) {
    return routeError(error);
  }
}

export async function POST(request: Request) {
  try {
    return created(await createCategory(await readJson(request)));
  } catch (error) {
    return routeError(error);
  }
}
