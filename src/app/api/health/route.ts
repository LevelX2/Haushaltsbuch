import { ok, routeError } from "@/server/http";
import { prisma } from "@/server/prisma";

export const runtime = "nodejs";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return ok({ status: "ok", checkedAt: new Date().toISOString() });
  } catch (error) {
    return routeError(error);
  }
}
