"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, ChevronDown, ChevronRight, Link2, Plus, Save, Search, X } from "lucide-react";
import { api } from "@/lib/api-client";
import {
  confidenceStatusLabels,
  confidenceStatuses,
  lifecycleStatusLabels,
  lifecycleStatuses,
  limitationTypeLabels,
  limitationTypes,
  recurrenceClassLabels,
  recurrenceClasses,
  recurrenceTypeLabels,
  recurrenceTypes,
} from "@/lib/domain";
import { formatDate, toDateInput } from "@/lib/format";
import { centsToEuros, formatMoney } from "@/lib/money";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";

type Mode = "all" | "one-time" | "limited" | "due";

type Option = {
  id: string;
  name: string;
};

type CostPosition = {
  id: string;
  title: string;
  providerId?: string | null;
  categoryId?: string | null;
  householdScopeId?: string | null;
  amountCents: number;
  currency: string;
  recurrenceType: string;
  recurrenceCustomRule?: string | null;
  recurrenceClass: string;
  limitationType: string;
  paymentCountLimit?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  nextDueDate?: string | null;
  paymentMethod?: string | null;
  status: string;
  confidenceStatus: string;
  monthlyValueCents: number;
  yearlyValueCents: number;
  notes?: string | null;
  provider?: Option | null;
  category?: Option | null;
  householdScope?: Option | null;
  updatedAt: string;
};

type CostPositionDetail = CostPosition & {
  payments: Array<{
    id: string;
    date: string;
    amountCents: number;
    currency: string;
    description?: string | null;
    status: string;
    provider?: Option | null;
  }>;
  purchaseDocuments: Array<{
    id: string;
    title: string;
    source: string;
    externalProviderName?: string | null;
    externalDocumentNumber?: string | null;
    documentDate?: string | null;
    dueDate?: string | null;
    amountCents: number;
    currency: string;
    status: string;
    paymentMatches: Array<{ id: string; status: string; score: number; payment: { date: string; amountCents: number; currency: string } }>;
  }>;
  documents: Array<{
    id: string;
    fileName: string;
    documentType: string;
    documentGroup: string;
    documentDate?: string | null;
    amountCents?: number | null;
    currency: string;
  }>;
  versions: Array<{
    id: string;
    validFrom: string;
    validTo?: string | null;
    amountCents: number;
    recurrenceType: string;
    monthlyValueCents: number;
    yearlyValueCents: number;
    notes?: string | null;
  }>;
};

type FormState = {
  title: string;
  providerId: string;
  categoryId: string;
  householdScopeId: string;
  amount: string;
  currency: string;
  recurrenceType: string;
  recurrenceCustomRule: string;
  recurrenceClass: string;
  limitationType: string;
  paymentCountLimit: string;
  startDate: string;
  endDate: string;
  nextDueDate: string;
  paymentMethod: string;
  status: string;
  confidenceStatus: string;
  notes: string;
};

type Props = {
  mode?: Mode;
};

