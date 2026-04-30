"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, ExternalLink, Plus, Save, Search } from "lucide-react";
import { api } from "@/lib/api-client";
import { documentGroups, documentTypes } from "@/lib/domain";
import { formatDate } from "@/lib/format";
import { centsToEuros, formatMoney } from "@/lib/money";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";

type Provider = { id: string; name: string };
type DocumentRow = {
  id: string;
  createdAt: string;
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
  linkedCostPosition?: { title: string } | null;
  linkedPayment?: { description?: string | null } | null;
  purchaseDocuments: Array<{
    id: string;
    title: string;
    status: string;
    confidenceStatus: string;
    linkedCostPosition?: { title: string } | null;
  }>;
};

type SortKey = "createdAt" | "fileName" | "documentType" | "provider" | "documentDate" | "amountCents" | "importStatus" | "assignment";
type SortDirection = "asc" | "desc";

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

const documentImportStatuses = ["NEW", "IMPORTED", "NEEDS_REVIEW", "LINKED", "IGNORED", "DUPLICATE"];

export function DocumentsWorkspace() {
  const [items, setItems] = useState<DocumentRow[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selected, setSelected] = useState<DocumentRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [sort, setSort] = useState<{ key: SortKey; direction: SortDirection }>({ key: "createdAt", direction: "desc" });
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

  const filteredItems = useMemo(() => {
    return items.filter((item) => statusFilter === "ALL" || item.importStatus === statusFilter);
  }, [items, statusFilter]);

  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((left, right) => compareDocuments(left, right, sort));
  }, [filteredItems, sort]);

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
    window.setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
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

  function changeSort(key: SortKey) {
    setSort((current) => {
      if (current.key === key) {
        return { key, direction: current.direction === "asc" ? "desc" : "asc" };
      }
      return {
        key,
        direction: key === "createdAt" || key === "documentDate" || key === "amountCents" ? "desc" : "asc",
      };
    });
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
        <section className="panel toolbar-panel">
          <label className="toolbar-field" htmlFor="documentStatusFilter">
            <span className="field-label">Status</span>
            <select id="documentStatusFilter" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="ALL">alle</option>
              {documentImportStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          {statusFilter !== "ALL" ? (
            <button className="button secondary" type="button" onClick={() => setStatusFilter("ALL")} title="Filter zurücksetzen">
              Filter löschen
            </button>
          ) : null}
          <div className="toolbar-note">{sortedItems.length} von {items.length} Dokumenten sichtbar.</div>
        </section>
        <div className="table-wrap">
          <table className="documents-table">
            <thead>
              <tr>
                <th><SortButton label="Erstellt" sortKey="createdAt" activeSort={sort} onSort={changeSort} /></th>
                <th><SortButton label="Datei" sortKey="fileName" activeSort={sort} onSort={changeSort} /></th>
                <th><SortButton label="Typ" sortKey="documentType" activeSort={sort} onSort={changeSort} /></th>
                <th><SortButton label="Anbieter" sortKey="provider" activeSort={sort} onSort={changeSort} /></th>
                <th><SortButton label="Belegdatum" sortKey="documentDate" activeSort={sort} onSort={changeSort} /></th>
                <th><SortButton label="Betrag" sortKey="amountCents" activeSort={sort} onSort={changeSort} /></th>
                <th><SortButton label="Status" sortKey="importStatus" activeSort={sort} onSort={changeSort} /></th>
                <th><SortButton label="Zuordnung" sortKey="assignment" activeSort={sort} onSort={changeSort} /></th>
              </tr>
            </thead>
            <tbody>
              {sortedItems.map((item) => (
                <tr className="row-clickable" key={item.id} onClick={() => edit(item)}>
                  <td>{formatDate(item.createdAt)}</td>
                  <td>
                    <strong>{item.fileName}</strong>
                    <div className="small document-path">{item.filePath}</div>
                  </td>
                  <td>{item.documentType}</td>
                  <td>{item.provider?.name ?? "-"}</td>
                  <td>{formatDate(item.documentDate)}</td>
                  <td>{item.amountCents == null ? "-" : formatMoney(item.amountCents, item.currency)}</td>
                  <td>
                    <StatusBadge tone={item.importStatus === "NEEDS_REVIEW" ? "warn" : "muted"}>{item.importStatus}</StatusBadge>
                  </td>
                  <td className="assignment-cell"><AssignmentSummary item={item} /></td>
                </tr>
              ))}
              {!sortedItems.length ? (
                <tr>
                  <td colSpan={8}>{items.length ? "Keine Dokumente im aktuellen Filter." : "Noch keine Dokumente erfasst."}</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <form className="panel collapsible-panel" onSubmit={submit} ref={formRef}>
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
                {documentImportStatuses.map((status) => (
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
            {selected ? (
              <div className="field full">
                <label>Verknüpfungen</label>
                <div className="readonly-box">
                  <AssignmentSummary item={selected} showActions />
                </div>
              </div>
            ) : null}
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

function SortButton({
  label,
  sortKey,
  activeSort,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  activeSort: { key: SortKey; direction: SortDirection };
  onSort: (key: SortKey) => void;
}) {
  const isActive = activeSort.key === sortKey;
  const ariaSort = isActive ? (activeSort.direction === "asc" ? "ascending" : "descending") : "none";
  return (
    <button className="sort-button" type="button" onClick={() => onSort(sortKey)} aria-sort={ariaSort}>
      <span>{label}</span>
      <span aria-hidden="true">{isActive ? (activeSort.direction === "asc" ? "↑" : "↓") : "↕"}</span>
    </button>
  );
}

function AssignmentSummary({ item, showActions = false }: { item: DocumentRow; showActions?: boolean }) {
  const purchaseDocument = item.purchaseDocuments[0];
  const costPositionTitle = item.linkedCostPosition?.title ?? purchaseDocument?.linkedCostPosition?.title;

  if (costPositionTitle) {
    return (
      <>
        <strong>{costPositionTitle}</strong>
        {purchaseDocument ? <div className="small">Ausgabenbeleg: {purchaseDocument.title}</div> : null}
        {showActions ? <AssignmentLinks purchaseDocumentTitle={purchaseDocument?.title} costPositionTitle={costPositionTitle} /> : null}
      </>
    );
  }

  if (purchaseDocument) {
    return (
      <>
        <strong>{purchaseDocument.title}</strong>
        <div className="small">Ausgabenbeleg ohne Kostenposition</div>
        {showActions ? <AssignmentLinks purchaseDocumentTitle={purchaseDocument.title} /> : null}
      </>
    );
  }

  if (item.linkedPayment) {
    return (
      <>
        <strong>Zahlung</strong>
        <div className="small">{item.linkedPayment.description ?? "ohne Beschreibung"}</div>
      </>
    );
  }

  return <span className="small">nicht zugeordnet</span>;
}

function AssignmentLinks({
  purchaseDocumentTitle,
  costPositionTitle,
}: {
  purchaseDocumentTitle?: string | null;
  costPositionTitle?: string | null;
}) {
  return (
    <div className="assignment-actions" onClick={(event) => event.stopPropagation()}>
      {purchaseDocumentTitle ? (
        <Link className="button secondary compact" href={`/ausgabenbelege?q=${encodeURIComponent(purchaseDocumentTitle)}`}>
          <ExternalLink size={15} /> Ausgabenbeleg
        </Link>
      ) : null}
      {costPositionTitle ? (
        <Link className="button secondary compact" href={`/kostenpositionen?q=${encodeURIComponent(costPositionTitle)}`}>
          <ExternalLink size={15} /> Kostenposition
        </Link>
      ) : null}
    </div>
  );
}

function compareDocuments(
  left: DocumentRow,
  right: DocumentRow,
  sort: { key: SortKey; direction: SortDirection },
) {
  const primary = compareBySortKey(left, right, sort.key, sort.direction);
  if (primary !== 0) {
    return primary;
  }
  return compareDateValues(left.createdAt, right.createdAt, "desc");
}

function compareBySortKey(left: DocumentRow, right: DocumentRow, key: SortKey, direction: SortDirection) {
  switch (key) {
    case "createdAt":
      return compareDateValues(left.createdAt, right.createdAt, direction);
    case "fileName":
      return compareText(left.fileName, right.fileName, direction);
    case "documentType":
      return compareText(left.documentType, right.documentType, direction);
    case "provider":
      return compareText(left.provider?.name, right.provider?.name, direction);
    case "documentDate":
      return compareDateValues(left.documentDate, right.documentDate, direction);
    case "amountCents":
      return compareNumbers(left.amountCents, right.amountCents, direction);
    case "importStatus":
      return compareText(left.importStatus, right.importStatus, direction);
    case "assignment":
      return compareText(assignmentText(left), assignmentText(right), direction);
  }
}

function assignmentText(item: DocumentRow) {
  const purchaseDocument = item.purchaseDocuments[0];
  return [
    item.linkedCostPosition?.title,
    purchaseDocument?.linkedCostPosition?.title,
    purchaseDocument?.title,
    item.linkedPayment?.description,
  ]
    .filter(Boolean)
    .join(" ");
}

function compareText(left?: string | null, right?: string | null, direction: SortDirection = "asc") {
  const leftValue = left?.trim();
  const rightValue = right?.trim();
  if (!leftValue && !rightValue) {
    return 0;
  }
  if (!leftValue) {
    return 1;
  }
  if (!rightValue) {
    return -1;
  }
  return applyDirection(leftValue.localeCompare(rightValue, "de-DE", { numeric: true, sensitivity: "base" }), direction);
}

function compareNumbers(left?: number | null, right?: number | null, direction: SortDirection = "asc") {
  if (left == null && right == null) {
    return 0;
  }
  if (left == null) {
    return 1;
  }
  if (right == null) {
    return -1;
  }
  return applyDirection(left - right, direction);
}

function compareDateValues(left?: string | null, right?: string | null, direction: SortDirection = "asc") {
  const leftTime = parseTime(left);
  const rightTime = parseTime(right);
  if (leftTime == null && rightTime == null) {
    return 0;
  }
  if (leftTime == null) {
    return 1;
  }
  if (rightTime == null) {
    return -1;
  }
  return applyDirection(leftTime - rightTime, direction);
}

function parseTime(value?: string | null) {
  if (!value) {
    return null;
  }
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
}

function applyDirection(comparison: number, direction: SortDirection) {
  return direction === "asc" ? comparison : -comparison;
}
