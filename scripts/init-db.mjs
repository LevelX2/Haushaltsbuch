import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const databaseUrl = process.env.DATABASE_URL || readDatabaseUrlFromEnvFile();
if (!databaseUrl?.startsWith("file:")) {
  throw new Error("DATABASE_URL muss eine SQLite file:-URL sein.");
}

const databasePath = databasePathFromUrl(databaseUrl);
fs.mkdirSync(path.dirname(databasePath), { recursive: true });

const db = new DatabaseSync(databasePath);
db.exec("PRAGMA foreign_keys = ON;");
db.exec(schemaSql());
db.close();

console.log(`SQLite-Schema bereit: ${databasePath}`);

function readDatabaseUrlFromEnvFile() {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) {
    return null;
  }

  const env = fs.readFileSync(envPath, "utf8");
  const match = env.match(/^DATABASE_URL=(?:"([^"]+)"|'([^']+)'|(.+))$/m);
  return match?.[1] || match?.[2] || match?.[3]?.trim() || null;
}

function databasePathFromUrl(url) {
  const withoutPrefix = url.slice("file:".length);
  if (/^[A-Za-z]:\//.test(withoutPrefix)) {
    return withoutPrefix.replaceAll("/", "\\");
  }

  return path.resolve(process.cwd(), "prisma", withoutPrefix);
}

