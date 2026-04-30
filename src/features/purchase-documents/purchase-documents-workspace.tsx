"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ClipboardPaste, Link2, RefreshCw, Upload, X } from "lucide-react";
import { api } from "@/lib/api-client";
import { formatDate } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";

type PurchaseDocument = {
  id: string;
  source: string;
  externalProviderName?: string | null;
  externalDocumentNumber?: string | null;
  title: string;
  documentDate?: string | null;
  dueDate?: string | null;
  amountCents: number;
  currency: string;
  status: string;
  recurrenceCandidate: string;
  confidenceStatus: string;
  notes?: string | null;
  linkedCostPosition?: { title: string } | null;
  items: Array<{ id: string; title: string }>;
  paymentMatches: Array<{
    id: string;
    status: string;
    score: number;
    reason?: string | null;
    amountDeltaCents?: number | null;
    dateDeltaDays?: number | null;
    payment: {
      date: string;
      amountCents: number;
      currency: string;
      provider?: { name: string } | null;
      description?: string | null;
    };
  }>;
};

type ImportResult = {
  parsed: number;
  created: number;
  skipped: number;
};

type AutoMatchResult = {
  scannedPurchaseDocuments: number;
  created: number;
  updated: number;
  autoConfirmed: number;
  proposed: number;
  ambiguous: number;
  unmatched: number;
};

const statusLabels: Record<string, string> = {
  ORDERED: "bestellt",
  DELIVERED: "geliefert",
  CANCELLED: "storniert",
  REFUNDED: "erstattet",
  PARTIALLY_REFUNDED: "teilweise erstattet",
  NEEDS_REVIEW: "zu prüfen",
  INVOICE: "Rechnung/Forderung",
  OPEN_CLAIM: "offene Forderung",
  CREDIT: "Gutschrift",
  UNKNOWN: "unklar",
};

const matchLabels: Record<string, string> = {
  MATCHED: "abgeglichen",
  PROPOSED: "Vorschlag",
  AMBIGUOUS: "mehrdeutig",
  UNMATCHED: "offen",
  NOT_PAYABLE: "nicht zahlungsrelevant",
};

const recurrenceLabels: Record<string, string> = {
  RECURRING: "wiederkehrend",
  POTENTIAL_RECURRING: "potenziell wiederkehrend",
  ONE_TIME: "einmalig",
  LIKELY_RECURRING: "wiederkehrend möglich",
  UNCLEAR: "unklar",
  NO: "einmalig",
};

const recurrenceOptions = [
  { value: "RECURRING", label: "wiederkehrend" },
  { value: "POTENTIAL_RECURRING", label: "potenziell wiederkehrend" },
  { value: "ONE_TIME", label: "einmalig" },
  { value: "UNCLEAR", label: "unklar" },
];

