"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Save } from "lucide-react";
import { api } from "@/lib/api-client";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";

type ImportRule = {
  id: string;
  name: string;
  description?: string | null;
  source?: string | null;
  action: string;
  status: string;
  priority: number;
  confidenceThreshold: number;
  sampleRate: number;
  matchJson: string;
  actionJson: string;
  targetEntityType?: string | null;
  targetEntityId?: string | null;
  applicationCount: number;
  errorCount: number;
  lastAppliedAt?: string | null;
  notes?: string | null;
};

const actions = [
  "LINK_PURCHASE_DOCUMENT_TO_COST_POSITION",
  "SET_PURCHASE_DOCUMENT_CATEGORY",
  "SET_PURCHASE_DOCUMENT_RECURRENCE",
  "CREATE_COST_POSITION_FROM_PURCHASE_DOCUMENT",
  "LINK_PAYMENT_TO_COST_POSITION",
  "CONFIRM_PAYMENT_MATCH",
  "MARK_DOCUMENT_DUPLICATE",
  "IGNORE_DOCUMENT",
  "CREATE_OR_UPDATE_IMPORT_RULE",
];

const emptyForm = {
  name: "",
  description: "",
  source: "",
  action: "LINK_PURCHASE_DOCUMENT_TO_COST_POSITION",
  status: "ACTIVE",
  priority: "100",
  confidenceThreshold: "0.86",
  sampleRate: "0.1",
  matchJson: "{}",
  actionJson: "{}",
  targetEntityType: "",
  targetEntityId: "",
  notes: "",
};

export function ImportRulesWorkspace() {
  const [rules, setRules] = useState<ImportRule[]>([]);
  const [selected, setSelected] = useState<ImportRule | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      setRules(await api<ImportRule[]>("/api/import-rules"));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function edit(rule: ImportRule) {
    setSelected(rule);
    setForm({
      name: rule.name,
      description: rule.description ?? "",
      source: rule.source ?? "",
      action: rule.action,
      status: rule.status,
      priority: String(rule.priority),
      confidenceThreshold: String(rule.confidenceThreshold),
      sampleRate: String(rule.sampleRate),
      matchJson: rule.matchJson,
      actionJson: rule.actionJson,
      targetEntityType: rule.targetEntityType ?? "",
      targetEntityId: rule.targetEntityId ?? "",
      notes: rule.notes ?? "",
    });
  }

  function reset() {
    setSelected(null);
    setForm(emptyForm);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    const payload = {
      ...form,
      priority: Number(form.priority) || 100,
      confidenceThreshold: Number(form.confidenceThreshold) || 0.86,
      sampleRate: Number(form.sampleRate) || 0.1,
      description: form.description || null,
      source: form.source || null,
      targetEntityType: form.targetEntityType || null,
      targetEntityId: form.targetEntityId || null,
      notes: form.notes || null,
    };
    try {
      if (selected) {
        await api(`/api/import-rules/${selected.id}`, { method: "PATCH", body: JSON.stringify(payload) });
        setMessage("Importregel aktualisiert.");
      } else {
        await api("/api/import-rules", { method: "POST", body: JSON.stringify(payload) });
        setMessage("Importregel angelegt.");
      }
      reset();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="page">
      <PageHeader
        title="Importregeln"
        subtitle="Regeln steuern, welche bekannten Belege und Zahlungen automatisch zugeordnet werden dürfen."
        actions={
          <button className="button secondary" onClick={load} type="button" title="Aktualisieren">
            <RefreshCw size={17} /> Aktualisieren
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
                <th>Name</th>
                <th>Quelle</th>
                <th>Aktion</th>
                <th>Status</th>
                <th>Schwelle</th>
                <th>Anwendungen</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr className="row-clickable" key={rule.id} onClick={() => edit(rule)}>
                  <td>
                    <strong>{rule.name}</strong>
                    {rule.description ? <div className="small">{rule.description}</div> : null}
                  </td>
                  <td>{rule.source ?? "-"}</td>
                  <td>{formatAction(rule.action)}</td>
                  <td>
                    <StatusBadge tone={rule.status === "ACTIVE" ? "default" : rule.status === "NEEDS_REVIEW" ? "warn" : "muted"}>
                      {formatStatus(rule.status)}
                    </StatusBadge>
                  </td>
                  <td>{Math.round(rule.confidenceThreshold * 100)} %</td>
                  <td>
                    {rule.applicationCount}
                    {rule.errorCount ? <div className="small">{rule.errorCount} Fehler</div> : null}
                  </td>
                </tr>
              ))}
              {!rules.length ? (
                <tr>
                  <td colSpan={6}>Noch keine Importregeln angelegt.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <form className="panel" onSubmit={submit}>
          <h2 className="panel-title">{selected ? "Importregel bearbeiten" : "Importregel anlegen"}</h2>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="name">Name</label>
              <input id="name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
            </div>
            <div className="field">
              <label htmlFor="source">Quelle</label>
              <input id="source" value={form.source} onChange={(event) => setForm({ ...form, source: event.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="action">Aktion</label>
              <select id="action" value={form.action} onChange={(event) => setForm({ ...form, action: event.target.value })}>
                {actions.map((action) => (
                  <option key={action} value={action}>
                    {formatAction(action)}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="status">Status</label>
              <select id="status" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                <option value="ACTIVE">aktiv</option>
                <option value="PAUSED">pausiert</option>
                <option value="NEEDS_REVIEW">zu prüfen</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="confidenceThreshold">Automatikschwelle</label>
              <input id="confidenceThreshold" value={form.confidenceThreshold} onChange={(event) => setForm({ ...form, confidenceThreshold: event.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="sampleRate">Stichprobe</label>
              <input id="sampleRate" value={form.sampleRate} onChange={(event) => setForm({ ...form, sampleRate: event.target.value })} />
            </div>
            <div className="field full">
              <label htmlFor="description">Beschreibung</label>
              <input id="description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
            </div>
            <div className="field full">
              <label htmlFor="matchJson">Match-JSON</label>
              <textarea id="matchJson" value={form.matchJson} onChange={(event) => setForm({ ...form, matchJson: event.target.value })} rows={5} />
            </div>
            <div className="field full">
              <label htmlFor="actionJson">Aktions-JSON</label>
              <textarea id="actionJson" value={form.actionJson} onChange={(event) => setForm({ ...form, actionJson: event.target.value })} rows={5} />
            </div>
            <div className="field full">
              <label htmlFor="notes">Notiz</label>
              <textarea id="notes" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
            </div>
          </div>
          <div className="toolbar" style={{ marginTop: 16 }}>
            <button className="button" type="submit">
              <Save size={17} /> Speichern
            </button>
            {selected ? (
              <button className="button secondary" onClick={reset} type="button">
                Neu anlegen
              </button>
            ) : null}
          </div>
        </form>
      </section>
    </div>
  );
}

function formatAction(value: string) {
  return value.toLowerCase().replaceAll("_", " ");
}

function formatStatus(value: string) {
  if (value === "ACTIVE") return "aktiv";
  if (value === "PAUSED") return "pausiert";
  if (value === "NEEDS_REVIEW") return "zu prüfen";
  return value;
}
