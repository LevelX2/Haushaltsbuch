"use client";

import { useEffect, useState } from "react";
import { Plus, Save, Search } from "lucide-react";
import { api } from "@/lib/api-client";
import { PageHeader } from "@/components/page-header";

type Provider = {
  id: string;
  name: string;
  normalizedName: string;
  aliasesJson: string;
  notes?: string | null;
};

const emptyForm = { name: "", aliases: "", notes: "" };

export function ProvidersWorkspace() {
  const [items, setItems] = useState<Provider[]>([]);
  const [selected, setSelected] = useState<Provider | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    try {
      setItems(await api<Provider[]>("/api/providers"));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function edit(provider: Provider) {
    setSelected(provider);
    setForm({
      name: provider.name,
      aliases: aliases(provider.aliasesJson).join(", "),
      notes: provider.notes ?? "",
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
    const payload = {
      name: form.name,
      aliases: form.aliases
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
      notes: form.notes,
    };

    try {
      if (selected) {
        await api(`/api/providers/${selected.id}`, { method: "PATCH", body: JSON.stringify(payload) });
        setMessage("Anbieter aktualisiert.");
      } else {
        await api("/api/providers", { method: "POST", body: JSON.stringify(payload) });
        setMessage("Anbieter angelegt.");
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
        title="Anbieter"
        subtitle="Anbieter und Zahlungsempfänger werden als Stammdaten geführt, damit abweichende Schreibweisen später vereinheitlicht werden können."
        actions={
          <>
            <button className="button secondary" onClick={reset} type="button" title="Neuer Anbieter">
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
                <th>Name</th>
                <th>Normalisiert</th>
                <th>Aliase</th>
                <th>Notiz</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr className="row-clickable" key={item.id} onClick={() => edit(item)}>
                  <td>
                    <strong>{item.name}</strong>
                  </td>
                  <td>{item.normalizedName}</td>
                  <td>{aliases(item.aliasesJson).join(", ") || "-"}</td>
                  <td>{item.notes ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <form className="panel" onSubmit={submit}>
          <h2 className="panel-title">{selected ? "Anbieter bearbeiten" : "Anbieter anlegen"}</h2>
          <div className="form-grid">
            <div className="field full">
              <label htmlFor="name">Name</label>
              <input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="field full">
              <label htmlFor="aliases">Aliase</label>
              <input
                id="aliases"
                value={form.aliases}
                onChange={(e) => setForm({ ...form, aliases: e.target.value })}
                placeholder="Amazon EU, Amazon Payments"
              />
            </div>
            <div className="field full">
              <label htmlFor="notes">Notiz</label>
              <textarea id="notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
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

function aliases(raw: string) {
  try {
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
