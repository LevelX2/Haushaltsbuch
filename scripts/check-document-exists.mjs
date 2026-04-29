import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { DatabaseSync } from "node:sqlite";

const args = process.argv.slice(2);

if (!args.length || args.includes("--help") || args.includes("-h")) {
  printHelp();
  process.exit(args.length ? 0 : 1);
}

const options = parseArgs(args);
const databasePath = resolveDatabasePath(options.database);

if (!fs.existsSync(databasePath)) {
  fail(`Datenbank nicht gefunden: ${databasePath}`);
}

const db = new DatabaseSync(databasePath);

try {
  const result = {
    databasePath,
    existsByHash: false,
    matchedDocument: null,
    metadataMatches: [],
  };

  if (options.file) {
    const filePath = path.resolve(options.file);
    if (!fs.existsSync(filePath)) {
      fail(`Datei nicht gefunden: ${filePath}`);
    }

    const fileHash = sha256(filePath);
    const match = db
      .prepare(
        `SELECT d.id,
                d.fileName,
                d.filePath,
                d.documentDate,
                d.amountCents,
                d.importStatus,
                p.name AS providerName
           FROM Document d
           LEFT JOIN Provider p ON p.id = d.providerId
          WHERE d.fileHash = ?`,
      )
      .get(fileHash);

    result.filePath = filePath;
    result.fileHash = fileHash;
    result.existsByHash = Boolean(match);
    result.matchedDocument = match ?? null;
  }

  if (options.provider || options.date || options.amount !== undefined) {
    result.metadataMatches = findMetadataMatches(db, options);
  }

  console.log(JSON.stringify(result, null, 2));
} finally {
  db.close();
}

function parseArgs(values) {
  const parsed = {};

  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];

    if (!value.startsWith("--") && !parsed.file) {
      parsed.file = value;
      continue;
    }

    if (!value.startsWith("--")) {
      fail(`Unerwartetes Argument: ${value}`);
    }

    const key = value.slice(2);
    const next = values[index + 1];
    if (!next || next.startsWith("--")) {
      fail(`Wert fehlt für --${key}`);
    }
    index += 1;

    switch (key) {
      case "database":
        parsed.database = next;
        break;
      case "provider":
        parsed.provider = next;
        break;
      case "date":
        parsed.date = next;
        break;
      case "amount":
        parsed.amount = eurosToCents(next);
        break;
      default:
        fail(`Unbekannte Option: --${key}`);
    }
  }

  return parsed;
}

function resolveDatabasePath(explicitPath) {
  if (explicitPath) {
    return path.resolve(explicitPath);
  }

  const envDatabaseUrl = readEnvDatabaseUrl();
  if (envDatabaseUrl) {
    return databaseUrlToPath(envDatabaseUrl);
  }

  const localAppData = process.env.LOCALAPPDATA ?? path.join(os.homedir(), "AppData", "Local");
  return path.join(localAppData, "Haushaltsbuch", "Haushaltsbuch.sqlite");
}

function readEnvDatabaseUrl() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) {
    return null;
  }

  const envContent = fs.readFileSync(envPath, "utf8");
  const match = envContent.match(/^DATABASE_URL=(?:"([^"]+)"|'([^']+)'|(.+))$/m);
  return match?.[1] ?? match?.[2] ?? match?.[3]?.trim() ?? null;
}

function databaseUrlToPath(databaseUrl) {
  if (!databaseUrl.startsWith("file:")) {
    fail(`DATABASE_URL muss eine SQLite file:-URL sein: ${databaseUrl}`);
  }

  return databaseUrl.slice("file:".length).replaceAll("/", path.sep);
}

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function findMetadataMatches(db, options) {
  const where = [];
  const params = [];

  if (options.provider) {
    where.push("lower(p.name) LIKE lower(?)");
    params.push(`%${options.provider}%`);
  }

  if (options.date) {
    where.push("date(d.documentDate) = date(?)");
    params.push(options.date);
  }

  if (options.amount !== undefined) {
    where.push("d.amountCents = ?");
    params.push(options.amount);
  }

  if (!where.length) {
    return [];
  }

  return db
    .prepare(
      `SELECT d.id,
              d.fileName,
              d.filePath,
              d.documentDate,
              d.amountCents,
              d.importStatus,
              p.name AS providerName
         FROM Document d
         LEFT JOIN Provider p ON p.id = d.providerId
        WHERE ${where.join(" AND ")}
        ORDER BY d.documentDate DESC, d.createdAt DESC
        LIMIT 20`,
    )
    .all(...params);
}

function eurosToCents(rawValue) {
  const normalized = String(rawValue).trim().replace(/\./g, "").replace(",", ".");
  const value = Number(normalized);
  if (!Number.isFinite(value)) {
    fail(`Ungültiger Betrag: ${rawValue}`);
  }
  return Math.round(value * 100);
}

function printHelp() {
  console.log(`Prüft, ob ein Beleg bereits in der Haushaltskosten-Datenbank bekannt ist.

Datei per Hash prüfen:
  node scripts/check-document-exists.mjs "C:\\Pfad\\zum\\Beleg.pdf"

Metadaten prüfen:
  node scripts/check-document-exists.mjs --provider "Telekom" --date "2026-04-07" --amount "45,79"

Optionen:
  --database "C:\\Pfad\\Haushaltsbuch.sqlite"  Alternative SQLite-Datei
  --provider "Name"                           Anbieter-Teilstring
  --date "YYYY-MM-DD"                         Belegdatum
  --amount "12,34"                            Betrag in Euro`);
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
