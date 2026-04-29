"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronDown, ChevronRight, Plus, Save, Search, X } from "lucide-react";
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
  const [providers, setProviders] = useState<Option[]>([]);
  const [categories, setCategories] = useState<Option[]>([]);
  const [scopes, setScopes] = useState<Option[]>([]);
  const [selected, setSelected] = useState<CostPosition | null>(null);
  const [form, setForm] = useState<FormState>(() => defaultForm(mode));
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sort, setSort] = useState(mode === "due" ? "nextDueDate" : "monthlyValue");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const pageCopy = pageText(mode);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (categoryFilter) params.set("categoryId", categoryFilter);
      if (mode === "one-time") params.set("recurrenceClass", "ONE_TIME");
      if (mode === "limited") params.set("limited", "true");
      if (mode === "due") params.set("due", "true");
      params.set("sort", sort);
      params.set("direction", sort === "nextDueDate" || sort === "title" ? "asc" : "desc");

      const [nextItems, nextProviders, nextCategories, nextScopes] = await Promise.all([
        api<CostPosition[]>(`/api/cost-positions?${params}`),
        api<Option[]>("/api/providers"),
        api<Option[]>("/api/categories"),
        api<Option[]>("/api/household-scopes"),
      ]);

      setItems(nextItems);
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
  }, [mode, sort, categoryFilter]);

  const totals = useMemo(
    () => ({
      monthly: items.reduce((sum, item) => sum + item.monthlyValueCents, 0),
      yearly: items.reduce((sum, item) => sum + item.yearlyValueCents, 0),
      amount: items.reduce((sum, item) => sum + item.amountCents, 0),
    }),
    [items],
  );

  function edit(item: CostPosition) {
    setSelected(item);
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
  }

  function reset() {
    setSelected(null);
    setForm(defaultForm(mode));
    setMessage(null);
    setError(null);
    setIsFormOpen(false);
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
            <button className="button secondary" type="button" onClick={load} title="Liste aktualisieren">
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
              <button className="button" type="button" onClick={load} title="Suchen">
                <Search size={17} /> Suchen
              </button>
              {categoryFilter ? (
                <button
                  className="button secondary"
                  type="button"
                  onClick={() => setCategoryFilter("")}
                  title="Kategoriefilter zurücksetzen"
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
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr className="row-clickable" key={item.id} onClick={() => edit(item)}>
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
                  </tr>
                ))}
                {!items.length ? (
                  <tr>
                    <td colSpan={8}>{loading ? "Lade Daten ..." : "Keine passenden Positionen vorhanden."}</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
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
            </div>
          </>
          ) : null}
        </form>
      </section>
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
