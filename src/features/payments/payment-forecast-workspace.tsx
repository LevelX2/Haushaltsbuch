"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { api } from "@/lib/api-client";
import { recurrenceTypeLabels } from "@/lib/domain";
import { formatDate } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";

type ForecastRow = {
  id: string;
  costPositionId: string;
  title: string;
  providerName: string | null;
  categoryName: string | null;
  expectedDate: string | null;
  amountCents: number;
  currency: string;
  recurrenceType: keyof typeof recurrenceTypeLabels;
  paymentMethod: string;
  confidenceStatus: string;
  basis: string;
  note: string | null;
};

type ForecastMode = "next-only" | "all-until";

type ForecastData = {
  rows: ForecastRow[];
  mode: ForecastMode;
  forecastUntil: string;
  totals: {
    predictableCount: number;
    unclearCount: number;
    totalCents: number;
    next30DaysCents: number;
    next90DaysCents: number;
  };
};

export function PaymentForecastWorkspace() {
  const [data, setData] = useState<ForecastData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<ForecastMode>("next-only");
  const [forecastUntil, setForecastUntil] = useState(defaultForecastUntil());

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ mode, until: forecastUntil });
      setData(await api<ForecastData>(`/api/payment-forecast?${params.toString()}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [forecastUntil, mode]);

  const methodCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of data?.rows ?? []) {
      counts.set(row.paymentMethod, (counts.get(row.paymentMethod) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort((left, right) => right[1] - left[1]);
  }, [data?.rows]);

  const monthGroups = useMemo(() => groupByMonth(data?.rows ?? []), [data?.rows]);

  return (
    <div className="page">
      <PageHeader
        title="Zahlungsprognose"
        subtitle="Erwartete Zahlungen aus aktiven regelmäßigen Kostenpositionen. Grundlage sind Fälligkeitsdatum, letzte Zahlung oder Startdatum."
        actions={
          <button className="button secondary" onClick={load} type="button" title="Prognose aktualisieren">
            <RefreshCw size={17} /> Aktualisieren
          </button>
        }
      />

      {error ? <div className="error">{error}</div> : null}

      <section className="panel toolbar-panel">
        <div className="toolbar-group">
          <span className="field-label">Umfang</span>
          <div className="segmented-control" aria-label="Umfang der Zahlungsprognose">
            <button className={mode === "next-only" ? "active" : ""} onClick={() => setMode("next-only")} type="button">
              Nur nächste Zahlung
            </button>
            <button className={mode === "all-until" ? "active" : ""} onClick={() => setMode("all-until")} type="button">
              Alle Zahlungen
            </button>
          </div>
        </div>
        <label className="toolbar-field" htmlFor="forecastUntil">
          <span className="field-label">Prognose bis</span>
          <input
            id="forecastUntil"
            max={maxForecastUntil()}
            min={todayInputValue()}
            onChange={(event) => setForecastUntil(event.target.value)}
            type="date"
            value={forecastUntil}
          />
        </label>
        <div className="toolbar-note">
          {mode === "next-only"
            ? "Jede Position erscheint einmal mit ihrer nächsten erwarteten Fälligkeit."
            : `Wiederkehrende Zahlungen werden bis ${formatDate(data?.forecastUntil ?? forecastUntil)} fortgeschrieben.`}
        </div>
      </section>

      <section className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Prognostizierbar</div>
          <div className="stat-value">{data?.totals.predictableCount ?? 0}</div>
          <div className="stat-note">{loading ? "Lade ..." : "regelmäßige Positionen mit Datum und Rhythmus"}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Summe bis Stichtag</div>
          <div className="stat-value">{formatMoney(data?.totals.totalCents ?? 0)}</div>
          <div className="stat-note">{mode === "next-only" ? "nur nächste Fälligkeiten" : `bis ${formatDate(data?.forecastUntil ?? forecastUntil)}`}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Nächste 30 Tage</div>
          <div className="stat-value">{formatMoney(data?.totals.next30DaysCents ?? 0)}</div>
          <div className="stat-note">erwartete Zahlungen</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Nächste 90 Tage</div>
          <div className="stat-value">{formatMoney(data?.totals.next90DaysCents ?? 0)}</div>
          <div className="stat-note">erwartete Zahlungen</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Nicht berechenbar</div>
          <div className="stat-value">{data?.totals.unclearCount ?? 0}</div>
          <div className="stat-note">fehlender Rhythmus oder fehlendes Datum</div>
        </div>
      </section>

      <section className="panel compact-summary">
        <h2 className="panel-title">Zahlungsarten</h2>
        <div className="method-chips">
          {methodCounts.map(([method, count]) => (
            <div className="method-chip" key={method}>
              <strong>{method}</strong>
              <span>{count}</span>
            </div>
          ))}
          {!methodCounts.length ? <div className="empty">Noch keine Zahlungsarten ableitbar.</div> : null}
        </div>
      </section>

      <section className="grid">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Erwartet am</th>
                <th>Position</th>
                <th>Anbieter</th>
                <th>Betrag</th>
                <th>Rhythmus</th>
                <th>Zahlungsart</th>
                <th>Basis</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {monthGroups.map((group) => (
                <Fragment key={group.key}>
                  <tr className="month-summary-row">
                    <td colSpan={3}>
                      <strong>{group.label}</strong>
                      <div className="small">{group.rows.length} erwartete Zahlungen</div>
                    </td>
                    <td>{formatMoney(group.totalCents)}</td>
                    <td colSpan={4}>Zwischensumme</td>
                  </tr>
                  {group.rows.map((row) => (
                    <tr key={row.id}>
                      <td>{formatDate(row.expectedDate)}</td>
                      <td>
                        <strong>{row.title}</strong>
                        <div className="small">{row.categoryName ?? "ohne Kategorie"}</div>
                        {row.note ? <div className="small">{row.note}</div> : null}
                      </td>
                      <td>{row.providerName ?? "-"}</td>
                      <td>{formatMoney(row.amountCents, row.currency)}</td>
                      <td>{recurrenceTypeLabels[row.recurrenceType] ?? row.recurrenceType}</td>
                      <td>{row.paymentMethod}</td>
                      <td>{row.basis}</td>
                      <td>
                        <StatusBadge tone={row.confidenceStatus === "NEEDS_REVIEW" ? "warn" : "default"}>
                          {row.confidenceStatus}
                        </StatusBadge>
                      </td>
                    </tr>
                  ))}
                </Fragment>
              ))}
              {!data?.rows.length ? (
                <tr>
                  <td colSpan={8}>{loading ? "Lade Prognose ..." : "Keine regelmäßigen Kostenpositionen für eine Prognose vorhanden."}</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

type MonthGroup = {
  key: string;
  label: string;
  totalCents: number;
  rows: ForecastRow[];
};

function groupByMonth(rows: ForecastRow[]): MonthGroup[] {
  const groups = new Map<string, MonthGroup>();

  for (const row of rows) {
    const date = row.expectedDate ? new Date(row.expectedDate) : null;
    const key = date && !Number.isNaN(date.getTime()) ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}` : "unknown";
    const label = date && !Number.isNaN(date.getTime()) ? formatMonth(date) : "Ohne Prognosedatum";
    const group = groups.get(key) ?? { key, label, totalCents: 0, rows: [] };
    group.totalCents += row.expectedDate ? row.amountCents : 0;
    group.rows.push(row);
    groups.set(key, group);
  }

  return Array.from(groups.values());
}

function formatMonth(date: Date) {
  return new Intl.DateTimeFormat("de-DE", { month: "long", year: "numeric" }).format(date);
}

function defaultForecastUntil() {
  const date = new Date();
  date.setDate(date.getDate() + 90);
  return toDateInputValue(date);
}

function maxForecastUntil() {
  const date = new Date();
  date.setMonth(date.getMonth() + 24);
  return toDateInputValue(date);
}

function todayInputValue() {
  return toDateInputValue(new Date());
}

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}
