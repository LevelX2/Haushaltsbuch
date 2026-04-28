"use client";

import { useEffect, useState } from "react";
import { Archive, RefreshCw } from "lucide-react";
import { api } from "@/lib/api-client";
import { formatDate } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";

type Run = {
  id: string;
  backupType: string;
  filePath: string;
  generatedAt: string;
  status: string;
  message?: string | null;
};

export function BackupWorkspace() {
  const [items, setItems] = useState<Run[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    try {
      setItems(await api<Run[]>("/api/backups"));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function backup() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const created = await api<Run[]>("/api/backups", { method: "POST" });
      setMessage(`${created.length} Sicherungsdateien erzeugt.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <PageHeader
        title="Backup / Export"
        subtitle="Die SQLite-Datenbank wird nicht in OneDrive betrieben. Stattdessen werden Backup-Kopien und JSON-Gesamtexporte abgelegt."
        actions={
          <button className="button" onClick={backup} disabled={busy} type="button" title="Backup erzeugen">
            <Archive size={17} /> {busy ? "Sichere ..." : "Backup erzeugen"}
          </button>
        }
      />
      {error ? <div className="error">{error}</div> : null}
      {message ? <div className="success">{message}</div> : null}
      <div className="toolbar">
        <button className="button secondary" onClick={load} type="button" title="Liste aktualisieren">
          <RefreshCw size={17} /> Liste aktualisieren
        </button>
      </div>
      <section className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Zeitpunkt</th>
              <th>Typ</th>
              <th>Status</th>
              <th>Datei</th>
              <th>Hinweis</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{formatDate(item.generatedAt)}</td>
                <td>{item.backupType}</td>
                <td>
                  <StatusBadge tone={item.status === "FAILED" ? "danger" : "default"}>{item.status}</StatusBadge>
                </td>
                <td>{item.filePath}</td>
                <td>{item.message ?? "-"}</td>
              </tr>
            ))}
            {!items.length ? (
              <tr>
                <td colSpan={5}>Noch keine Backups erzeugt.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </div>
  );
}
