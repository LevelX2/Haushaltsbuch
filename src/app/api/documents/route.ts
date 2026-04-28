import { created, ok, readJson, routeError } from "@/server/http";
import { createDocument, listDocuments } from "@/server/services/documents";

export const runtime = "nodejs";

export async function GET() {
  try {
    return ok(await listDocuments());
  } catch (error) {
    return routeError(error);
  }
}

export async function POST(request: Request) {
  try {
    return created(await createDocument(await readJson(request)));
  } catch (error) {
    return routeError(error);
  }
}
