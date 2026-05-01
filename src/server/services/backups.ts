import fsp from "node:fs/promises";
import path from "node:path";
import { timestampForFile } from "@/lib/format";
import { prisma } from "@/server/prisma";
import { settingValue } from "@/server/services/settings";

export async function listBackupRuns() {
  return prisma.backupRun.findMany({ orderBy: { generatedAt: "desc" }, take: 100 });
}

export async function createBackup() {
  const backupDir = await settingValue("backupDir");
  await fsp.mkdir(backupDir, { recursive: true });
  const stamp = timestampForFile();
  const generated = [];

  const databasePath = databasePathFromUrl(process.env.DATABASE_URL);
  if (databasePath) {
    try {
      const target = path.join(backupDir, `${stamp}-Haushaltsbuch.sqlite`);
      await fsp.copyFile(databasePath, target);
      generated.push(
        await prisma.backupRun.create({
          data: { backupType: "sqlite", filePath: target, status: "SUCCESS" },
        }),
      );
    } catch (error) {
      generated.push(
        await prisma.backupRun.create({
          data: {
            backupType: "sqlite",
            filePath: databasePath,
            status: "FAILED",
            message: error instanceof Error ? error.message : String(error),
          },
        }),
      );
    }
  }

  const exportPath = path.join(backupDir, `${stamp}-gesamtexport.json`);
  await fsp.writeFile(exportPath, JSON.stringify(await completeExport(), null, 2), "utf8");
  generated.push(
    await prisma.backupRun.create({
      data: { backupType: "json-export", filePath: exportPath, status: "SUCCESS" },
    }),
  );

  return generated;
}

async function completeExport() {
  const [
    costPositions,
    payments,
    providers,
    categories,
    householdScopes,
    documents,
    importSuggestions,
    importRuns,
    importRules,
    importDecisions,
    auditLogs,
    reportRuns,
    backupRuns,
    appSettings,
  ] = await Promise.all([
    prisma.costPosition.findMany({ include: { versions: true } }),
    prisma.payment.findMany(),
    prisma.provider.findMany(),
    prisma.category.findMany(),
    prisma.householdScope.findMany(),
    prisma.document.findMany(),
    prisma.importSuggestion.findMany(),
    prisma.importRun.findMany(),
    prisma.importRule.findMany(),
    prisma.importDecision.findMany(),
    prisma.auditLog.findMany(),
    prisma.reportRun.findMany(),
    prisma.backupRun.findMany(),
    prisma.appSetting.findMany(),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    costPositions,
    payments,
    providers,
    categories,
    householdScopes,
    documents,
    importSuggestions,
    importRuns,
    importRules,
    importDecisions,
    auditLogs,
    reportRuns,
    backupRuns,
    appSettings,
  };
}

function databasePathFromUrl(databaseUrl?: string): string | null {
  if (!databaseUrl?.startsWith("file:")) {
    return null;
  }

  const withoutPrefix = databaseUrl.slice("file:".length);
  if (/^[A-Za-z]:\//.test(withoutPrefix)) {
    return withoutPrefix.replaceAll("/", "\\");
  }

  return path.resolve(/* turbopackIgnore: true */ process.cwd(), withoutPrefix);
}
