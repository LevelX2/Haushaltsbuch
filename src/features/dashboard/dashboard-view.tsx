"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { api } from "@/lib/api-client";
import { formatDate } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";

type DashboardData = {
  totals: {
    monthlyFixedCents: number;
    yearlyFixedCents: number;
    activeCount: number;
    limitedCount: number;
    oneTimeCurrentYearCount: number;
    openSuggestions: number;
    unclearPositions: number;
    oneTimeCurrentYearCents: number;
  };
  topCosts: CostRow[];
  byCategory: { category: string; monthlyValueCents: number; yearlyValueCents: number }[];
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

export function DashboardView() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setData(await api<DashboardData>("/api/dashboard"));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const maxCategory = useMemo(
    () => Math.max(1, ...(data?.byCategory.map((row) => row.monthlyValueCents) ?? [1])),
    [data],
  );
  const dueMonths = useMemo(() => groupForecastByMonth(data?.dueItems ?? []), [data?.dueItems]);

  return (
    <div className="page">
      <PageHeader
        title="Dashboard"
        subtitle="Auswertungswirksam sind aktive, klassifizierte Fixkosten mit bestätigtem, sicherem oder geschätztem Vertrauensstatus."
        actions={
          <button className="button secondary" onClick={load} type="button" title="Dashboard aktualisieren">
            <RefreshCw size={17} /> Aktualisieren
          </button>
        }
      />

      {error ? <div className="error">{error}</div> : null}

      <section className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Monatliche Fixkosten</div>
          <div className="stat-value">{formatMoney(data?.totals.monthlyFixedCents ?? 0)}</div>
          <div className="stat-note">aktiver, geprüfter Monatswert</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Jährliche Fixkosten</div>
          <div className="stat-value">{formatMoney(data?.totals.yearlyFixedCents ?? 0)}</div>
          <div className="stat-note">hochgerechnet aus Zahlungsrhythmen</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Aktive Positionen</div>
          <div className="stat-value">{data?.totals.activeCount ?? 0}</div>
          <div className="stat-note">{data?.totals.limitedCount ?? 0} davon befristet</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Prüfung offen</div>
          <div className="stat-value">{(data?.totals.openSuggestions ?? 0) + (data?.totals.unclearPositions ?? 0)}</div>
          <div className="stat-note">
            {data?.totals.openSuggestions ?? 0} Prüfeingang, {data?.totals.unclearPositions ?? 0} unklar
          </div>
        </div>
      </section>

      <section className="panel">
        <h2 className="panel-title">Kosten nach Kategorie (hochgerechnete Monatswerte)</h2>
        {data?.byCategory.length ? (
          data.byCategory.map((row) => (
            <div className="bar-row" key={row.category}>
              <strong>{row.category}</strong>
              <div className="bar-track" aria-hidden="true">
                <div
                  className="bar-fill"
                  style={{ width: `${Math.max(4, (row.monthlyValueCents / maxCategory) * 100)}%` }}
                />
              </div>
              <span>{formatMoney(row.monthlyValueCents)}</span>
            </div>
          ))
        ) : (
          <div className="empty">{loading ? "Lade Daten ..." : "Noch keine geprüften Fixkosten vorhanden."}</div>
        )}
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

        <div className="panel">
          <h2 className="panel-title">Ausgaben der letzten 3 Monate (Ist)</h2>
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
        </div>
      </section>

      <section className="split-grid">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Größte Kostenpositionen</th>
                <th>Anbieter</th>
                <th>Monat</th>
                <th>Jahr</th>
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
