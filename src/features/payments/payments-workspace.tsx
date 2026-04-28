"use client";

import { useEffect, useState } from "react";
import { Plus, Save, Search } from "lucide-react";
import { api } from "@/lib/api-client";
import { paymentStatusLabels, paymentStatuses, paymentTypeLabels, paymentTypes } from "@/lib/domain";
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
  const [form, setForm] = useState(emptyForm);
  const [selected, setSelected] = useState<Payment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const [nextPayments, nextProviders, nextCosts] = await Promise.all([
        api<Payment[]>("/api/payments"),
        api<Option[]>("/api/providers"),
        api<Option[]>("/api/cost-positions?sort=title&direction=asc"),
      ]);
      setPayments(nextPayments);
      setProviders(nextProviders);
      setCostPositions(nextCosts);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function edit(payment: Payment) {
    setSelected(payment);
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
  }

  function reset() {
    setSelected(null);
    setForm(emptyForm);
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

  return (
    <div className="page">
      <PageHeader
        title="Zahlungen"
        subtitle="Konkrete oder erwartete Kontobewegungen werden getrennt von Kostenpositionen erfasst, damit Plan/Ist-Abweichungen später prüfbar bleiben."
        actions={
          <>
            <button className="button secondary" onClick={reset} type="button" title="Neue Zahlung">
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
                <th>Datum</th>
                <th>Beschreibung</th>
                <th>Anbieter</th>
                <th>Kostenposition</th>
                <th>Betrag</th>
                <th>Typ</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr className="row-clickable" key={payment.id} onClick={() => edit(payment)}>
                  <td>{formatDate(payment.date)}</td>
                  <td>{payment.description ?? "-"}</td>
                  <td>{payment.provider?.name ?? "-"}</td>
                  <td>{payment.costPosition?.title ?? "-"}</td>
                  <td>{formatMoney(payment.amountCents, payment.currency)}</td>
                  <td>{paymentTypeLabels[payment.paymentType as keyof typeof paymentTypeLabels] ?? payment.paymentType}</td>
                  <td>
                    <StatusBadge tone={payment.status === "NEEDS_REVIEW" ? "warn" : "default"}>
                      {paymentStatusLabels[payment.status as keyof typeof paymentStatusLabels] ?? payment.status}
                    </StatusBadge>
                  </td>
                </tr>
              ))}
              {!payments.length ? (
                <tr>
                  <td colSpan={7}>Noch keine Zahlungen erfasst.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <form className="panel" onSubmit={submit}>
          <h2 className="panel-title">{selected ? "Zahlung bearbeiten" : "Zahlung erfassen"}</h2>
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
        </form>
      </section>
    </div>
  );
}
