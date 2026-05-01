# Import-Pattern für Haushaltskosten

## Zweck
Dieses Runbook beschreibt das allgemeine Import- und Zuordnungsmuster der Haushaltskosten-Anwendung. Es gilt für manuelle App-Aktionen, Automatikläufe und KI-/Codex-gestützte Auswertungen gleichermaßen.

## Grundregeln
- Keine Import- oder KI-Logik ändert die SQLite-Datenbank direkt.
- Importe, Zuordnungen und Regeländerungen laufen ausschließlich über die App-APIs.
- Jede schreibende Importentscheidung wird zuerst per `preview` validiert.
- `apply` darf nur ausgeführt werden, wenn `preview` keine harten Fehler liefert.
- Blockierte, unsichere oder mehrdeutige Fälle werden nicht erzwungen, sondern bleiben als Prüfpunkt sichtbar.
- `ImportRun`, `ImportRule`, `ImportDecision` und `AuditLog` sind der offizielle Kontrollpfad für automatisierte oder KI-gestützte Änderungen.
- Persönliche Codex-Skills oder lokale Automationen dürfen dieses Pattern ausprägen, dürfen es aber nicht umgehen.

## Kontrollobjekte
- `ImportRun`: fasst einen Import- oder Automatiklauf zusammen und hält Quelle, Status, Zähler und Ergebnisnotizen.
- `ImportRule`: beschreibt eine wiederverwendbare Regel für bekannte Quellen, Muster und Zielaktionen.
- `ImportDecision`: hält eine einzelne vorgeschlagene, angewendete, blockierte oder prüfpflichtige Aktion.
- `AuditLog`: dokumentiert angewendete Änderungen mit Entität, Aktion, Actor, Kernwerten vor/nach der Änderung und Begründung.

## Standardablauf
1. Quelle oder bereits importierte Objekte lesen.
2. Bei Batch-Verarbeitung einen `ImportRun` anlegen oder einen app-intern erzeugten Lauf verwenden.
3. Pro fachlicher Änderung eine strukturierte `ImportDecision` formulieren.
4. `POST /api/import-decisions/preview` aufrufen.
5. Bei `canApply: true` dieselbe Entscheidung per `POST /api/import-decisions/apply` anwenden.
6. Bei `canApply: false` die Validierungsfehler nicht umgehen; der Fall bleibt im Prüfeingang oder in den Importentscheidungen sichtbar.
7. Bei wiederkehrenden, stabilen Mustern eine `ImportRule` anlegen oder aktualisieren.
8. Ergebnis mit angewendeten, blockierten und prüfpflichtigen Entscheidungen zusammenfassen.

## Wichtige Endpunkte
Alle Pfade sind relativ zur laufenden lokalen App.

| Methode | Pfad | Zweck |
| --- | --- | --- |
| `GET` | `/api/health` | App- und Datenbankcheck |
| `POST` | `/api/payments/import/camt-directory` | CAMT-ZIP-Dateien aus einem lokalen Ordner importieren |
| `POST` | `/api/purchase-documents/import/amazon-text` | kopierten Amazon-Bestellseitentext importieren |
| `GET`/`POST` | `/api/import-runs` | Importläufe anzeigen oder registrieren |
| `GET`/`POST` | `/api/import-rules` | Importregeln anzeigen oder anlegen |
| `PATCH` | `/api/import-rules/[id]` | Importregel bearbeiten, pausieren oder reaktivieren |
| `GET` | `/api/import-decisions` | Entscheidungen, Stichproben und blockierte Aktionen anzeigen |
| `POST` | `/api/import-decisions/preview` | Importentscheidung validieren, ohne zu schreiben |
| `POST` | `/api/import-decisions/apply` | validierte Importentscheidung transaktional anwenden |

## Unterstützte Aktionen
- `LINK_PURCHASE_DOCUMENT_TO_COST_POSITION`
- `SET_PURCHASE_DOCUMENT_CATEGORY`
- `SET_PURCHASE_DOCUMENT_RECURRENCE`
- `CREATE_COST_POSITION_FROM_PURCHASE_DOCUMENT`
- `LINK_PAYMENT_TO_COST_POSITION`
- `CONFIRM_PAYMENT_MATCH`
- `MARK_DOCUMENT_DUPLICATE`
- `IGNORE_DOCUMENT`
- `CREATE_OR_UPDATE_IMPORT_RULE`

## Beispiel: Preview vor Apply
```json
{
  "importRunId": "optional-run-id",
  "importRuleId": "optional-rule-id",
  "action": "LINK_PURCHASE_DOCUMENT_TO_COST_POSITION",
  "actor": "CODEX",
  "confidence": 0.96,
  "reason": "Betrag, Anbieter und Belegtext passen eindeutig.",
  "sourceEntityType": "PURCHASE_DOCUMENT",
  "sourceEntityId": "purchase-document-id",
  "targetEntityType": "COST_POSITION",
  "targetEntityId": "cost-position-id",
  "sourceHash": "optional-source-hash",
  "payload": {
    "historicalMatch": true
  }
}
```

Die Entscheidung wird zuerst an `/api/import-decisions/preview` gesendet. Nur wenn die Antwort `canApply: true` enthält, wird dieselbe Entscheidung an `/api/import-decisions/apply` gesendet.

## Beispiel: Kategorie setzen
```json
{
  "action": "SET_PURCHASE_DOCUMENT_CATEGORY",
  "actor": "CODEX",
  "confidence": 0.94,
  "sourceEntityType": "PURCHASE_DOCUMENT",
  "sourceEntityId": "purchase-document-id",
  "targetEntityType": "CATEGORY",
  "targetEntityId": "category-id",
  "payload": {
    "categoryId": "category-id"
  }
}
```

## Beispiel: Zahlungsabgleich bestätigen
```json
{
  "action": "CONFIRM_PAYMENT_MATCH",
  "actor": "CODEX",
  "confidence": 0.91,
  "sourceEntityType": "PURCHASE_DOCUMENT",
  "sourceEntityId": "purchase-document-id",
  "targetEntityType": "PAYMENT",
  "targetEntityId": "payment-id",
  "payload": {
    "purchaseDocumentId": "purchase-document-id",
    "paymentId": "payment-id",
    "historicalMatch": true
  }
}
```

## Abgrenzung
Dieses Pattern enthält keine privaten Ablagepfade, persönlichen Belegregeln, Empfänger, Konten oder lokalen Routinen. Solche Details gehören in nicht versionierte lokale Konfigurationen, persönliche Wissensbestände oder persönliche Codex-Skills.
