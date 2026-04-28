"use client";

import { useEffect, useState } from "react";
import { Plus, Save, Search } from "lucide-react";
import { api } from "@/lib/api-client";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";

type Category = {
  id: string;
  name: string;
  parentCategoryId?: string | null;
  active: boolean;
  sortOrder: number;
  parent?: { name: string } | null;
};

const emptyForm = { name: "", parentCategoryId: "", active: true, sortOrder: "100" };

export function CategoriesWorkspace() {
  const [items, setItems] = useState<Category[]>([]);
  const [selected, setSelected] = useState<Category | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    try {
      setItems(await api<Category[]>("/api/categories"));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function edit(category: Category) {
    setSelected(category);
    setForm({
      name: category.name,
      parentCategoryId: category.parentCategoryId ?? "",
      active: category.active,
      sortOrder: category.sortOrder.toString(),
    });
  }

  function reset() {
    setSelected(null);
    setForm(emptyForm);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const payload = { ...form, sortOrder: Number(form.sortOrder) || 100 };
    try {
      if (selected) {
        await api(`/api/categories/${selected.id}`, { method: "PATCH", body: JSON.stringify(payload) });
        setMessage("Kategorie aktualisiert.");
      } else {
        await api("/api/categories", { method: "POST", body: JSON.stringify(payload) });
        setMessage("Kategorie angelegt.");
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
        title="Kategorien"
        subtitle="Kategorien sind pflegbare Stammdaten. Importierte und unklare Vorgänge können zunächst in „Unklar“ landen."
        actions={
          <>
            <button className="button secondary" onClick={reset} type="button" title="Neue Kategorie">
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
                <th>Sortierung</th>
                <th>Name</th>
                <th>Übergeordnet</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr className="row-clickable" key={item.id} onClick={() => edit(item)}>
                  <td>{item.sortOrder}</td>
                  <td>
                    <strong>{item.name}</strong>
                  </td>
                  <td>{item.parent?.name ?? "-"}</td>
                  <td>
                    <StatusBadge tone={item.active ? "default" : "muted"}>{item.active ? "aktiv" : "inaktiv"}</StatusBadge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <form className="panel" onSubmit={submit}>
          <h2 className="panel-title">{selected ? "Kategorie bearbeiten" : "Kategorie anlegen"}</h2>
          <div className="form-grid">
            <div className="field full">
              <label htmlFor="name">Name</label>
              <input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="field">
              <label htmlFor="parent">Übergeordnet</label>
              <select
                id="parent"
                value={form.parentCategoryId}
                onChange={(e) => setForm({ ...form, parentCategoryId: e.target.value })}
              >
                <option value="">keine</option>
                {items
                  .filter((item) => item.id !== selected?.id)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="sortOrder">Sortierung</label>
              <input
                id="sortOrder"
                inputMode="numeric"
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
              />
            </div>
            <div className="field full">
              <label>
                <input
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  style={{ width: "auto", marginRight: 8 }}
                  type="checkbox"
                />
                Kategorie ist aktiv
              </label>
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
