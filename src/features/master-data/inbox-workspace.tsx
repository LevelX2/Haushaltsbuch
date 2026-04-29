"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, ChevronRight, Clock, Save, Search, X } from "lucide-react";
import { api } from "@/lib/api-client";
import { suggestionStatusLabels, suggestionStatuses } from "@/lib/domain";
import { formatDate } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";

type Suggestion = {
  id: string;
  suggestionType: string;
  suggestedAction: string;
  extractedJson: string;
  confidence: number;
  status: string;
  notes?: string | null;
  createdAt: string;
  sourceDocument?: { fileName: string } | null;
};

type Category = {
  id: string;
  name: string;
  active: boolean;
};

const emptyForm = {
  suggestionType: "manuell",
  suggestedAction: "prüfen",
  extractedJson: "{}",
  confidence: "0",
  status: "OPEN",
  notes: "",
};

export function InboxWorkspace() {
  const [items, setItems] = useState<Suggestion[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selected, setSelected] = useState<Suggestion | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [isManualFormOpen, setIsManualFormOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    try {
      const [nextItems, nextCategories] = await Promise.all([
        api<Suggestion[]>("/api/import-suggestions"),
        api<Category[]>("/api/categories"),
      ]);
      setItems(nextItems);
      setCategories(nextCategories.filter((category) => category.active));
      setSelected((current) => {
        if (current) {
          const updatedCurrent = nextItems.find((item) => item.id === current.id);
          if (updatedCurrent) {
            return updatedCurrent;
          }
        }
        return nextItems.find((item) => item.status === "OPEN") ?? nextItems[0] ?? null;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (selected) {
      fillForm(selected);
    }
  }, [selected?.id]);

  const openItems = useMemo(() => items.filter((item) => item.status === "OPEN"), [items]);
  const selectedOpenIndex = selected ? openItems.findIndex((item) => item.id === selected.id) : -1;
  const extractedFields = useMemo(() => formatExtractedFields(selected ? form.extractedJson : undefined), [selected, form.extractedJson]);
  const selectedCategoryId = useMemo(
    () => getExtractedCategoryId(form.extractedJson, categories),
    [form.extractedJson, categories],
  );

  function fillForm(item: Suggestion) {
    setForm({
      suggestionType: item.suggestionType,
      suggestedAction: item.suggestedAction,
      extractedJson: item.extractedJson,
      confidence: item.confidence.toString(),
      status: item.status,
      notes: item.notes ?? "",
    });
  }

  function edit(item: Suggestion) {
    setSelected(item);
    fillForm(item);
    setIsManualFormOpen(false);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const payload = preparePayload(form);
    try {
      if (selected) {
        await api(`/api/import-suggestions/${selected.id}`, { method: "PATCH", body: JSON.stringify(payload) });
        setMessage("Prüfpunkt aktualisiert.");
      } else {
        await api("/api/import-suggestions", { method: "POST", body: JSON.stringify(payload) });
        setMessage("Prüfpunkt angelegt.");
      }
      setSelected(null);
      setForm(emptyForm);
      setIsManualFormOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function setStatus(item: Suggestion, status: string) {
    try {
      await api(`/api/import-suggestions/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ ...preparePayload(form), status }),
      });
      const remainingItems = await api<Suggestion[]>("/api/import-suggestions");
      const nextOpenItems = remainingItems.filter((remainingItem) => remainingItem.status === "OPEN");
      const currentIndex = openItems.findIndex((openItem) => openItem.id === item.id);
      const nextOpen = nextOpenItems[currentIndex] ?? nextOpenItems[currentIndex - 1] ?? nextOpenItems[0] ?? null;
      setItems(remainingItems);
      setSelected(nextOpen);
      if (nextOpen) {
        fillForm(nextOpen);
      } else {
        setForm(emptyForm);
      }
      if (!nextOpen) {
        setMessage("Beleg bearbeitet. Es gibt keine weiteren offenen Belege.");
      } else if (status === "ACCEPTED") {
        setMessage("Beleg übernommen. Nächster offener Beleg ist bereit.");
      } else if (status === "REJECTED") {
        setMessage("Beleg abgelehnt. Nächster offener Beleg ist bereit.");
      } else {
        setMessage("Beleg zurückgestellt. Nächster offener Beleg ist bereit.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="page">
      <PageHeader
        title="Prüfeingang"
        subtitle="Importe und unklare Inputs landen hier zuerst. Sie verändern produktive Kostenpositionen nicht automatisch."
        actions={
          <button className="button secondary" onClick={load} type="button" title="Aktualisieren">
            <Search size={17} /> Aktualisieren
          </button>
        }
      />
      {error ? <div className="error">{error}</div> : null}
      {message ? <div className="success">{message}</div> : null}
      <section className="workspace">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Typ</th>
                <th>Aktion</th>
                <th>Quelle</th>
                <th>Confidence</th>
                <th>Status</th>
                <th>Erfasst</th>
              </tr>
            </thead>
            <tbody>
              {openItems.map((item) => (
                <tr className="row-clickable" key={item.id} onClick={() => edit(item)}>
                  <td>{item.suggestionType}</td>
                  <td>{item.suggestedAction}</td>
                  <td>{item.sourceDocument?.fileName ?? "-"}</td>
                  <td>{Math.round(item.confidence * 100)} %</td>
                  <td>
                    <StatusBadge tone={item.status === "OPEN" ? "warn" : item.status === "REJECTED" ? "danger" : "muted"}>
                      {suggestionStatusLabels[item.status as keyof typeof suggestionStatusLabels] ?? item.status}
                    </StatusBadge>
                  </td>
                  <td>{formatDate(item.createdAt)}</td>
                </tr>
              ))}
              {!openItems.length ? (
                <tr>
                  <td colSpan={6}>Der Prüfeingang ist leer.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <form className="panel review-panel" onSubmit={submit}>
          <div className="review-head">
            <div>
              <h2 className="panel-title">{selected ? "Beleg prüfen" : "Manuellen Prüfpunkt anlegen"}</h2>
              <div className="small">
                {selected
                  ? `${selectedOpenIndex >= 0 ? selectedOpenIndex + 1 : 0} von ${openItems.length} offenen Belegen`
                  : `${openItems.length} offene Belege`}
              </div>
            </div>
            {selected ? (
              <StatusBadge tone={selected.status === "OPEN" ? "warn" : selected.status === "REJECTED" ? "danger" : "muted"}>
                {suggestionStatusLabels[selected.status as keyof typeof suggestionStatusLabels] ?? selected.status}
              </StatusBadge>
            ) : null}
          </div>
          {selected ? (
            <div className="review-actions">
              <button className="button" type="button" onClick={() => setStatus(selected, "ACCEPTED")}>
                <Check size={17} /> Übernehmen
              </button>
              <button className="button secondary" type="button" onClick={() => setStatus(selected, "POSTPONED")}>
                <Clock size={17} /> Später
              </button>
              <button className="button danger" type="button" onClick={() => setStatus(selected, "REJECTED")}>
                <X size={17} /> Ablehnen
              </button>
            </div>
          ) : null}
          {selected ? (
            <div className="review-card">
              <div>
                <div className="review-label">Vorgeschlagene Aktion</div>
                <div className="review-action">{selected.suggestedAction}</div>
              </div>
              <div className="review-facts">
                <div>
                  <span>Typ</span>
                  <strong>{selected.suggestionType}</strong>
                </div>
                <div>
                  <span>Quelle</span>
                  <strong>{selected.sourceDocument?.fileName ?? "-"}</strong>
                </div>
                <div>
                  <span>Confidence</span>
                  <strong>{Math.round(selected.confidence * 100)} %</strong>
                </div>
                <div>
                  <span>Erfasst</span>
                  <strong>{formatDate(selected.createdAt)}</strong>
                </div>
              </div>
              <div className="review-note">
                <label htmlFor="quickCategory">Kostengruppe</label>
                <select
                  id="quickCategory"
                  value={selectedCategoryId}
                  onChange={(e) => {
                    const category = categories.find((item) => item.id === e.target.value) ?? null;
                    setForm({ ...form, extractedJson: updateExtractedCategory(form.extractedJson, category) });
                  }}
                >
                  <option value="">noch nicht zugeordnet</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <label htmlFor="quickNotes">Manuelle Einordnung</label>
                <textarea
                  id="quickNotes"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Zum Beispiel: Abo für Nahrungsergänzungsmittel, 30 Tage, Haushalt oder privat."
                />
              </div>
              <div className="review-data">
                <div className="review-label">Extrahierte Angaben</div>
                {extractedFields.length ? (
                  <dl>
                    {extractedFields.map((field) => (
                      <div key={field.key}>
                        <dt>{field.key}</dt>
                        <dd>{field.value}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <pre>{selected.extractedJson}</pre>
                )}
              </div>
            </div>
          ) : null}
          <button
            className="panel-toggle manual-form-toggle"
            type="button"
            onClick={() => setIsManualFormOpen((current) => !current)}
            aria-expanded={isManualFormOpen}
          >
            <span>
              {isManualFormOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
              <span className="panel-title">Manuelle Angaben</span>
            </span>
            <span className="small">{isManualFormOpen ? "Einklappen" : "Bei Bedarf ausklappen"}</span>
          </button>
          {isManualFormOpen ? (
          <>
            <div className="form-grid">
            <div className="field">
              <label htmlFor="suggestionType">Typ</label>
              <input
                id="suggestionType"
                value={form.suggestionType}
                onChange={(e) => setForm({ ...form, suggestionType: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="suggestedAction">Vorgeschlagene Aktion</label>
              <input
                id="suggestedAction"
                value={form.suggestedAction}
                onChange={(e) => setForm({ ...form, suggestedAction: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="confidence">Confidence 0 bis 1</label>
              <input
                id="confidence"
                inputMode="decimal"
                value={form.confidence}
                onChange={(e) => setForm({ ...form, confidence: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="status">Status</label>
              <select id="status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {suggestionStatuses.map((status) => (
                  <option key={status} value={status}>
                    {suggestionStatusLabels[status]}
                  </option>
                ))}
              </select>
            </div>
            <div className="field full">
              <label htmlFor="extractedJson">Extrahierte Daten als JSON</label>
              <textarea
                id="extractedJson"
                value={form.extractedJson}
                onChange={(e) => setForm({ ...form, extractedJson: e.target.value })}
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
          </>
          ) : null}
        </form>
      </section>
    </div>
  );
}

function formatExtractedFields(rawJson?: string) {
  if (!rawJson) {
    return [];
  }
  try {
    const parsed = parseExtractedObject(rawJson);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return [];
    }
    return Object.entries(parsed)
      .filter(([key]) => key !== "categoryId")
      .map(([key, value]) => ({
        key: formatFieldLabel(key),
        value: formatFieldValue(key, value),
      }));
  } catch {
    return [];
  }
}

function preparePayload(form: typeof emptyForm) {
  return { ...form, confidence: Number(form.confidence) || 0 };
}

function parseExtractedObject(rawJson?: string) {
  if (!rawJson) {
    return null;
  }
  try {
    const parsed = JSON.parse(rawJson) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

function getExtractedCategoryId(rawJson: string, categories: Category[]) {
  const parsed = parseExtractedObject(rawJson);
  if (!parsed) {
    return "";
  }
  if (typeof parsed.categoryId === "string" && categories.some((category) => category.id === parsed.categoryId)) {
    return parsed.categoryId;
  }
  if (typeof parsed.categoryName === "string") {
    return categories.find((category) => category.name === parsed.categoryName)?.id ?? "";
  }
  return "";
}

function updateExtractedCategory(rawJson: string, category: Category | null) {
  const parsed = parseExtractedObject(rawJson) ?? {};
  if (!category) {
    delete parsed.categoryId;
    delete parsed.categoryName;
  } else {
    parsed.categoryId = category.id;
    parsed.categoryName = category.name;
  }
  return JSON.stringify(parsed, null, 2);
}

function formatFieldLabel(key: string) {
  const labels: Record<string, string> = {
    amountCents: "Betrag",
    bookingDate: "Buchungsdatum",
    documentDate: "Belegdatum",
    dueDate: "Fällig am",
    paidAt: "Bezahlt am",
    providerName: "Anbieter",
    categoryName: "Kategorie",
    paymentMethod: "Zahlungsart",
    description: "Beschreibung",
    reference: "Referenz",
  };
  return labels[key] ?? key;
}

function formatFieldValue(key: string, value: unknown) {
  if (key.toLowerCase().endsWith("cents") && typeof value === "number") {
    return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(value / 100);
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
}