function schemaSql() {
  return `
CREATE TABLE IF NOT EXISTS "Provider" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "normalizedName" TEXT NOT NULL,
  "aliasesJson" TEXT NOT NULL DEFAULT '[]',
  "notes" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "Provider_normalizedName_key" ON "Provider"("normalizedName");
CREATE INDEX IF NOT EXISTS "Provider_name_idx" ON "Provider"("name");

CREATE TABLE IF NOT EXISTS "Category" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "parentCategoryId" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "Category_parentCategoryId_fkey" FOREIGN KEY ("parentCategoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "Category_name_parentCategoryId_key" ON "Category"("name", "parentCategoryId");
CREATE INDEX IF NOT EXISTS "Category_active_sortOrder_idx" ON "Category"("active", "sortOrder");

CREATE TABLE IF NOT EXISTS "HouseholdScope" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS "HouseholdScope_name_key" ON "HouseholdScope"("name");

CREATE TABLE IF NOT EXISTS "CostPosition" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "providerId" TEXT,
  "categoryId" TEXT,
  "householdScopeId" TEXT,
  "amountCents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'EUR',
  "recurrenceType" TEXT NOT NULL DEFAULT 'UNCLEAR',
  "recurrenceCustomRule" TEXT,
  "recurrenceClass" TEXT NOT NULL DEFAULT 'UNCLEAR',
  "limitationType" TEXT NOT NULL DEFAULT 'UNKNOWN',
  "paymentCountLimit" INTEGER,
  "startDate" DATETIME,
  "endDate" DATETIME,
  "nextDueDate" DATETIME,
  "paymentMethod" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "confidenceStatus" TEXT NOT NULL DEFAULT 'NEEDS_REVIEW',
  "monthlyValueCents" INTEGER NOT NULL DEFAULT 0,
  "yearlyValueCents" INTEGER NOT NULL DEFAULT 0,
  "sourceType" TEXT NOT NULL DEFAULT 'MANUAL',
  "notes" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CostPosition_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "CostPosition_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "CostPosition_householdScopeId_fkey" FOREIGN KEY ("householdScopeId") REFERENCES "HouseholdScope" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "CostPosition_status_idx" ON "CostPosition"("status");
CREATE INDEX IF NOT EXISTS "CostPosition_recurrenceClass_idx" ON "CostPosition"("recurrenceClass");
CREATE INDEX IF NOT EXISTS "CostPosition_recurrenceType_idx" ON "CostPosition"("recurrenceType");
CREATE INDEX IF NOT EXISTS "CostPosition_limitationType_idx" ON "CostPosition"("limitationType");
CREATE INDEX IF NOT EXISTS "CostPosition_nextDueDate_idx" ON "CostPosition"("nextDueDate");

CREATE TABLE IF NOT EXISTS "CostPositionVersion" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "costPositionId" TEXT NOT NULL,
  "validFrom" DATETIME NOT NULL,
  "validTo" DATETIME,
  "amountCents" INTEGER NOT NULL,
  "recurrenceType" TEXT NOT NULL,
  "recurrenceClass" TEXT NOT NULL,
  "limitationType" TEXT NOT NULL,
  "monthlyValueCents" INTEGER NOT NULL,
  "yearlyValueCents" INTEGER NOT NULL,
  "notes" TEXT,
  "sourceType" TEXT NOT NULL DEFAULT 'MANUAL',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CostPositionVersion_costPositionId_fkey" FOREIGN KEY ("costPositionId") REFERENCES "CostPosition" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "CostPositionVersion_costPositionId_validFrom_idx" ON "CostPositionVersion"("costPositionId", "validFrom");

CREATE TABLE IF NOT EXISTS "Payment" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "costPositionId" TEXT,
  "providerId" TEXT,
  "date" DATETIME NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'EUR',
  "paymentType" TEXT NOT NULL DEFAULT 'NORMAL',
  "description" TEXT,
  "bankAccountRef" TEXT,
  "sourceDocumentId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'BOOKED',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Payment_costPositionId_fkey" FOREIGN KEY ("costPositionId") REFERENCES "CostPosition" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Payment_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Payment_sourceDocumentId_fkey" FOREIGN KEY ("sourceDocumentId") REFERENCES "Document" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "Payment_date_idx" ON "Payment"("date");
CREATE INDEX IF NOT EXISTS "Payment_paymentType_idx" ON "Payment"("paymentType");
CREATE INDEX IF NOT EXISTS "Payment_status_idx" ON "Payment"("status");

CREATE TABLE IF NOT EXISTS "Document" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "filePath" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "fileHash" TEXT,
  "documentType" TEXT NOT NULL DEFAULT 'UNKLAR',
  "documentGroup" TEXT NOT NULL DEFAULT 'SONDERBELEG',
  "documentDate" DATETIME,
  "providerId" TEXT,
  "amountCents" INTEGER,
  "currency" TEXT NOT NULL DEFAULT 'EUR',
  "extractionJson" TEXT,
  "importStatus" TEXT NOT NULL DEFAULT 'NEW',
  "linkedCostPositionId" TEXT,
  "linkedPaymentId" TEXT,
  "notes" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Document_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Document_linkedCostPositionId_fkey" FOREIGN KEY ("linkedCostPositionId") REFERENCES "CostPosition" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Document_linkedPaymentId_fkey" FOREIGN KEY ("linkedPaymentId") REFERENCES "Payment" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "Document_fileHash_idx" ON "Document"("fileHash");
CREATE INDEX IF NOT EXISTS "Document_importStatus_idx" ON "Document"("importStatus");
CREATE INDEX IF NOT EXISTS "Document_documentType_idx" ON "Document"("documentType");

CREATE TABLE IF NOT EXISTS "ImportSuggestion" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "sourceDocumentId" TEXT,
  "suggestionType" TEXT NOT NULL,
  "suggestedAction" TEXT NOT NULL,
  "extractedJson" TEXT NOT NULL,
  "confidence" REAL NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "linkedCostPositionId" TEXT,
  "linkedPaymentId" TEXT,
  "notes" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ImportSuggestion_sourceDocumentId_fkey" FOREIGN KEY ("sourceDocumentId") REFERENCES "Document" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "ImportSuggestion_linkedCostPositionId_fkey" FOREIGN KEY ("linkedCostPositionId") REFERENCES "CostPosition" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "ImportSuggestion_linkedPaymentId_fkey" FOREIGN KEY ("linkedPaymentId") REFERENCES "Payment" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "ImportSuggestion_status_idx" ON "ImportSuggestion"("status");
CREATE INDEX IF NOT EXISTS "ImportSuggestion_suggestionType_idx" ON "ImportSuggestion"("suggestionType");

CREATE TABLE IF NOT EXISTS "ReportRun" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "reportType" TEXT NOT NULL,
  "filePath" TEXT NOT NULL,
  "format" TEXT NOT NULL,
  "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "status" TEXT NOT NULL DEFAULT 'SUCCESS',
  "message" TEXT
);
CREATE INDEX IF NOT EXISTS "ReportRun_generatedAt_idx" ON "ReportRun"("generatedAt");
CREATE INDEX IF NOT EXISTS "ReportRun_reportType_idx" ON "ReportRun"("reportType");

CREATE TABLE IF NOT EXISTS "BackupRun" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "backupType" TEXT NOT NULL,
  "filePath" TEXT NOT NULL,
  "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "status" TEXT NOT NULL DEFAULT 'SUCCESS',
  "message" TEXT
);
CREATE INDEX IF NOT EXISTS "BackupRun_generatedAt_idx" ON "BackupRun"("generatedAt");
CREATE INDEX IF NOT EXISTS "BackupRun_backupType_idx" ON "BackupRun"("backupType");

CREATE TABLE IF NOT EXISTS "AppSetting" (
  "key" TEXT NOT NULL PRIMARY KEY,
  "value" TEXT NOT NULL,
  "label" TEXT,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`;
}
