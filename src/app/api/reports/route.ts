import { created, ok, routeError } from "@/server/http";
import { generateReports, listReportRuns } from "@/server/services/reporting";

export const runtime = "nodejs";

export async function GET() {
  try {
    return ok(await listReportRuns());
  } catch (error) {
    return routeError(error);
  }
}

export async function POST() {
  try {
    return created(await generateReports());
  } catch (error) {
    return routeError(error);
  }
}
