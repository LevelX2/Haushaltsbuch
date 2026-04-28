import os from "node:os";
import path from "node:path";

export function defaultPaths() {
  const userProfile = process.env.USERPROFILE || os.homedir();
  const localAppData =
    process.env.LOCALAPPDATA || path.join(userProfile, "AppData", "Local");
  const oneDrive = process.env.OneDrive || path.join(userProfile, "OneDrive");
  const appDataDir = path.join(localAppData, "Haushaltsbuch");
  const oneDriveRoot = path.join(oneDrive, "Haushaltsbuch");

  return {
    appDataDir,
    databasePath: path.join(appDataDir, "Haushaltsbuch.sqlite"),
    logsDir: path.join(appDataDir, "logs"),
    tempDir: path.join(appDataDir, "temp"),
    oneDriveRoot,
    reportsDir: path.join(oneDriveRoot, "Reports"),
    importDir: path.join(oneDriveRoot, "Import"),
    backupDir: path.join(oneDriveRoot, "Backup"),
    exportDir: path.join(oneDriveRoot, "Export"),
    documentsDir: path.join(oneDriveRoot, "Dokumente_optional"),
  };
}

export function defaultSettings() {
  const paths = defaultPaths();
  return [
    { key: "appDataDir", value: paths.appDataDir, label: "Lokaler App-Datenordner" },
    { key: "databasePath", value: paths.databasePath, label: "SQLite-Datenbank" },
    { key: "logsDir", value: paths.logsDir, label: "Log-Ordner" },
    { key: "tempDir", value: paths.tempDir, label: "Temporärer Ordner" },
    { key: "oneDriveRoot", value: paths.oneDriveRoot, label: "OneDrive-Hauptordner" },
    { key: "reportsDir", value: paths.reportsDir, label: "OneDrive-Reports" },
    { key: "importDir", value: paths.importDir, label: "OneDrive-Import" },
    { key: "backupDir", value: paths.backupDir, label: "OneDrive-Backup" },
    { key: "exportDir", value: paths.exportDir, label: "OneDrive-Export" },
    { key: "documentsDir", value: paths.documentsDir, label: "Optionale Dokumentablage" },
  ];
}
