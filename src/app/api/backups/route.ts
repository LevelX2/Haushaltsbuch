import { created, ok, routeError } from "@/server/http";
import { createBackup, listBackupRuns } from "@/server/services/backups";

export const runtime = "nodejs";

export async function GET() {
  try {
    return ok(await listBackupRuns());
  } catch (error) {
    return routeError(error);
  }
}

export async function POST() {
  try {
    return created(await createBackup());
  } catch (error) {
    return routeError(error);
  }
}
