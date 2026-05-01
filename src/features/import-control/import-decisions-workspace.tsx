"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { api } from "@/lib/api-client";
import { formatDate } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";

type ImportDecision = {
  id: string;
  action: string;
  status: string;
  actor: string;
  confidence: number;
  reason?: string | null;
  sourceEntityType?: string | null;
  sourceEntityId?: string | null;
  targetEntityType?: string | null;
  targetEntityId?: string | null;
  sample: boolean;
  validationJson: string;
  resultJson?: string | null;
  createdAt: string;
  appliedAt?: string | null;
  importRun?: { source: string } | null;
  importRule?: { name: string; status: string } | null;
  auditLogs: Array<{ id: string; entityType: string; entityId: string; action: string; actor: string; createdAt: string }>;
};

export function ImportDecisionsWorkspace() {
  const [decisions, setDecisions] = useState<ImportDecision[]>([]);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      setDecisions(await api<ImportDecision[]>(`/api/import-decisions?status=${statusFilter}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  useEffect(() => {
    void load();
  }, [statusFilter]);

  const stats = useMemo(
    () => ({
      count: decisions.length,
      auto: decisions.filter((decision) => decision.status === "AUTO_APPLIED").length,
      review: decisions.filter((decision) => decision.status === "NEEDS_REVIEW" || decision.sample).length,
      blocked: decisions.filter((decision) => decision.status === "BLOCKED").length,
    }),
    [decisions],
  );

  return (
    <div className="page">
      <PageHeader
        title="Importentscheidungen"
        subtitle="Auditspur für automatische Zuordnungen, Codex-Aktionen, Stichproben und blockierte Entscheidungen."
        actions={
          <button className="button secondary" onClick={load} type="button" title="Aktualisieren">
            <RefreshCw size={17} /> Aktualisieren
          </button>
        }
      />
      {error ? <div className="error">{error}</div> : null}
      <section className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Entscheidungen</div>
          <div className="stat-value">{stats.count}</div>
          <div className="stat-note">im aktuellen Filter</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Auto angewendet</div>
          <div className="stat-value">{stats.auto}</div>
          <div className="stat-note">validiert und geschrieben</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Stichprobe/Prüfung</div>
          <div className="stat-value">{stats.review}</div>
          <div className="stat-note">sichtbar nachkontrollierbar</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Blockiert</div>
          <div className="stat-value">{stats.blocked}</div>
          <div className="stat-note">nicht angewendet</div>
        </div>
      </section>
      <section className="panel toolbar-panel">
        <label className="toolbar-field" htmlFor="statusFilter">
          <span className="field-label">Status</span>
          <select id="statusFilter" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="ALL">alle</option>
            <option value="AUTO_APPLIED">auto angewendet</option>
            <option value="APPLIED">angewendet</option>
            <option value="NEEDS_REVIEW">zu prüfen</option>
            <option value="BLOCKED">blockiert</option>
            <option value="REJECTED">abgelehnt</option>
          </select>
        </label>
      </section>
      <section className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Zeit</th>
              <th>Aktion</th>
              <th>Status</th>
              <th>Quelle</th>
              <th>Ziel</th>
              <th>Regel</th>
              <th>Begründung</th>
              <th>Audit</th>
            </tr>
          </thead>
          <tbody>
            {decisions.map((decision) => (
              <tr key={decision.id}>
                <td>{formatDate(decision.createdAt)}</td>
                <td>
                  <strong>{formatAction(decision.action)}</strong>
                  <div className="small">
                    {decision.actor} · {Math.round(decision.confidence * 100)} %
                  </div>
                </td>
                <td>
                  <StatusBadge tone={statusTone(decision.status)}>
                    {`${formatStatus(decision.status)}${decision.sample ? " · Stichprobe" : ""}`}
                  </StatusBadge>
                </td>
                <td>
                  {decision.sourceEntityType ?? "-"}
                  <div className="small">{shortId(decision.sourceEntityId)}</div>
                </td>
                <td>
                  {decision.targetEntityType ?? "-"}
                  <div className="small">{shortId(decision.targetEntityId)}</div>
                </td>
                <td>
                  {decision.importRule?.name ?? "-"}
                  {decision.importRun ? <div className="small">{decision.importRun.source}</div> : null}
                </td>
                <td>
                  {decision.reason ?? "-"}
                  {decision.status === "BLOCKED" ? <ValidationIssues raw={decision.validationJson} /> : null}
                </td>
                <td>
                  {decision.auditLogs.length ? (
                    decision.auditLogs.map((log) => (
                      <div className="small" key={log.id}>
                        {log.entityType} {shortId(log.entityId)}
                      </div>
                    ))
                  ) : (
                    <span className="small">kein Schreibvorgang</span>
                  )}
                </td>
              </tr>
            ))}
            {!decisions.length ? (
              <tr>
                <td colSpan={8}>Keine Importentscheidungen im aktuellen Filter.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function ValidationIssues({ raw }: { raw: string }) {
  try {
    const issues = JSON.parse(raw) as Array<{ message: string }>;
    return (
      <>
        {issues.map((issue, index) => (
          <div className="small" key={`${issue.message}-${index}`}>
            {issue.message}
          </div>
        ))}
      </>
    );
  } catch {
    return null;
  }
}

function formatAction(value: string) {
  return value.toLowerCase().replaceAll("_", " ");
}

function formatStatus(value: string) {
  const labels: Record<string, string> = {
    PREVIEWED: "Vorschau",
    AUTO_APPLIED: "auto angewendet",
    APPLIED: "angewendet",
    NEEDS_REVIEW: "zu prüfen",
    BLOCKED: "blockiert",
    REJECTED: "abgelehnt",
    SUPERSEDED: "ersetzt",
  };
  return labels[value] ?? value;
}

function statusTone(status: string) {
  if (status === "BLOCKED" || status === "REJECTED") return "danger";
  if (status === "NEEDS_REVIEW") return "warn";
  if (status === "PREVIEWED") return "muted";
  return "default";
}

function shortId(value?: string | null) {
  return value ? value.slice(0, 8) : "-";
}
