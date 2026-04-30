"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, RefreshCw } from "lucide-react";
import { api } from "@/lib/api-client";
import { formatDate } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";

type DashboardData = {
  totals: {
    monthlyFixedCents: number;
    yearlyFixedCents: number;
    fixedCostCount: number;
    activeCount: number;
    limitedCount: number;
    oneTimeCurrentYearCount: number;
    openSuggestions: number;
    unclearPositions: number;
    oneTimeCurrentYearCents: number;
  };
  period: {
    mode: "year" | "month";
    year: number;
    month: number | null;
    start: string;
    end: string;
    label: string;
    includeRecurring: boolean;
    availableYears: number[];
  };
  spending: {
    oneTimeTotalCents: number;
    recurringActualCents: number;
    totalCents: number;
    oneTimeGroupCount: number;
    recurringGroupCount: number;
    oneTimeItemCount: number;
    recurringPaymentCount: number;
    groups: SpendingGroup[];
  };
  topCosts: CostRow[];
  byCategory: {
    category: string;
    monthlyValueCents: number;
    yearlyValueCents: number;
    periodValueCents: number;
    positionCount: number;
  }[];
  dueItems: ForecastRow[];
  oneTimeCosts: CostRow[];
  recentExpenses: ExpenseMonthRow[];
  lastReport?: { generatedAt: string; filePath: string } | null;
  lastBackup?: { generatedAt: string; filePath: string } | null;
};

type CostRow = {
  id: string;
  title: string;
  amountCents: number;
  monthlyValueCents: number;
  yearlyValueCents: number;
  currency: string;
  recurrenceType: string;
  confidenceStatus: string;
  nextDueDate?: string | null;
  provider?: { name: string } | null;
  category?: { name: string } | null;
};

type SpendingGroup = {
  key: string;
  kind: "ONE_TIME" | "RECURRING";
  title: string;
  category: string;
  costPositionId: string | null;
  totalCents: number;
  itemCount: number;
  documentCount: number;
  paymentCount: number;
  currency: string;
  confidenceStatus: string | null;
  items: SpendingItem[];
};

type SpendingItem = {
  id: string;
  type: "PURCHASE_DOCUMENT" | "PAYMENT";
  title: string;
  date: string;
  amountCents: number;
  currency: string;
  providerName: string | null;
  status: string;
};

type ForecastRow = {
  id: string;
  title: string;
  amountCents: number;
  currency: string;
  expectedDate?: string | null;
  paymentMethod: string;
  providerName?: string | null;
};

type ForecastMonthGroup = {
  key: string;
  label: string;
  paymentCount: number;
  totalCents: number;
  currency: string;
};

type ExpenseMonthRow = {
  key: string;
  month: string;
  totalCents: number;
  paymentCount: number;
  currency: string;
};

const currentDate = new Date();
const monthLabels = Array.from({ length: 12 }, (_, index) => {
  const date = new Date(2026, index, 1);
  return {
    value: index + 1,
    shortLabel: new Intl.DateTimeFormat("de-DE", { month: "short" }).format(date),
    longLabel: new Intl.DateTimeFormat("de-DE", { month: "long" }).format(date),
  };
});

