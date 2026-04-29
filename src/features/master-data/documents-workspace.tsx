"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Plus, Save, Search } from "lucide-react";
import { api } from "@/lib/api-client";
import { documentGroups, documentTypes } from "@/lib/domain";
import { formatDate } from "@/lib/format";
import { centsToEuros, formatMoney } from "@/lib/money";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";

type Provider = { id: string; name: string };
type DocumentRow = {
  id: string;
  filePath: string;
  fileName: string;
  fileHash?: string | null;
  documentType: string;
  documentGroup: string;
  documentDate?: string | null;
  providerId?: string | null;
  amountCents?: number | null;
  currency: string;
  importStatus: string;
  notes?: string | null;
  provider?: Provider | null;
};

const emptyForm = {
  filePath: "",
  fileName: "",
  fileHash: "",
  documentType: "UNKLAR",
  documentGroup: "SONDERBELEGE",
  documentDate: "",
  providerId: "",
  amount: "",
  currency: "EUR",
  importStatus: "NEW",
  notes: "",
};

export function DocumentsWorkspace() {
  const [items, setItems] = useState<DocumentRow[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selected, setSelected] = useState<DocumentRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    try {
      const [docs, providerRows] = await Promise.all([api<DocumentRow[]>("/api/documents"), api<Provider[]>("/api/providers")]);
      setItems(docs);
      setProviders(providerRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function edit(item: DocumentRow) {
    setSelected(item);
    setIsFormOpen(true);
    setForm({
      filePath: item.filePath,
      fileName: item.fileName,
      fileHash: item.fileHash ?? "",
      documentType: item.documentType,
      documentGroup: item.documentGroup,
      documentDate: item.documentDate?.slice(0, 10) ?? "",
      providerId: item.providerId ?? "",
      amount: item.amountCents == null ? "" : centsToEuros(item.amountCents).toFixed(2).replace(".", ","),
      currency: item.currency,
      importStatus: item.importStatus,
      notes: item.notes ?? "",
    });
  }

  function reset() {
    setSelected(null);
    setForm(emptyForm);
    setIsFormOpen(false);
  }

  function createNew() {
    setSelected(null);
    setForm(emptyForm);
    setIsFormOpen(true);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      if (selected) {
        await api(`/api/documents/${selected.id}`, { method: "PATCH", body: JSON.stringify(form) });
        setMessage("Dokument aktualisiert.");
      } else {
        await api("/api/documents", { method: "POST", body: JSON.stringify(form) });
        setMessage("Dokument erfasst.");
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
        title="Dokumente / Belege"
        subtitle="Dokumente werden als Quellen mit Pfad, Typ, Importstatus und optionaler Verknüpfung geführt. Dateien selbst bleiben außerhalb der Datenbank."
        actions={
          <>
            <button className="button secondary" onClick={createNew} type="button" title="Neues Dokument">
              <Plus size={17} /> Neu
            </button>
            <button className="button secondary" onClick={load} type="button" title="Aktualisieren">
              <Search size={17} /> Aktualisieren
            </button>
          </>
        }
      />
      {error ? <div className="error">{error}</div> : null}
      {message ? <div className="success">{message}</div> : null}
      <section className="workspace">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Datei</th>
                <th>Typ</th>
                <th>Anbieter</th>
                <th>Datum</th>
                <th>Betrag</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr className="row-clickable" key={item.id} onClick={() => edit(item)}>
                  <td>
                    <strong>{item.fileName}</strong>
                    <div className="small">{item.filePath}</div>
                  </td>
                  <td>{item.documentType}</td>
                  <td>{item.provider?.name ?? "-"}</td>
                  <td>{formatDate(item.documentDate)}</td>
                  <td>{item.amountCents == null ? "-" : formatMoney(item.amountCents, item.currency)}</td>
                  <td>
                    <StatusBadge tone={item.importStatus === "NEEDS_REVIEW" ? "warn" : "muted"}>{item.importStatus}</StatusBadge>
                  </td>
                </tr>
              ))}
              {!items.length ? (
                <tr>
                  <td colSpan={6}>Noch keine Dokumente erfasst.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <form className="panel collapsible-panel" onSubmit={submit}>
          <button
            className="panel-toggle"
            type="button"
            onClick={() => setIsFormOpen((current) => !current)}
            aria-expanded={isFormOpen}
          >
            <span>
              {isFormOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
              <span className="panel-title">{selected ? "Dokument bearbeiten" : "Dokument erfassen"}</span>
            </span>
            <span className="small">{isFormOpen ? "Einklappen" : "Manuell erfassen"}</span>
          </button>
          {isFormOpen ? (
          <>
            <div className="form-grid">
            <div className="field full">
              <label htmlFor="filePath">Dateipfad</label>
              <input id="filePath" value={form.filePath} onChange={(e) => setForm({ ...form, filePath: e.target.value })} required />
            </div>
            <div className="field full">
              <label htmlFor="fileName">Dateiname</label>
              <input id="fileName" value={form.fileName} onChange={(e) => setForm({ ...form, fileName: e.target.value })} required />
            </div>
            <div className="field">
              <label htmlFor="documentType">Belegart</label>
              <select
                id="documentType"
                value={form.documentType}
                onChange={(e) => setForm({ ...form, documentType: e.target.value })}
              >
                {documentTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="documentGroup">Hauptgruppe</label>
              <select
                id="documentGroup"
                value={form.documentGroup}
                onChange={(e) => setForm({ ...form, documentGroup: e.target.value })}
              >
                {documentGroups.map((group) => (
                  <option key={group} value={group}>
                    {group}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="providerId">Anbieter</label>
              <select
                id="providerId"
                value={form.providerId}
                onChange={(e) => setForm({ ...form, providerId: e.target.value })}
              >
                <option value="">ohne Anbieter</option>
                {providers.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="documentDate">Dokumentdatum</label>
              <input
                id="documentDate"
                type="date"
                value={form.documentDate}
                onChange={(e) => setForm({ ...form, documentDate: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="amount">Betrag</label>
              <input id="amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="importStatus">Importstatus</label>
              <select
                id="importStatus"
                value={form.importStatus}
                onChange={(e) => setForm({ ...form, importStatus: e.target.value })}
              >
                {["NEW", "IMPORTED", "NEEDS_REVIEW", "LINKED", "IGNORED", "DUPLICATE"].map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <div className="field full">
              <label htmlFor="fileHash">Hash</label>
              <input id="fileHash" value={form.fileHash} onChange={(e) => setForm({ ...form, fileHash: e.target.value })} />
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
            </div>
          </>
          ) : null}
        </form>
      </section>
    </div>
  );
}
