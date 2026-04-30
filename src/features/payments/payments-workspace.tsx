"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, FolderInput, Plus, Save, Search } from "lucide-react";
import { api } from "@/lib/api-client";
import { paymentStatusLabels, paymentStatuses, paymentTypeLabels, paymentTypes, recurrenceTypeLabels } from "@/lib/domain";
import { formatDate } from "@/lib/format";
import { centsToEuros, formatMoney } from "@/lib/money";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";

type Option = { id: string; name?: string; title?: string };
type Payment = {
  id: string;
  costPositionId?: string | null;
  providerId?: string | null;
  date: string;
  amountCents: number;
  currency: string;
  paymentType: string;
  description?: string | null;
  bankAccountRef?: string | null;
  status: string;
  provider?: { name: string } | null;
  costPosition?: { title: string } | null;
  paymentMatches: Array<{
    id: string;
    status: string;
    score: number;
    purchaseDocument: {
      title: string;
      source: string;
      externalProviderName?: string | null;
      externalDocumentNumber?: string | null;
      amountCents: number;
      currency: string;
    };
  }>;
};

type CamtImportResult = {
  archives: number;
  parsed: number;
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
};

type RecurringCostResult = {
  costPosition: { id: string; title: string };
  linkedPayments: number;
};

const matchLabels: Record<string, string> = {
  MATCHED: "abgeglichen",
  PROPOSED: "Vorschlag",
  AMBIGUOUS: "mehrdeutig",
  UNMATCHED: "offen",
};

const emptyForm = {
  costPositionId: "",
  providerId: "",
  date: new Date().toISOString().slice(0, 10),
  amount: "",
  currency: "EUR",
  paymentType: "NORMAL",
  description: "",
  bankAccountRef: "",
  status: "BOOKED",
};

