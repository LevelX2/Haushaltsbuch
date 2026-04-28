"use client";

import { useEffect, useState } from "react";
import { Save, Search } from "lucide-react";
import { api } from "@/lib/api-client";
import { suggestionStatusLabels, suggestionStatuses } from "@/lib/domain";
import { formatDate } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";

type Suggestion = {
  id: string;
  suggestionType: string;
  suggestedAction: string;
  extractedJson: string;
  confidence: number;
  status: string;
  notes?: string | null;
  createdAt: string;
  sourceDocument?: { fileName: string } | null;
};

const emptyForm = {
  suggestionType: "manuell",
  suggestedAction: "prüfen",
  extractedJson: "{}",
  confidence: "0",
  status: "OPEN",
  notes: "",
};

export function InboxWorkspace() {
  const [items, setItems] = useState<Suggestion[]>([]);
  const [selected, setSelected] = useState<Suggestion | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    try {
      setItems(await api<Suggestion[]>("/api/import-suggestions"));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function edit(item: Suggestion) {
    setSelected(item);
    setForm({
      suggestionType: item.suggestionType,
      suggestedAction: item.suggestedAction,
      extractedJson: item.extractedJson,
      confidence: item.confidence.toString(),
      status: item.status,
      notes: item.notes ?? "",
    });
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const payload = { ...form, confidence: Number(form.confidence) || 0 };
    try {
      if (selected) {
        await api(`/api/import-suggestions/${selected.id}`, { method: "PATCH", body: JSON.stringify(payload) });
        setMessage("Prüfpunkt aktualisiert.");
      } else {
        await api("/api/import-suggestions", { method: "POST", body: JSON.stringify(payload) });
        setMessage("Prüfpunkt angelegt.");
      }
      setSelected(null);
      setForm(emptyForm);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function setStatus(item: Suggestion, status: string) {
    await api(`/api/import-suggestions/${item.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    await load();
  }

  return (
    <div className="page">
      <PageHeader
        title="Prüfeingang"
        subtitle="Importe und unklare Inputs landen hier zuerst. Sie verändern produktive Kostenpositionen nicht automatisch."
        actions={
          <button className="button secondary" onClick={load} type="button" title="Aktualisieren">
            <Search size={17} /> Aktualisieren
          </button>
        }
      />
      {error ? <div className="error">{error}</div> : null}
      {message ? <div className="success">{message}</div> : null}
      <section className="workspace">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Typ</th>
                <th>Aktion</th>
                <th>Quelle</th>
                <th>Confidence</th>
                <th>Status</th>
                <th>Erfasst</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr className="row-clickable" key={item.id} onClick={() => edit(item)}>
                  <td>{item.suggestionType}</td>
                  <td>{item.suggestedAction}</td>
                  <td>{item.sourceDocument?.fileName ?? "-"}</td>
                  <td>{Math.round(item.confidence * 100)} %</td>
                  <td>
                    <StatusBadge tone={item.status === "OPEN" ? "warn" : item.status === "REJECTED" ? "danger" : "muted"}>
                      {suggestionStatusLabels[item.status as keyof typeof suggestionStatusLabels] ?? item.status}
                    </StatusBadge>
                  </td>
                  <td>{formatDate(item.createdAt)}</td>
                </tr>
              ))}
              {!items.length ? (
                <tr>
                  <td colSpan={6}>Der Prüfeingang ist leer.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <form className="panel" onSubmit={submit}>
          <h2 className="panel-title">{selected ? "Prüfpunkt bearbeiten" : "Manuellen Prüfpunkt anlegen"}</h2>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="suggestionType">Typ</label>
              <input
                id="suggestionType"
                value={form.suggestionType}
                onChange={(e) => setForm({ ...form, suggestionType: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="suggestedAction">Vorgeschlagene Aktion</label>
              <input
                id="suggestedAction"
                value={form.suggestedAction}
                onChange={(e) => setForm({ ...form, suggestedAction: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="confidence">Confidence 0 bis 1</label>
              <input
                id="confidence"
                inputMode="decimal"
                value={form.confidence}
                onChange={(e) => setForm({ ...form, confidence: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="status">Status</label>
              <select id="status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {suggestionStatuses.map((status) => (
                  <option key={status} value={status}>
                    {suggestionStatusLabels[status]}
                  </option>
                ))}
              </select>
            </div>
            <div className="field full">
              <label htmlFor="extractedJson">Extrahierte Daten als JSON</label>
              <textarea
                id="extractedJson"
                value={form.extractedJson}
                onChange={(e) => setForm({ ...form, extractedJson: e.target.value })}
              />
            </div>
            <div className="field full">
              <label htmlFor="notes">Notiz</label>
              <textarea id="notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <div className="toolbar" style={{ marginTop: 16 }}>
            <button className="button" type="submit">
              <Save size={17} /> Speichern
            </button>
            {selected ? (
              <>
                <button className="button secondary" type="button" onClick={() => setStatus(selected, "ACCEPTED")}>
                  Übernehmen
                </button>
                <button className="button secondary" type="button" onClick={() => setStatus(selected, "POSTPONED")}>
                  Später
                </button>
                <button className="button danger" type="button" onClick={() => setStatus(selected, "REJECTED")}>
                  Ablehnen
                </button>
              </>
            ) : null}
          </div>
        </form>
      </section>
    </div>
  );
}
