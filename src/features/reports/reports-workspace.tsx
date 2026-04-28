"use client";

import { useEffect, useState } from "react";
import { FileSpreadsheet, RefreshCw } from "lucide-react";
import { api } from "@/lib/api-client";
import { formatDate } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";

type Run = {
  id: string;
  reportType: string;
  filePath: string;
  format: string;
  generatedAt: string;
  status: string;
  message?: string | null;
};

export function ReportsWorkspace() {
  const [items, setItems] = useState<Run[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    try {
      setItems(await api<Run[]>("/api/reports"));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function generate() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const created = await api<Run[]>("/api/reports", { method: "POST" });
      setMessage(`${created.length} Reportdateien erzeugt.`);
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
        title="Reports"
        subtitle="Reports werden auf Knopfdruck als PDF und XLSX im konfigurierten OneDrive-Reportordner abgelegt."
        actions={
          <button className="button" onClick={generate} disabled={busy} type="button" title="Reports aktualisieren">
            <FileSpreadsheet size={17} /> {busy ? "Erzeuge ..." : "Reports aktualisieren"}
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
              <th>Report</th>
              <th>Format</th>
              <th>Status</th>
              <th>Datei</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{formatDate(item.generatedAt)}</td>
                <td>{item.reportType}</td>
                <td>{item.format}</td>
                <td>
                  <StatusBadge tone={item.status === "FAILED" ? "danger" : "default"}>{item.status}</StatusBadge>
                </td>
                <td>{item.filePath}</td>
              </tr>
            ))}
            {!items.length ? (
              <tr>
                <td colSpan={5}>Noch keine Reports erzeugt.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </div>
  );
}