export function PaymentsWorkspace() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [providers, setProviders] = useState<Option[]>([]);
  const [costPositions, setCostPositions] = useState<Option[]>([]);
  const [categories, setCategories] = useState<Option[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selected, setSelected] = useState<Payment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [camtDirectory, setCamtDirectory] = useState("");
  const [isImportingCamt, setIsImportingCamt] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [matchFilter, setMatchFilter] = useState("ALL");
  const [paymentTypeFilter, setPaymentTypeFilter] = useState("ALL");
  const [recurringCategoryId, setRecurringCategoryId] = useState("");
  const [recurringType, setRecurringType] = useState("MONTHLY");
  const [isCreatingRecurring, setIsCreatingRecurring] = useState(false);

  async function load() {
    setError(null);
    try {
      const [nextPayments, nextProviders, nextCosts, nextCategories] = await Promise.all([
        api<Payment[]>("/api/payments"),
        api<Option[]>("/api/providers"),
        api<Option[]>("/api/cost-positions?sort=title&direction=asc"),
        api<Option[]>("/api/categories"),
      ]);
      setPayments(nextPayments);
      setProviders(nextProviders);
      setCostPositions(nextCosts);
      setCategories(nextCategories);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filteredPayments = useMemo(
    () =>
      payments.filter((payment) => {
        const matchState = paymentMatchState(payment);
        const matchesSearch = !searchTerm.trim() || paymentSearchText(payment).includes(searchTerm.trim().toLocaleLowerCase("de-DE"));
        return (
          matchesSearch &&
          (matchFilter === "ALL" || matchState === matchFilter) &&
          (paymentTypeFilter === "ALL" || payment.paymentType === paymentTypeFilter)
        );
      }),
    [matchFilter, paymentTypeFilter, payments, searchTerm],
  );

  function edit(payment: Payment) {
    setSelected(payment);
    setIsFormOpen(true);
    setForm({
      costPositionId: payment.costPositionId ?? "",
      providerId: payment.providerId ?? "",
      date: payment.date.slice(0, 10),
      amount: centsToEuros(payment.amountCents).toFixed(2).replace(".", ","),
      currency: payment.currency,
      paymentType: payment.paymentType,
      description: payment.description ?? "",
      bankAccountRef: payment.bankAccountRef ?? "",
      status: payment.status,
    });
    setRecurringCategoryId("");
    setRecurringType("MONTHLY");
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
    setMessage(null);
    try {
      if (selected) {
        await api(`/api/payments/${selected.id}`, { method: "PATCH", body: JSON.stringify(form) });
        setMessage("Zahlung aktualisiert.");
      } else {
        await api("/api/payments", { method: "POST", body: JSON.stringify(form) });
        setMessage("Zahlung erfasst.");
      }
      reset();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function importCamtDirectory(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsImportingCamt(true);
    try {
      const result = await api<CamtImportResult>("/api/payments/import/camt-directory", {
        method: "POST",
        body: JSON.stringify({ directoryPath: camtDirectory }),
      });
      const errorSuffix = result.errors.length ? ` ${result.errors.length} Datei(en) mit Fehlern.` : "";
      setMessage(
        `${result.created} Zahlungen importiert, ${result.updated} aktualisiert, ${result.skipped} unverändert übersprungen, ${result.parsed} Umsätze aus ${result.archives} ZIP-Datei(en) gelesen.${errorSuffix}`,
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsImportingCamt(false);
    }
  }

  async function createRecurringFromSelected() {
    if (!selected) {
      return;
    }
    setError(null);
    setMessage(null);
    setIsCreatingRecurring(true);
    try {
      const result = await api<RecurringCostResult>(`/api/payments/${selected.id}/recurring-cost-position`, {
        method: "POST",
        body: JSON.stringify({
          categoryId: recurringCategoryId,
          recurrenceType: recurringType,
        }),
      });
      setMessage(`Kostenposition „${result.costPosition.title}“ angelegt und ${result.linkedPayments} Zahlung(en) verknüpft.`);
      reset();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsCreatingRecurring(false);
    }
  }

  return (
    <div className="page">
      <PageHeader
        title="Zahlungen"
        subtitle="Echte Zahlungsbewegungen aus Bank, Karte, PayPal oder Barzahlung. Rechnungen, Bescheide und Forderungen gehören zu den Ausgabenbelegen."
        actions={
          <>
            <button className="button secondary" onClick={createNew} type="button" title="Neue Zahlung">
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
        <form className="panel" onSubmit={importCamtDirectory}>
          <h2 className="panel-title">CAMT-Kontoauszüge importieren</h2>
          <div className="toolbar-panel">
            <div className="toolbar-field" style={{ minWidth: 420 }}>
              <label htmlFor="camtDirectory">Ordner mit CAMT-ZIP-Dateien</label>
              <input
                id="camtDirectory"
                value={camtDirectory}
                onChange={(event) => setCamtDirectory(event.target.value)}
                placeholder="C:\Users\<Benutzer>\OneDrive\Unterlagen\Bank\SPK\2026"
              />
            </div>
            <button className="button" disabled={isImportingCamt || !camtDirectory.trim()} type="submit">
              <FolderInput size={17} /> Importieren
            </button>
            <span className="toolbar-note">
              ZIP-Dateien werden lokal gelesen. Bereits importierte Umsätze werden über die Bankreferenz übersprungen.
            </span>
          </div>
        </form>
        <section className="panel toolbar-panel">
          <label className="toolbar-field search-field" htmlFor="paymentSearch">
            <span className="field-label">Suche</span>
            <input
              id="paymentSearch"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Beschreibung, Anbieter, Beleg, Banktext"
            />
          </label>
          <label className="toolbar-field" htmlFor="paymentMatchFilter">
            <span className="field-label">Abgleich</span>
            <select id="paymentMatchFilter" value={matchFilter} onChange={(event) => setMatchFilter(event.target.value)}>
              <option value="ALL">alle</option>
              <option value="UNMATCHED">offen</option>
              <option value="PROPOSED">Vorschlag</option>
              <option value="AMBIGUOUS">mehrdeutig</option>
              <option value="MATCHED">abgeglichen</option>
            </select>
          </label>
          <label className="toolbar-field" htmlFor="paymentTypeFilter">
            <span className="field-label">Zahlungstyp</span>
            <select id="paymentTypeFilter" value={paymentTypeFilter} onChange={(event) => setPaymentTypeFilter(event.target.value)}>
              <option value="ALL">alle</option>
              {paymentTypes.map((type) => (
                <option key={type} value={type}>
                  {paymentTypeLabels[type]}
                </option>
              ))}
            </select>
          </label>
          <div className="toolbar-note">
            {filteredPayments.length} von {payments.length} Zahlungen sichtbar.
          </div>
        </section>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Datum</th>
                <th>Beschreibung</th>
                <th>Anbieter</th>
                <th>Kostenposition</th>
                <th>Betrag</th>
                <th>Typ</th>
                <th>Status</th>
                <th>Ausgabenbeleg</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map((payment) => {
                const amount = paymentAmountDisplay(payment);
                return (
                  <tr className="row-clickable" key={payment.id} onClick={() => edit(payment)}>
                    <td>{formatDate(payment.date)}</td>
                    <td>{payment.description ?? "-"}</td>
                    <td>{payment.provider?.name ?? "-"}</td>
                    <td>{payment.costPosition?.title ?? "-"}</td>
                    <td>
                      <span className={`money ${amount.tone}`}>{amount.label}</span>
                    </td>
                    <td>{paymentTypeLabels[payment.paymentType as keyof typeof paymentTypeLabels] ?? payment.paymentType}</td>
                    <td>
                      <StatusBadge tone={payment.status === "NEEDS_REVIEW" ? "warn" : "default"}>
                        {paymentStatusLabels[payment.status as keyof typeof paymentStatusLabels] ?? payment.status}
                      </StatusBadge>
                    </td>
                    <td>
                      <PaymentMatchCell payment={payment} />
                    </td>
                  </tr>
                );
              })}
              {!filteredPayments.length ? (
                <tr>
                  <td colSpan={8}>{payments.length ? "Keine Zahlungen im aktuellen Filter." : "Noch keine Zahlungen erfasst."}</td>
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
              <span className="panel-title">{selected ? "Zahlung bearbeiten" : "Zahlung erfassen"}</span>
            </span>
            <span className="small">{isFormOpen ? "Einklappen" : "Manuell erfassen"}</span>
          </button>
          {isFormOpen ? (
          <>
            <div className="form-grid">
            <div className="field">
              <label htmlFor="date">Datum</label>
              <input id="date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="amount">Betrag</label>
              <input id="amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
            </div>
            <div className="field">
              <label htmlFor="provider">Anbieter</label>
              <select id="provider" value={form.providerId} onChange={(e) => setForm({ ...form, providerId: e.target.value })}>
                <option value="">ohne Anbieter</option>
                {providers.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="costPosition">Kostenposition</label>
              <select
                id="costPosition"
                value={form.costPositionId}
                onChange={(e) => setForm({ ...form, costPositionId: e.target.value })}
              >
                <option value="">nicht verknüpft</option>
                {costPositions.map((position) => (
                  <option key={position.id} value={position.id}>
                    {position.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="paymentType">Zahlungstyp</label>
              <select
                id="paymentType"
                value={form.paymentType}
                onChange={(e) => setForm({ ...form, paymentType: e.target.value })}
              >
                {paymentTypes.map((type) => (
                  <option key={type} value={type}>
                    {paymentTypeLabels[type]}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="status">Status</label>
              <select id="status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {paymentStatuses.map((status) => (
                  <option key={status} value={status}>
                    {paymentStatusLabels[status]}
                  </option>
                ))}
              </select>
            </div>
            <div className="field full">
              <label htmlFor="description">Beschreibung</label>
              <input
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="field full">
              <label htmlFor="bankAccountRef">Bankreferenz / Verwendungszweck</label>
              <textarea
                id="bankAccountRef"
                value={form.bankAccountRef}
                onChange={(e) => setForm({ ...form, bankAccountRef: e.target.value })}
              />
            </div>
            </div>
            <div className="toolbar" style={{ marginTop: 16 }}>
              <button className="button" type="submit">
                <Save size={17} /> Speichern
              </button>
            </div>
            {selected && !selected.costPositionId ? (
              <div className="panel subtle-panel" style={{ marginTop: 18 }}>
                <h3 className="panel-title">Zahlung ohne Beleg als Kostenposition übernehmen</h3>
                <div className="toolbar-panel">
                  <label className="toolbar-field" htmlFor="recurringCategory">
                    <span className="field-label">Kategorie</span>
                    <select
                      id="recurringCategory"
                      value={recurringCategoryId}
                      onChange={(event) => setRecurringCategoryId(event.target.value)}
                    >
                      <option value="">ohne Kategorie</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="toolbar-field" htmlFor="recurringType">
                    <span className="field-label">Rhythmus</span>
                    <select id="recurringType" value={recurringType} onChange={(event) => setRecurringType(event.target.value)}>
                      {(["MONTHLY", "QUARTERLY", "YEARLY", "IRREGULAR", "UNCLEAR"] as const).map((type) => (
                        <option key={type} value={type}>
                          {recurrenceTypeLabels[type]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button className="button secondary" disabled={isCreatingRecurring} onClick={createRecurringFromSelected} type="button">
                    <Plus size={17} /> Übernehmen
                  </button>
                  <span className="toolbar-note">
                    Erstellt eine wiederkehrende Kostenposition aus dieser Zahlung und verknüpft gleichartige Zahlungen.
                  </span>
                </div>
              </div>
            ) : null}
          </>
          ) : null}
        </form>
      </section>
    </div>
  );
}

function PaymentMatchCell({ payment }: { payment: Payment }) {
  const state = paymentMatchState(payment);
  const best = payment.paymentMatches.find((match) => match.status !== "REJECTED") ?? payment.paymentMatches[0];
  const tone = state === "MATCHED" ? "default" : state === "PROPOSED" || state === "AMBIGUOUS" ? "warn" : "muted";
  return (
    <>
      <StatusBadge tone={tone}>{matchLabels[state]}</StatusBadge>
      {best ? (
        <>
          <div className="small">
            {best.purchaseDocument.externalProviderName ?? best.purchaseDocument.source} · {best.purchaseDocument.title}
          </div>
          <div className="small">
            {formatMoney(best.purchaseDocument.amountCents, best.purchaseDocument.currency)} · {Math.round(best.score * 100)} %
          </div>
        </>
      ) : null}
    </>
  );
}

function paymentMatchState(payment: Payment) {
  if (payment.paymentMatches.some((match) => match.status === "MANUAL_CONFIRMED" || match.status === "AUTO_CONFIRMED")) {
    return "MATCHED";
  }
  if (payment.paymentMatches.some((match) => match.status === "AMBIGUOUS")) {
    return "AMBIGUOUS";
  }
  if (payment.paymentMatches.some((match) => match.status === "PROPOSED")) {
    return "PROPOSED";
  }
  return "UNMATCHED";
}

function paymentAmountDisplay(payment: Payment) {
  const absoluteAmount = Math.abs(payment.amountCents);
  if (absoluteAmount === 0) {
    return { label: formatMoney(0, payment.currency), tone: "neutral" };
  }

  const isIncoming = payment.paymentType === "INCOME" || payment.paymentType === "REFUND";
  return {
    label: `${isIncoming ? "+" : "-"} ${formatMoney(absoluteAmount, payment.currency)}`,
    tone: isIncoming ? "positive" : "negative",
  };
}

function paymentSearchText(payment: Payment) {
  const label = paymentTypeLabels[payment.paymentType as keyof typeof paymentTypeLabels] ?? payment.paymentType;
  const amount = paymentAmountDisplay(payment);
  return [
    payment.date,
    payment.description,
    payment.bankAccountRef,
    payment.provider?.name,
    payment.costPosition?.title,
    amount.label,
    formatMoney(Math.abs(payment.amountCents), payment.currency),
    label,
    payment.status,
    matchLabels[paymentMatchState(payment)],
    ...payment.paymentMatches.flatMap((match) => [
      match.status,
      match.purchaseDocument.title,
      match.purchaseDocument.source,
      match.purchaseDocument.externalProviderName,
      match.purchaseDocument.externalDocumentNumber,
    ]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("de-DE");
}
