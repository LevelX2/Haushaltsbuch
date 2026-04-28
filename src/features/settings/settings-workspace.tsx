"use client";

import { useEffect, useState } from "react";
import { Save, Search } from "lucide-react";
import { api } from "@/lib/api-client";
import { PageHeader } from "@/components/page-header";

type SettingRow = {
  key: string;
  value: string;
  label?: string | null;
  updatedAt: string;
};

const order = [
  "appDataDir",
  "databasePath",
  "logsDir",
  "tempDir",
  "oneDriveRoot",
  "reportsDir",
  "importDir",
  "backupDir",
  "exportDir",
  "documentsDir",
];

export function SettingsWorkspace() {
  const [settings, setSettings] = useState<Record<string, SettingRow>>({});
  const [form, setForm] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    try {
      const rows = await api<Record<string, SettingRow>>("/api/settings");
      setSettings(rows);
      setForm(Object.fromEntries(Object.entries(rows).map(([key, row]) => [key, row.value])));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    try {
      const rows = await api<Record<string, SettingRow>>("/api/settings", {
        method: "PATCH",
        body: JSON.stringify(form),
      });
      setSettings(rows);
      setForm(Object.fromEntries(Object.entries(rows).map(([key, row]) => [key, row.value])));
      setMessage("Einstellungen gespeichert.");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="page">
      <PageHeader
        title="Einstellungen"
        subtitle="Die produktive SQLite-Datenbank bleibt lokal. OneDrive wird für Reports, Backups und optionale Importordner genutzt."
        actions={
          <button className="button secondary" onClick={load} type="button" title="Neu laden">
            <Search size={17} /> Neu laden
          </button>
        }
      />
      {error ? <div className="error">{error}</div> : null}
      {message ? <div className="success">{message}</div> : null}
      <form className="panel" onSubmit={submit}>
        <h2 className="panel-title">Pfade</h2>
        <div className="form-grid">
          {order.map((key) => (
            <div className="field full" key={key}>
              <label htmlFor={key}>{settings[key]?.label ?? key}</label>
              <input
                id={key}
                value={form[key] ?? ""}
                onChange={(event) => setForm({ ...form, [key]: event.target.value })}
              />
            </div>
          ))}
        </div>
        <div className="toolbar" style={{ marginTop: 16 }}>
          <button className="button" type="submit">
            <Save size={17} /> Speichern
          </button>
        </div>
      </form>
    </div>
  );
}