export function PurchaseDocumentsWorkspace() {
  const [documents, setDocuments] = useState<PurchaseDocument[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isMatching, setIsMatching] = useState(false);
  const [matchFilter, setMatchFilter] = useState("ALL");
  const [documentStatusFilter, setDocumentStatusFilter] = useState("ALL");
  const [recurrenceFilter, setRecurrenceFilter] = useState("ALL");
  const [documentSearch, setDocumentSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  async function load() {
    try {
      setDocuments(await api<PurchaseDocument[]>("/api/purchase-documents"));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const stats = useMemo(() => {
    const activeDocuments = documents.filter((document) => document.status !== "CANCELLED");
    return {
      count: documents.length,
      open: documents.filter((document) => document.confidenceStatus === "NEEDS_REVIEW").length,
      totalCents: activeDocuments.reduce((sum, document) => sum + document.amountCents, 0),
      recurringCandidates: documents.filter((document) => ["RECURRING", "POTENTIAL_RECURRING", "LIKELY_RECURRING"].includes(document.recurrenceCandidate)).length,
    };
  }, [documents]);

  const filteredDocuments = useMemo(
    () =>
      documents.filter((document) => {
        const matchState = paymentMatchState(document);
        return (
          matchesDocumentSearch(document, documentSearch) &&
          matchesDateRange(document, dateFrom, dateTo) &&
          (matchFilter === "ALL" || matchState === matchFilter) &&
          (documentStatusFilter === "ALL" || document.status === documentStatusFilter) &&
          (recurrenceFilter === "ALL" || document.recurrenceCandidate === recurrenceFilter)
        );
      }),
    [dateFrom, dateTo, documents, documentSearch, documentStatusFilter, matchFilter, recurrenceFilter],
  );

  async function importAmazonText(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsImporting(true);
    try {
      const result = await api<ImportResult>("/api/purchase-documents/import/amazon-text", {
        method: "POST",
        body: JSON.stringify({ text }),
      });
      setMessage(`${result.created} Belege importiert, ${result.skipped} Dubletten übersprungen, ${result.parsed} erkannt.`);
      setText("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsImporting(false);
    }
  }

  async function pasteFromClipboard() {
    setError(null);
    try {
      setText(await navigator.clipboard.readText());
    } catch {
      setError("Der Browser darf die Zwischenablage nicht automatisch lesen. Bitte mit Strg+V in das Textfeld einfügen.");
    }
  }

  async function runAutoMatch() {
    setError(null);
    setMessage(null);
    setIsMatching(true);
    try {
      const result = await api<AutoMatchResult>("/api/purchase-documents/auto-match", { method: "POST" });
      setMessage(
        [
          `${result.autoConfirmed} automatisch abgeglichen`,
          `${result.proposed} Vorschläge`,
          `${result.ambiguous} mehrdeutig`,
          `${result.unmatched} offen`,
        ].join(", ") + ` (${result.created} neu, ${result.updated} aktualisiert).`,
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsMatching(false);
    }
  }

  async function updateMatchStatus(matchId: string, status: "MANUAL_CONFIRMED" | "REJECTED") {
    setError(null);
    setMessage(null);
    try {
      await api(`/api/payment-matches/${matchId}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setMessage(status === "MANUAL_CONFIRMED" ? "Vorschlag bestätigt." : "Vorschlag abgelehnt.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function updateRecurrenceCandidate(documentId: string, recurrenceCandidate: string) {
    setError(null);
    setMessage(null);
    setDocuments((current) =>
      current.map((document) => (document.id === documentId ? { ...document, recurrenceCandidate } : document)),
    );
    try {
      await api(`/api/purchase-documents/${documentId}`, {
        method: "PATCH",
        body: JSON.stringify({ recurrenceCandidate }),
      });
      setMessage("Wiederkehr-Einschätzung aktualisiert.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      await load();
    }
  }

  return (
    <div className="page">
      <PageHeader
        title="Ausgabenbelege"
        subtitle="Bestellungen, Rechnungen und Shop-Belege werden hier als fachliche Ausgaben erfasst. Bankumsätze werden später dagegen abgeglichen."
        actions={
          <>
            <button className="button" onClick={runAutoMatch} disabled={isMatching} type="button" title="Zahlungen automatisch zuordnen">
              <Link2 size={17} /> Automatisch zuordnen
            </button>
            <button className="button secondary" onClick={load} type="button" title="Aktualisieren">
              <RefreshCw size={17} /> Aktualisieren
            </button>
          </>
        }
      />
      {error ? <div className="error">{error}</div> : null}
      {message ? <div className="success">{message}</div> : null}

      <section className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Belege</div>
          <div className="stat-value">{stats.count}</div>
          <div className="stat-note">{stats.open} zu prüfen</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Erfasste Summe</div>
          <div className="stat-value">{formatMoney(stats.totalCents)}</div>
          <div className="stat-note">ohne stornierte Belege</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Wiederkehr-Kandidaten</div>
          <div className="stat-value">{stats.recurringCandidates}</div>
          <div className="stat-note">zum Beispiel Spar-Abos</div>
        </div>
      </section>

      <form className="panel" onSubmit={importAmazonText}>
        <h2 className="panel-title">Amazon-Bestellseite importieren</h2>
        <div className="field">
          <label htmlFor="amazonText">Kopierter Seitentext</label>
          <textarea
            id="amazonText"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Amazon-Bestellseite im Browser markieren, kopieren und hier einfügen."
            rows={9}
          />
        </div>
        <div className="toolbar" style={{ marginTop: 14 }}>
          <button className="button" disabled={isImporting || text.trim().length < 20} type="submit">
            <Upload size={17} /> Importieren
          </button>
          <button
            className="button secondary"
            onClick={pasteFromClipboard}
            type="button"
            title="Aus Zwischenablage einfügen"
          >
            <ClipboardPaste size={17} /> Einfügen
          </button>
          <span className="toolbar-note">Dubletten werden über Quelle und Bestellnummer übersprungen.</span>
        </div>
      </form>

      <section className="panel toolbar-panel">
        <label className="toolbar-field" htmlFor="documentSearch" style={{ minWidth: 320 }}>
          <span className="field-label">Quelle / Beleg</span>
          <input
            id="documentSearch"
            value={documentSearch}
            onChange={(event) => setDocumentSearch(event.target.value)}
            placeholder="Quelle, Belegnummer, Titel, Position"
          />
        </label>
        <label className="toolbar-field" htmlFor="dateFrom">
          <span className="field-label">Datum von</span>
          <input id="dateFrom" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
        </label>
        <label className="toolbar-field" htmlFor="dateTo">
          <span className="field-label">Datum bis</span>
          <input id="dateTo" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
        </label>
        <label className="toolbar-field" htmlFor="matchFilter">
          <span className="field-label">Abgleich</span>
          <select id="matchFilter" value={matchFilter} onChange={(event) => setMatchFilter(event.target.value)}>
            <option value="ALL">alle</option>
            <option value="UNMATCHED">offen</option>
            <option value="PROPOSED">Vorschlag</option>
            <option value="AMBIGUOUS">mehrdeutig</option>
            <option value="MATCHED">abgeglichen</option>
            <option value="NOT_PAYABLE">nicht zahlungsrelevant</option>
          </select>
        </label>
        <label className="toolbar-field" htmlFor="documentStatusFilter">
          <span className="field-label">Belegstatus</span>
          <select
            id="documentStatusFilter"
            value={documentStatusFilter}
            onChange={(event) => setDocumentStatusFilter(event.target.value)}
          >
            <option value="ALL">alle</option>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="toolbar-field" htmlFor="recurrenceFilter">
          <span className="field-label">Wiederkehr</span>
          <select id="recurrenceFilter" value={recurrenceFilter} onChange={(event) => setRecurrenceFilter(event.target.value)}>
            <option value="ALL">alle</option>
            {Object.entries(recurrenceLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        {documentSearch || dateFrom || dateTo || matchFilter !== "ALL" || documentStatusFilter !== "ALL" || recurrenceFilter !== "ALL" ? (
          <button
            className="button secondary"
            onClick={() => {
              setDocumentSearch("");
              setDateFrom("");
              setDateTo("");
              setMatchFilter("ALL");
              setDocumentStatusFilter("ALL");
              setRecurrenceFilter("ALL");
            }}
            type="button"
            title="Filter zurücksetzen"
          >
            <X size={17} /> Filter löschen
          </button>
        ) : null}
        <div className="toolbar-note">{filteredDocuments.length} von {documents.length} Belegen sichtbar.</div>
      </section>

      <section className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Datum</th>
              <th>Fällig/Zahlziel</th>
              <th>Quelle</th>
              <th>Belegnummer</th>
              <th>Betrag</th>
              <th>Status</th>
              <th>Wiederkehr</th>
              <th>Beleg</th>
              <th>Abgleich</th>
            </tr>
          </thead>
          <tbody>
            {filteredDocuments.map((document) => (
              <tr key={document.id}>
                <td>{formatDate(document.documentDate)}</td>
                <td>{formatDate(document.dueDate)}</td>
                <td>{document.externalProviderName ?? document.source}</td>
                <td>{document.externalDocumentNumber ?? "-"}</td>
                <td>{formatMoney(document.amountCents, document.currency)}</td>
                <td>
                  <StatusBadge tone={document.status === "CANCELLED" ? "muted" : document.status === "REFUNDED" ? "warn" : "default"}>
                    {statusLabels[document.status] ?? document.status}
                  </StatusBadge>
                </td>
                <td>
                  <select
                    aria-label="Wiederkehr-Einschätzung"
                    value={normalizeRecurrenceCandidate(document.recurrenceCandidate)}
                    onChange={(event) => void updateRecurrenceCandidate(document.id, event.target.value)}
                  >
                    {recurrenceOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <strong>{document.title}</strong>
                  <div className="small">
                    {document.items.length > 1 ? `${document.items.length} Positionen` : document.items[0]?.title ?? "keine Position"}
                  </div>
                  {document.notes ? <div className="small">{document.notes}</div> : null}
                  {document.linkedCostPosition ? <div className="small">Kostenposition: {document.linkedCostPosition.title}</div> : null}
                </td>
                <td>
                  <PaymentMatchCell document={document} onUpdateMatchStatus={updateMatchStatus} />
                </td>
              </tr>
            ))}
            {!filteredDocuments.length ? (
              <tr>
                <td colSpan={9}>{documents.length ? "Keine Belege im aktuellen Filter." : "Noch keine Ausgabenbelege importiert."}</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function matchesDocumentSearch(document: PurchaseDocument, query: string) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) {
    return true;
  }
  const searchable = normalizeSearchText(
    [
      document.source,
      document.externalProviderName,
      document.externalDocumentNumber,
      document.title,
      document.notes,
      document.linkedCostPosition?.title,
      ...document.items.map((item) => item.title),
    ]
      .filter(Boolean)
      .join(" "),
  );
  return normalizedQuery.split(" ").every((part) => searchable.includes(part));
}

function matchesDateRange(document: PurchaseDocument, from: string, to: string) {
  if (!from && !to) {
    return true;
  }
  const dates = [document.documentDate, document.dueDate]
    .map((value) => dateKey(value))
    .filter((value): value is string => Boolean(value));
  if (!dates.length) {
    return false;
  }
  return dates.some((date) => (!from || date >= from) && (!to || date <= to));
}

function dateKey(value: string | null | undefined) {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function normalizeSearchText(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("de-DE")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeRecurrenceCandidate(value: string) {
  if (value === "LIKELY_RECURRING") {
    return "POTENTIAL_RECURRING";
  }
  if (value === "NO") {
    return "ONE_TIME";
  }
  return value;
}

function PaymentMatchCell({
  document,
  onUpdateMatchStatus,
}: {
  document: PurchaseDocument;
  onUpdateMatchStatus: (matchId: string, status: "MANUAL_CONFIRMED" | "REJECTED") => Promise<void>;
}) {
  const state = paymentMatchState(document);
  const best = document.paymentMatches.find((match) => match.status !== "REJECTED") ?? document.paymentMatches[0];
  const tone = state === "MATCHED" ? "default" : state === "AMBIGUOUS" || state === "PROPOSED" ? "warn" : "muted";
  const canDecide = best && (best.status === "PROPOSED" || best.status === "AMBIGUOUS");
  return (
    <>
      <StatusBadge tone={tone}>{matchLabels[state]}</StatusBadge>
      {best ? (
        <div className="small">
          {formatDate(best.payment.date)} · {formatMoney(best.payment.amountCents, best.payment.currency)} · {Math.round(best.score * 100)} %
        </div>
      ) : null}
      {best?.reason ? <div className="small">{best.reason}</div> : null}
      {canDecide ? (
        <div className="toolbar" style={{ marginTop: 8 }}>
          <button
            className="button secondary"
            onClick={() => void onUpdateMatchStatus(best.id, "MANUAL_CONFIRMED")}
            type="button"
            title="Vorschlag bestätigen"
          >
            <Check size={16} /> Bestätigen
          </button>
          <button
            className="button secondary"
            onClick={() => void onUpdateMatchStatus(best.id, "REJECTED")}
            type="button"
            title="Vorschlag ablehnen"
          >
            <X size={16} /> Ablehnen
          </button>
        </div>
      ) : null}
    </>
  );
}

function paymentMatchState(document: PurchaseDocument) {
  if (document.status === "CANCELLED" || document.amountCents === 0) {
    return "NOT_PAYABLE";
  }
  if (document.paymentMatches.some((match) => match.status === "MANUAL_CONFIRMED" || match.status === "AUTO_CONFIRMED")) {
    return "MATCHED";
  }
  if (document.paymentMatches.some((match) => match.status === "AMBIGUOUS")) {
    return "AMBIGUOUS";
  }
  if (document.paymentMatches.some((match) => match.status === "PROPOSED")) {
    return "PROPOSED";
  }
  return "UNMATCHED";
}