export function CostPositionWorkspace({ mode = "all" }: Props) {
  const [items, setItems] = useState<CostPosition[]>([]);
  const [mergeCandidates, setMergeCandidates] = useState<CostPosition[]>([]);
  const [providers, setProviders] = useState<Option[]>([]);
  const [categories, setCategories] = useState<Option[]>([]);
  const [scopes, setScopes] = useState<Option[]>([]);
  const [selected, setSelected] = useState<CostPosition | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<CostPositionDetail | null>(null);
  const [showConnections, setShowConnections] = useState(false);
  const [inlineConnectionsId, setInlineConnectionsId] = useState<string | null>(null);
  const [inlineConnectionsDetail, setInlineConnectionsDetail] = useState<CostPositionDetail | null>(null);
  const [form, setForm] = useState<FormState>(() => defaultForm(mode));
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("ACTIVE");
  const [recurrenceClassFilter, setRecurrenceClassFilter] = useState(mode === "one-time" ? "ONE_TIME" : mode === "all" ? "RECURRING" : "ALL");
  const [sort, setSort] = useState(mode === "due" ? "nextDueDate" : "monthlyValue");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mergeTargetId, setMergeTargetId] = useState("");
  const formRef = useRef<HTMLFormElement | null>(null);

  const pageCopy = pageText(mode);

  async function load(queryOverride = query) {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (queryOverride.trim()) params.set("q", queryOverride.trim());
      if (categoryFilter) params.set("categoryId", categoryFilter);
      if (statusFilter) params.set("status", statusFilter);
      if (recurrenceClassFilter !== "ALL") params.set("recurrenceClass", recurrenceClassFilter);
      if (mode === "limited") params.set("limited", "true");
      if (mode === "due") params.set("due", "true");
      params.set("sort", sort);
      params.set("direction", sort === "nextDueDate" || sort === "title" ? "asc" : "desc");

      const [nextItems, nextMergeCandidates, nextProviders, nextCategories, nextScopes] = await Promise.all([
        api<CostPosition[]>(`/api/cost-positions?${params}`),
        api<CostPosition[]>("/api/cost-positions?sort=title&direction=asc"),
        api<Option[]>("/api/providers"),
        api<Option[]>("/api/categories"),
        api<Option[]>("/api/household-scopes"),
      ]);

      setItems(nextItems);
      setMergeCandidates(nextMergeCandidates);
      setProviders(nextProviders);
      setCategories(nextCategories);
      setScopes(nextScopes);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, sort, categoryFilter, statusFilter, recurrenceClassFilter]);

  useEffect(() => {
    const urlQuery = getUrlSearchParam("q");
    if (urlQuery) {
      setQuery(urlQuery);
      void load(urlQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totals = useMemo(
    () => ({
      monthly: items.reduce((sum, item) => sum + item.monthlyValueCents, 0),
      yearly: items.reduce((sum, item) => sum + item.yearlyValueCents, 0),
      amount: items.reduce((sum, item) => sum + item.amountCents, 0),
    }),
    [items],
  );

  async function edit(item: CostPosition) {
    setSelected(item);
    setSelectedDetail(null);
    setShowConnections(false);
    setIsFormOpen(true);
    setForm({
      title: item.title,
      providerId: item.providerId ?? "",
      categoryId: item.categoryId ?? "",
      householdScopeId: item.householdScopeId ?? "",
      amount: centsToEuros(item.amountCents).toFixed(2).replace(".", ","),
      currency: item.currency,
      recurrenceType: item.recurrenceType,
      recurrenceCustomRule: item.recurrenceCustomRule ?? "",
      recurrenceClass: item.recurrenceClass,
      limitationType: item.limitationType,
      paymentCountLimit: item.paymentCountLimit?.toString() ?? "",
      startDate: toDateInput(item.startDate),
      endDate: toDateInput(item.endDate),
      nextDueDate: toDateInput(item.nextDueDate),
      paymentMethod: item.paymentMethod ?? "",
      status: item.status,
      confidenceStatus: item.confidenceStatus,
      notes: item.notes ?? "",
    });
    setMergeTargetId("");
    window.setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  }

  function reset() {
    setSelected(null);
    setSelectedDetail(null);
    setShowConnections(false);
    setForm(defaultForm(mode));
    setMessage(null);
    setError(null);
    setIsFormOpen(false);
    setMergeTargetId("");
  }

  function createNew() {
    setSelected(null);
    setForm(defaultForm(mode));
    setMessage(null);
    setError(null);
    setIsFormOpen(true);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const payload = {
      ...form,
      paymentCountLimit: form.paymentCountLimit ? Number(form.paymentCountLimit) : null,
    };

    try {
      if (selected) {
        await api(`/api/cost-positions/${selected.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        setMessage("Kostenposition aktualisiert.");
      } else {
        await api("/api/cost-positions", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setMessage("Kostenposition angelegt.");
      }
      reset();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function endSelected() {
    if (!selected) return;
    try {
      await api(`/api/cost-positions/${selected.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: "ENDED",
          endDate: toDateInput(new Date()),
        }),
      });
      setMessage("Kostenposition beendet.");
      reset();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function mergeSelected() {
    if (!selected || !mergeTargetId) return;
    try {
      const result = await api<{ moved: { payments: number; documents: number; importSuggestions: number; purchaseDocuments: number } }>(
        `/api/cost-positions/${selected.id}/merge`,
        {
          method: "POST",
          body: JSON.stringify({ targetCostPositionId: mergeTargetId }),
        },
      );
      setMessage(
        `Kostenposition zusammengeführt. Verschoben: ${result.moved.payments} Zahlung(en), ${result.moved.documents} Dokument(e), ${result.moved.purchaseDocuments} Ausgabenbeleg(e).`,
      );
      reset();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function toggleConnections() {
    if (!selected) return;
    if (showConnections) {
      setShowConnections(false);
      return;
    }
    setShowConnections(true);
    if (selectedDetail) return;
    try {
      setSelectedDetail(await api<CostPositionDetail>(`/api/cost-positions/${selected.id}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function toggleInlineConnections(item: CostPosition) {
    if (inlineConnectionsId === item.id) {
      setInlineConnectionsId(null);
      setInlineConnectionsDetail(null);
      return;
    }
    setInlineConnectionsId(item.id);
    setInlineConnectionsDetail(null);
    try {
      setInlineConnectionsDetail(await api<CostPositionDetail>(`/api/cost-positions/${item.id}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="page">
      <PageHeader
        title={pageCopy.title}
        subtitle={pageCopy.subtitle}
        actions={
          <>
            <button className="button secondary" type="button" onClick={createNew} title="Neue Position">
              <Plus size={17} /> Neu
            </button>
            <button className="button secondary" type="button" onClick={() => void load()} title="Liste aktualisieren">
              <Search size={17} /> Aktualisieren
            </button>
          </>
        }
      />

      <section className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Positionen in dieser Sicht</div>
          <div className="stat-value">{items.length}</div>
          <div className="stat-note">{loading ? "Lade ..." : "gefilterter Bestand"}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Monatswert</div>
          <div className="stat-value">{formatMoney(totals.monthly)}</div>
          <div className="stat-note">einmalige Positionen zählen hier 0</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Jahreswert</div>
          <div className="stat-value">{formatMoney(totals.yearly)}</div>
          <div className="stat-note">berechnet aus Zahlungsrhythmus</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Betragssumme</div>
          <div className="stat-value">{formatMoney(totals.amount)}</div>
          <div className="stat-note">Originalbeträge der Positionen</div>
        </div>
      </section>

      {error ? <div className="error">{error}</div> : null}
      {message ? <div className="success">{message}</div> : null}

      <section className="workspace">
        <div className="grid">
          <div className="panel">
            <div className="toolbar">
              <div className="field" style={{ minWidth: 260 }}>
                <label htmlFor="search">Suche</label>
                <input
                  id="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void load();
                  }}
                  placeholder="Anbieter, Bezeichnung, Notiz"
                />
              </div>
              <div className="field">
                <label htmlFor="categoryFilter">Kategorie</label>
                <select
                  id="categoryFilter"
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value)}
                >
                  <option value="">Alle Kategorien</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="statusFilter">Status</label>
                <select id="statusFilter" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                  <option value="ACTIVE">Aktiv</option>
                  <option value="INACTIVE">Inaktiv</option>
                  <option value="ENDED">Beendet / ersetzt</option>
                  <option value="ALL">Alle</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="recurrenceClassFilter">Wiederkehr</label>
                <select
                  id="recurrenceClassFilter"
                  value={recurrenceClassFilter}
                  onChange={(event) => setRecurrenceClassFilter(event.target.value)}
                >
                  <option value="RECURRING">Wiederkehrend</option>
                  <option value="ONE_TIME">Einmalig</option>
                  <option value="UNCLEAR">Unklar</option>
                  <option value="ALL">Alle</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="sort">Sortierung</label>
                <select id="sort" value={sort} onChange={(event) => setSort(event.target.value)}>
                  <option value="monthlyValue">Monatswert absteigend</option>
                  <option value="yearlyValue">Jahreswert absteigend</option>
                  <option value="amount">Betrag absteigend</option>
                  <option value="nextDueDate">Fälligkeit aufsteigend</option>
                  <option value="provider">Anbieter</option>
                  <option value="category">Kategorie</option>
                  <option value="title">Bezeichnung</option>
                </select>
              </div>
              <button className="button" type="button" onClick={() => void load()} title="Suchen">
                <Search size={17} /> Suchen
              </button>
              {categoryFilter || statusFilter !== "ACTIVE" || recurrenceClassFilter !== (mode === "one-time" ? "ONE_TIME" : mode === "all" ? "RECURRING" : "ALL") ? (
                <button
                  className="button secondary"
                  type="button"
                  onClick={() => {
                    setCategoryFilter("");
                    setStatusFilter("ACTIVE");
                    setRecurrenceClassFilter(mode === "one-time" ? "ONE_TIME" : mode === "all" ? "RECURRING" : "ALL");
                  }}
                  title="Filter zurücksetzen"
                >
                  <X size={17} /> Filter löschen
                </button>
              ) : null}
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Bezeichnung</th>
                  <th>Anbieter</th>
                  <th>Kategorie</th>
                  <th>Betrag</th>
                  <th>Monat</th>
                  <th>Jahr</th>
                  <th>Fälligkeit</th>
                  <th>Status</th>
                  <th>Aktion</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <Fragment key={item.id}>
                    <tr>
                      <td>
                        <strong>{item.title}</strong>
                        <div className="small">
                          {recurrenceClassLabels[item.recurrenceClass as keyof typeof recurrenceClassLabels]} ·{" "}
                          {limitationTypeLabels[item.limitationType as keyof typeof limitationTypeLabels]}
                        </div>
                      </td>
                      <td>{item.provider?.name ?? "-"}</td>
                      <td>{item.category?.name ?? "Unklar"}</td>
                      <td>{formatMoney(item.amountCents, item.currency)}</td>
                      <td>{formatMoney(item.monthlyValueCents, item.currency)}</td>
                      <td>{formatMoney(item.yearlyValueCents, item.currency)}</td>
                      <td>{formatDate(item.nextDueDate)}</td>
                      <td>
                        <StatusBadge tone={badgeTone(item.confidenceStatus)}>
                          {confidenceStatusLabels[item.confidenceStatus as keyof typeof confidenceStatusLabels] ??
                            item.confidenceStatus}
                        </StatusBadge>
                      </td>
                      <td>
                        <div className="toolbar">
                          <button className="button secondary" type="button" onClick={() => void edit(item)}>
                            Bearbeiten
                          </button>
                          <button className="button secondary" type="button" onClick={() => void toggleInlineConnections(item)}>
                            <Link2 size={16} /> {inlineConnectionsId === item.id ? "Ausblenden" : "Verknüpfungen"}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {inlineConnectionsId === item.id ? (
                      <tr>
                        <td colSpan={9}>
                          <CostPositionConnections detail={inlineConnectionsDetail} />
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                ))}
                {!items.length ? (
                  <tr>
                    <td colSpan={9}>{loading ? "Lade Daten ..." : "Keine passenden Positionen vorhanden."}</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
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
              <span className="panel-title">{selected ? "Kostenposition bearbeiten" : pageCopy.formTitle}</span>
            </span>
            <span className="small">{isFormOpen ? "Einklappen" : "Manuell erfassen"}</span>
          </button>
          {isFormOpen ? (
          <>
            <div className="form-grid">
            <div className="field full">
              <label htmlFor="title">Bezeichnung</label>
              <input
                id="title"
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="amount">Betrag</label>
              <input
                id="amount"
                inputMode="decimal"
                value={form.amount}
                onChange={(event) => setForm({ ...form, amount: event.target.value })}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="currency">Währung</label>
              <input
                id="currency"
                value={form.currency}
                onChange={(event) => setForm({ ...form, currency: event.target.value.toUpperCase() })}
              />
            </div>
            <div className="field">
              <label htmlFor="providerId">Anbieter</label>
              <select
                id="providerId"
                value={form.providerId}
                onChange={(event) => setForm({ ...form, providerId: event.target.value })}
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
              <label htmlFor="categoryId">Kategorie</label>
              <select
                id="categoryId"
                value={form.categoryId}
                onChange={(event) => setForm({ ...form, categoryId: event.target.value })}
              >
                <option value="">Unklar</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="recurrenceClass">Wiederkehr</label>
              <select
                id="recurrenceClass"
                value={form.recurrenceClass}
                onChange={(event) => setForm({ ...form, recurrenceClass: event.target.value })}
              >
                {recurrenceClasses.map((value) => (
                  <option key={value} value={value}>
                    {recurrenceClassLabels[value]}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="recurrenceType">Zahlungsrhythmus</label>
              <select
                id="recurrenceType"
                value={form.recurrenceType}
                onChange={(event) => setForm({ ...form, recurrenceType: event.target.value })}
              >
                {recurrenceTypes.map((value) => (
                  <option key={value} value={value}>
                    {recurrenceTypeLabels[value]}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="limitationType">Befristung</label>
              <select
                id="limitationType"
                value={form.limitationType}
                onChange={(event) => setForm({ ...form, limitationType: event.target.value })}
              >
                {limitationTypes.map((value) => (
                  <option key={value} value={value}>
                    {limitationTypeLabels[value]}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="paymentCountLimit">Anzahl Raten</label>
              <input
                id="paymentCountLimit"
                inputMode="numeric"
                value={form.paymentCountLimit}
                onChange={(event) => setForm({ ...form, paymentCountLimit: event.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="startDate">Beginn</label>
              <input
                id="startDate"
                type="date"
                value={form.startDate}
                onChange={(event) => setForm({ ...form, startDate: event.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="endDate">Ende</label>
              <input
                id="endDate"
                type="date"
                value={form.endDate}
                onChange={(event) => setForm({ ...form, endDate: event.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="nextDueDate">Nächste Fälligkeit</label>
              <input
                id="nextDueDate"
                type="date"
                value={form.nextDueDate}
                onChange={(event) => setForm({ ...form, nextDueDate: event.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="householdScopeId">Haushaltsbezug</label>
              <select
                id="householdScopeId"
                value={form.householdScopeId}
                onChange={(event) => setForm({ ...form, householdScopeId: event.target.value })}
              >
                <option value="">ohne Bezug</option>
                {scopes.map((scope) => (
                  <option key={scope.id} value={scope.id}>
                    {scope.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="paymentMethod">Zahlungsart</label>
              <input
                id="paymentMethod"
                value={form.paymentMethod}
                onChange={(event) => setForm({ ...form, paymentMethod: event.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="status">Lebenszyklus</label>
              <select
                id="status"
                value={form.status}
                onChange={(event) => setForm({ ...form, status: event.target.value })}
              >
                {lifecycleStatuses.map((value) => (
                  <option key={value} value={value}>
                    {lifecycleStatusLabels[value]}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="confidenceStatus">Prüfstatus</label>
              <select
                id="confidenceStatus"
                value={form.confidenceStatus}
                onChange={(event) => setForm({ ...form, confidenceStatus: event.target.value })}
              >
                {confidenceStatuses.map((value) => (
                  <option key={value} value={value}>
                    {confidenceStatusLabels[value]}
                  </option>
                ))}
              </select>
            </div>
            <div className="field full">
              <label htmlFor="recurrenceCustomRule">Benutzerdefinierter Rhythmus als JSON</label>
              <input
                id="recurrenceCustomRule"
                value={form.recurrenceCustomRule}
                onChange={(event) => setForm({ ...form, recurrenceCustomRule: event.target.value })}
                placeholder='z. B. {"paymentsPerYear":10}'
              />
            </div>
            <div className="field full">
              <label htmlFor="notes">Notiz</label>
              <textarea
                id="notes"
                value={form.notes}
                onChange={(event) => setForm({ ...form, notes: event.target.value })}
              />
            </div>
            </div>

            <div className="toolbar" style={{ marginTop: 16 }}>
              <button className="button" type="submit" title="Speichern">
                <Save size={17} /> Speichern
              </button>
              {selected ? (
                <button className="button secondary" type="button" onClick={endSelected} title="Position beenden">
                  <CheckCircle2 size={17} /> Beenden
                </button>
              ) : null}
              <button className="button secondary" type="button" onClick={reset} title="Formular leeren">
                <X size={17} /> Zurücksetzen
              </button>
              {selected ? (
                <button className="button secondary" type="button" onClick={toggleConnections} title="Verknüpfungen anzeigen">
                  <Link2 size={17} /> {showConnections ? "Verknüpfungen ausblenden" : "Verknüpfungen anzeigen"}
                </button>
              ) : null}
            </div>
            {selected && showConnections ? <CostPositionConnections detail={selectedDetail} /> : null}
            {selected ? (
              <div className="panel subtle-panel" style={{ marginTop: 18 }}>
                <h3 className="panel-title">Kostenposition zusammenführen</h3>
                <div className="toolbar-panel">
                  <label className="toolbar-field" htmlFor="mergeTarget">
                    <span className="field-label">Ziel-Kostenposition</span>
                    <select id="mergeTarget" value={mergeTargetId} onChange={(event) => setMergeTargetId(event.target.value)}>
                      <option value="">Ziel auswählen</option>
                      {mergeCandidates
                        .filter(
                          (item) =>
                            item.id !== selected.id &&
                            ["ACTIVE", "ENDED"].includes(item.status) &&
                            !["IGNORED", "OBSOLETE", "REPLACED"].includes(item.confidenceStatus),
                        )
                        .map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.title} · {item.provider?.name ?? "-"} · {formatMoney(item.amountCents, item.currency)}
                          </option>
                        ))}
                    </select>
                  </label>
                  <button className="button secondary" disabled={!mergeTargetId} onClick={mergeSelected} type="button">
                    Zusammenführen
                  </button>
                  <span className="toolbar-note">
                    Hängt Zahlungen, Dokumente und Ausgabenbelege um und löscht diese Dublette danach.
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

function CostPositionConnections({ detail }: { detail: CostPositionDetail | null }) {
  if (!detail) {
    return (
      <div className="panel subtle-panel" style={{ marginTop: 18 }}>
        <h3 className="panel-title">Verknüpfungen</h3>
        <div className="small">Lade Verknüpfungen ...</div>
      </div>
    );
  }

  return (
    <div className="panel subtle-panel" style={{ marginTop: 18 }}>
      <h3 className="panel-title">Verknüpfungen</h3>
      <div className="connection-grid">
        <ConnectionList title={`Ausgabenbelege (${detail.purchaseDocuments.length})`}>
          {detail.purchaseDocuments.length ? (
            detail.purchaseDocuments.map((document) => (
              <li key={document.id}>
                <strong>{document.title}</strong>
                <div className="small">
                  {document.externalProviderName ?? document.source} · {formatDate(document.documentDate ?? document.dueDate)} ·{" "}
                  {formatMoney(document.amountCents, document.currency)}
                </div>
                <div className="small">
                  {document.externalDocumentNumber ?? "ohne Belegnummer"} · {document.status}
                  {document.paymentMatches.length ? ` · ${document.paymentMatches.length} Zahlungsabgleich(e)` : ""}
                </div>
              </li>
            ))
          ) : (
            <li className="small">Keine Ausgabenbelege verknüpft.</li>
          )}
        </ConnectionList>

        <ConnectionList title={`Zahlungen (${detail.payments.length})`}>
          {detail.payments.length ? (
            detail.payments.map((payment) => (
              <li key={payment.id}>
                <strong>{formatMoney(payment.amountCents, payment.currency)}</strong>
                <div className="small">
                  {formatDate(payment.date)} · {payment.provider?.name ?? "-"} · {payment.status}
                </div>
                <div className="small">{payment.description ?? "ohne Beschreibung"}</div>
              </li>
            ))
          ) : (
            <li className="small">Keine Zahlungen verknüpft.</li>
          )}
        </ConnectionList>

        <ConnectionList title={`Dokumente (${detail.documents.length})`}>
          {detail.documents.length ? (
            detail.documents.map((document) => (
              <li key={document.id}>
                <strong>{document.fileName}</strong>
                <div className="small">
                  {document.documentType} · {document.documentGroup} · {formatDate(document.documentDate)}
                  {document.amountCents !== null && document.amountCents !== undefined
                    ? ` · ${formatMoney(document.amountCents, document.currency)}`
                    : ""}
                </div>
              </li>
            ))
          ) : (
            <li className="small">Keine Dokumente verknüpft.</li>
          )}
        </ConnectionList>

        <ConnectionList title={`Historie (${detail.versions.length})`}>
          {detail.versions.length ? (
            detail.versions.map((version) => (
              <li key={version.id}>
                <strong>{formatDate(version.validFrom)}</strong>
                <div className="small">
                  {formatMoney(version.amountCents)} · {recurrenceTypeLabels[version.recurrenceType as keyof typeof recurrenceTypeLabels] ?? version.recurrenceType} · Monat{" "}
                  {formatMoney(version.monthlyValueCents)} · Jahr {formatMoney(version.yearlyValueCents)}
                </div>
                {version.notes ? <div className="small">{version.notes}</div> : null}
              </li>
            ))
          ) : (
            <li className="small">Keine Historie vorhanden.</li>
          )}
        </ConnectionList>
      </div>
    </div>
  );
}

function ConnectionList({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="field-label">{title}</h4>
      <ul className="connection-list">{children}</ul>
    </div>
  );
}

function defaultForm(mode: Mode): FormState {
  const oneTime = mode === "one-time";
  const limited = mode === "limited";

  return {
    title: "",
    providerId: "",
    categoryId: "",
    householdScopeId: "",
    amount: "",
    currency: "EUR",
    recurrenceType: oneTime ? "ONE_TIME" : "MONTHLY",
    recurrenceCustomRule: "",
    recurrenceClass: oneTime ? "ONE_TIME" : "RECURRING",
    limitationType: oneTime ? "NOT_APPLICABLE" : limited ? "UNTIL_DATE" : "UNLIMITED",
    paymentCountLimit: "",
    startDate: "",
    endDate: "",
    nextDueDate: "",
    paymentMethod: "",
    status: "ACTIVE",
    confidenceStatus: "MANUALLY_CONFIRMED",
    notes: "",
  };
}

function pageText(mode: Mode) {
  if (mode === "one-time") {
    return {
      title: "Einmalige Ausgaben",
      subtitle: "Einmalige Ausgaben werden erfasst und bleiben auswertbar, zählen aber nicht automatisch in die laufenden Fixkosten.",
      formTitle: "Einmalige Ausgabe erfassen",
    };
  }
  if (mode === "limited") {
    return {
      title: "Befristete Kosten",
      subtitle: "Befristung ist eine Eigenschaft: regelmäßige Positionen können bis Datum oder nach Anzahl von Zahlungen begrenzt sein.",
      formTitle: "Befristete Kostenposition erfassen",
    };
  }
  if (mode === "due") {
    return {
      title: "Fälligkeiten",
      subtitle: "Alle Positionen mit nächster Fälligkeit. Die Sortierung steht standardmäßig auf dem frühesten Datum.",
      formTitle: "Position mit Fälligkeit erfassen",
    };
  }
  return {
    title: "Kostenpositionen",
    subtitle: "Regelmäßige, einmalige, befristete und unklare Positionen werden zuerst gespeichert und erst nach Klassifikation auswertungswirksam.",
    formTitle: "Kostenposition erfassen",
  };
}

function badgeTone(status: string) {
  if (status === "NEEDS_REVIEW" || status === "AUTO_DETECTED" || status === "ESTIMATED") {
    return "warn" as const;
  }
  if (status === "IGNORED" || status === "OBSOLETE" || status === "REPLACED") {
    return "muted" as const;
  }
  return "default" as const;
}

function getUrlSearchParam(key: string) {
  if (typeof window === "undefined") {
    return "";
  }
  return new URLSearchParams(window.location.search).get(key)?.trim() ?? "";
}