export function DashboardView() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [periodMode, setPeriodMode] = useState<"year" | "month">("year");
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [includeRecurring, setIncludeRecurring] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        period: periodMode,
        year: String(selectedYear),
        includeRecurring: String(includeRecurring),
      });
      if (periodMode === "month") {
        params.set("month", String(selectedMonth));
      }

      setData(await api<DashboardData>(`/api/dashboard?${params.toString()}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    setExpandedGroups(new Set());
  }, [periodMode, selectedYear, selectedMonth, includeRecurring]);

  const maxCategory = useMemo(
    () => Math.max(1, ...(data?.byCategory.map((row) => Math.abs(row.periodValueCents)) ?? [1])),
    [data],
  );
  const dueMonths = useMemo(() => groupForecastByMonth(data?.dueItems ?? []), [data?.dueItems]);
  const maxSpending = useMemo(
    () => Math.max(1, ...(data?.spending.groups.map((row) => Math.abs(row.totalCents)) ?? [1])),
    [data?.spending.groups],
  );
  const availableYears = data?.period.availableYears.length ? data.period.availableYears : [selectedYear];

  function toggleGroup(key: string) {
    setExpandedGroups((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  return (
    <div className="page">
      <PageHeader
        title="Dashboard"
        subtitle="Fixkosten bleiben als laufende Belastung sichtbar; einmalige Ausgaben werden für den gewählten Zeitraum nach Kostenposition-Gruppen ausgewertet."
        actions={
          <button className="button secondary" onClick={load} type="button" title="Dashboard aktualisieren">
            <RefreshCw size={17} /> Aktualisieren
          </button>
        }
      />

      {error ? <div className="error">{error}</div> : null}

      <section className="panel dashboard-filter-panel">
        <div className="toolbar-panel">
          <div className="toolbar-group">
            <div className="field-label">Zeitraum</div>
            <div className="segmented-control">
              <button className={periodMode === "year" ? "active" : ""} onClick={() => setPeriodMode("year")} type="button">
                Jahr
              </button>
              <button className={periodMode === "month" ? "active" : ""} onClick={() => setPeriodMode("month")} type="button">
                Monat
              </button>
            </div>
          </div>

          <div className="toolbar-group">
            <div className="field-label">Jahr</div>
            <div className="button-row">
              {availableYears.map((year) => (
                <button
                  className={`chip-button${selectedYear === year ? " active" : ""}`}
                  key={year}
                  onClick={() => setSelectedYear(year)}
                  type="button"
                >
                  {year}
                </button>
              ))}
            </div>
          </div>

          {periodMode === "month" ? (
            <div className="toolbar-group month-picker">
              <div className="field-label">Monat</div>
              <div className="button-row">
                {monthLabels.map((month) => (
                  <button
                    className={`chip-button${selectedMonth === month.value ? " active" : ""}`}
                    key={month.value}
                    onClick={() => setSelectedMonth(month.value)}
                    type="button"
                    title={month.longLabel}
                  >
                    {month.shortLabel}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <label className="toggle-field">
            <input
              checked={includeRecurring}
              onChange={(event) => setIncludeRecurring(event.target.checked)}
              type="checkbox"
            />
            <span>Wiederkehrende Ist-Zahlungen einbeziehen</span>
          </label>
        </div>
      </section>

      <section className="year-overview-grid">
        <div className="grid">
          <div className="fixed-cost-card">
            <div>
              <div className="stat-label">
                {data?.period.mode === "year" ? "Ø monatliche Fixkosten im Zeitraum" : "Erwartete Fixkosten im Monat"}
              </div>
              <div className="fixed-cost-value">{formatMoney(data?.totals.monthlyFixedCents ?? 0)}</div>
              <div className="stat-note">
                aus {data?.totals.fixedCostCount ?? 0} geprüften Fixkostenpositionen in {data?.period.label ?? "diesem Zeitraum"};
                Zeitraumssumme {formatMoney(data?.totals.yearlyFixedCents ?? 0)}
              </div>
            </div>
            <div className="fixed-cost-facts">
              <div>
                <span>Aktive Positionen</span>
                <strong>{data?.totals.activeCount ?? 0}</strong>
              </div>
              <div>
                <span>Befristet</span>
                <strong>{data?.totals.limitedCount ?? 0}</strong>
              </div>
              <div>
                <span>Prüfung offen</span>
                <strong>{(data?.totals.openSuggestions ?? 0) + (data?.totals.unclearPositions ?? 0)}</strong>
              </div>
            </div>
          </div>

          <section className="panel">
            <h2 className="panel-title">Fixkosten nach Gruppen</h2>
            {data?.byCategory.length ? (
              data.byCategory.map((row) => (
                <div className="bar-row category-row" key={row.category}>
                  <div>
                    <strong>{row.category}</strong>
                    <div className="small">{row.positionCount} Positionen</div>
                  </div>
                  <div className="bar-track" aria-hidden="true">
                    <div
                      className="bar-fill"
                      style={{ width: `${Math.max(4, (Math.abs(row.periodValueCents) / maxCategory) * 100)}%` }}
                    />
                  </div>
                  <div className="amount-stack">
                    <strong>{formatMoney(row.periodValueCents)}</strong>
                    <span>{data?.period.mode === "year" ? `Ø ${formatMoney(row.monthlyValueCents)} / Monat` : data?.period.label}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty">{loading ? "Lade Daten ..." : "Noch keine geprüften Fixkosten vorhanden."}</div>
            )}
          </section>
        </div>

        <section className="panel">
          <h2 className="panel-title">Kosten der letzten 12 Monate</h2>
          <div className="grid">
            {(data?.recentExpenses ?? []).map((month) => (
              <div className="expense-month-row" key={month.key}>
                <div>
                  <strong>{formatMonth(new Date(month.month))}</strong>
                  <div className="small">{month.paymentCount} Zahlungen</div>
                </div>
                <span>{formatMoney(month.totalCents, month.currency)}</span>
              </div>
            ))}
            {!data?.recentExpenses.length ? (
              <div className="empty">{loading ? "Lade Daten ..." : "Noch keine gebuchten Ausgaben vorhanden."}</div>
            ) : null}
          </div>
        </section>
      </section>

      <section className="panel spending-board">
        <div className="section-head">
          <div>
            <h2 className="panel-title">Ausgaben nach Gruppen</h2>
            <div className="small">
              {data?.period.label ?? "Zeitraum"} · {includeRecurring ? "Einmalige Ausgaben und wiederkehrende Ist-Zahlungen" : "Nur einmalige Ausgaben"}
            </div>
          </div>
          <div className="spending-summary">
            <div>
              <span>Einmalig</span>
              <strong>{formatMoney(data?.spending.oneTimeTotalCents ?? 0)}</strong>
            </div>
            {includeRecurring ? (
              <>
                <div>
                  <span>Wiederkehrend</span>
                  <strong>{formatMoney(data?.spending.recurringActualCents ?? 0)}</strong>
                </div>
                <div>
                  <span>Gesamt</span>
                  <strong>{formatMoney(data?.spending.totalCents ?? 0)}</strong>
                </div>
              </>
            ) : null}
          </div>
        </div>

        <div className="table-wrap spending-table-wrap">
          <table className="spending-table">
            <thead>
              <tr>
                <th>Gruppe</th>
                <th>Kategorie</th>
                <th>Art</th>
                <th>Belege/Zahlungen</th>
                <th>Summe</th>
                <th>Anteil</th>
              </tr>
            </thead>
            <tbody>
              {data?.spending.groups.map((group) => {
                const expanded = expandedGroups.has(group.key);
                return (
                  <Fragment key={group.key}>
                    <tr className="row-clickable" onClick={() => toggleGroup(group.key)}>
                      <td>
                        <button className="row-toggle" type="button" aria-expanded={expanded}>
                          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          <span>{group.title}</span>
                        </button>
                        {group.confidenceStatus === "NEEDS_REVIEW" ? (
                          <div className="small">
                            <StatusBadge tone="warn">Prüfung offen</StatusBadge>
                          </div>
                        ) : null}
                      </td>
                      <td>{group.category}</td>
                      <td>{group.kind === "ONE_TIME" ? "Einmalig" : "Wiederkehrend"}</td>
                      <td>
                        {group.documentCount ? `${group.documentCount} Belege` : null}
                        {group.documentCount && group.paymentCount ? " · " : null}
                        {group.paymentCount ? `${group.paymentCount} Zahlungen` : null}
                      </td>
                      <td className="money">{formatMoney(group.totalCents, group.currency)}</td>
                      <td>
                        <div className="bar-track" aria-hidden="true">
                          <div
                            className={group.kind === "ONE_TIME" ? "bar-fill" : "bar-fill recurring"}
                            style={{ width: `${Math.max(4, (Math.abs(group.totalCents) / maxSpending) * 100)}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                    {expanded ? (
                      <tr className="spending-detail-row">
                        <td colSpan={6}>
                          <div className="spending-detail-list">
                            {group.items.map((item) => (
                              <div className="spending-detail-item" key={`${item.type}:${item.id}`}>
                                <div>
                                  <strong>{item.title}</strong>
                                  <div className="small">
                                    {formatDate(item.date)} · {item.providerName ?? "-"} ·{" "}
                                    {item.type === "PURCHASE_DOCUMENT" ? "Ausgabenbeleg" : "Zahlung"} · {item.status}
                                  </div>
                                </div>
                                <strong>{formatMoney(item.amountCents, item.currency)}</strong>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
              {!data?.spending.groups.length ? (
                <tr>
                  <td colSpan={6}>{loading ? "Lade Daten ..." : "Keine Ausgaben im gewählten Zeitraum."}</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="split-grid">
        <div className="panel">
          <h2 className="panel-title">Betrieb</h2>
          <div className="grid">
            <div>
              <div className="stat-label">Letzte Reportaktualisierung</div>
              <strong>{formatDate(data?.lastReport?.generatedAt)}</strong>
              <div className="small">{data?.lastReport?.filePath ?? "Noch kein Report erzeugt."}</div>
            </div>
            <div>
              <div className="stat-label">Letzter Backupzeitpunkt</div>
              <strong>{formatDate(data?.lastBackup?.generatedAt)}</strong>
              <div className="small">{data?.lastBackup?.filePath ?? "Noch kein Backup erzeugt."}</div>
            </div>
            <div>
              <div className="stat-label">Einmalige Ausgaben im aktuellen Jahr</div>
              <strong>{data?.totals.oneTimeCurrentYearCount ?? 0}</strong>{" "}
              <span>{formatMoney(data?.totals.oneTimeCurrentYearCents ?? 0)}</span>
            </div>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Fixkosten im Zeitraum</div>
            <div className="stat-value">{formatMoney(data?.totals.yearlyFixedCents ?? 0)}</div>
            <div className="stat-note">{data?.period.label ?? "gewählter Zeitraum"}, berechnet aus Verlauf und Zahlungsrhythmen</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Einmalige Ausgaben im aktuellen Jahr</div>
            <div className="stat-value">{formatMoney(data?.totals.oneTimeCurrentYearCents ?? 0)}</div>
            <div className="stat-note">{data?.totals.oneTimeCurrentYearCount ?? 0} Positionen</div>
          </div>
        </div>
      </section>

      <section className="split-grid">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Größte Kostenpositionen</th>
                <th>Anbieter</th>
                <th>Ø Monat</th>
                <th>Zeitraum</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data?.topCosts.map((item) => (
                <tr key={item.id}>
                  <td>{item.title}</td>
                  <td>{item.provider?.name ?? "-"}</td>
                  <td>{formatMoney(item.monthlyValueCents, item.currency)}</td>
                  <td>{formatMoney(item.yearlyValueCents, item.currency)}</td>
                  <td>
                    <StatusBadge tone={item.confidenceStatus === "NEEDS_REVIEW" ? "warn" : "default"}>
                      {item.confidenceStatus}
                    </StatusBadge>
                  </td>
                </tr>
              ))}
              {!data?.topCosts.length ? (
                <tr>
                  <td colSpan={5}>Noch keine aktiven Fixkosten erfasst.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nächste erwartete Zahlungen</th>
                <th>Anzahl</th>
                <th>Monatssumme</th>
              </tr>
            </thead>
            <tbody>
              {dueMonths.map((month) => (
                <tr key={month.key}>
                  <td>{month.label}</td>
                  <td>{month.paymentCount}</td>
                  <td>{formatMoney(month.totalCents, month.currency)}</td>
                </tr>
              ))}
              {!dueMonths.length ? (
                <tr>
                  <td colSpan={3}>Keine erwarteten Zahlungen in den nächsten 6 Monaten.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function groupForecastByMonth(rows: ForecastRow[]): ForecastMonthGroup[] {
  const groups = new Map<string, ForecastMonthGroup>();

  for (const row of rows) {
    if (!row.expectedDate) {
      continue;
    }

    const date = new Date(row.expectedDate);
    if (Number.isNaN(date.getTime())) {
      continue;
    }

    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const group = groups.get(key) ?? {
      key,
      label: formatMonth(date),
      paymentCount: 0,
      totalCents: 0,
      currency: row.currency,
    };
    group.paymentCount += 1;
    group.totalCents += row.amountCents;
    groups.set(key, group);
  }

  return Array.from(groups.values()).sort((left, right) => left.key.localeCompare(right.key));
}

function formatMonth(date: Date) {
  return new Intl.DateTimeFormat("de-DE", { month: "long", year: "numeric" }).format(date);
}
