import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const repoRoot = process.cwd();
const userProfile = process.env.USERPROFILE || os.homedir();
const localAppData =
  process.env.LOCALAPPDATA || path.join(userProfile, "AppData", "Local");
const oneDrive = process.env.OneDrive || path.join(userProfile, "OneDrive");

const appDataDir = path.join(localAppData, "Haushaltsbuch");
const dbPath = path.join(appDataDir, "Haushaltsbuch.sqlite");
const oneDriveRoot = path.join(oneDrive, "Haushaltsbuch");

const directories = [
  appDataDir,
  path.join(appDataDir, "logs"),
  path.join(appDataDir, "temp"),
  oneDriveRoot,
  path.join(oneDriveRoot, "Reports"),
  path.join(oneDriveRoot, "Import"),
  path.join(oneDriveRoot, "Backup"),
  path.join(oneDriveRoot, "Export"),
  path.join(oneDriveRoot, "Dokumente_optional"),
];

for (const directory of directories) {
  fs.mkdirSync(directory, { recursive: true });
}

const envPath = path.join(repoRoot, ".env");
const databaseUrl = `file:${dbPath.replaceAll("\\", "/")}`;

if (!fs.existsSync(envPath)) {
  fs.writeFileSync(envPath, `DATABASE_URL="${databaseUrl}"\n`, "utf8");
} else {
  const current = fs.readFileSync(envPath, "utf8");
  if (!/^DATABASE_URL=/m.test(current)) {
    fs.appendFileSync(envPath, `\nDATABASE_URL="${databaseUrl}"\n`, "utf8");
  }
}

console.log(`Haushaltsbuch-Laufzeitordner bereit: ${appDataDir}`);
console.log(`OneDrive-Ausgabeordner bereit: ${oneDriveRoot}`);
