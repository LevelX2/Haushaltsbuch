# Log

## 2026-04

### [2026-04-28] umsetzung | V1-Fullstack-App umgesetzt
- Anlass oder Quelle: zweite Projektvorgabe zur vollständigen lokalen Haushaltsbuch-/Fixkostenübersicht.
- Änderungen:
  - Neue Rohquelle `2026-04-28 Zweite Projektvorgabe Fullstack MVP Haushaltsbuch.md` aufgenommen.
  - Next.js-App mit App Router, TypeScript, Prisma Client und SQLite angelegt.
  - Datenmodell für Kostenpositionen, Zahlungen, Anbieter, Kategorien, Haushaltsbezüge, Dokumente, Prüfeingang, Reports, Backups, Einstellungen und Kostenpositionshistorie umgesetzt.
  - UI-Arbeitsbereiche für Dashboard, Kostenpositionen, einmalige Ausgaben, befristete Kosten, Fälligkeiten, Zahlungen, Anbieter, Kategorien, Dokumente, Prüfeingang, Reports, Backup/Export und Einstellungen erstellt.
  - API-Endpunkte für V1-Arbeitsbereiche angelegt.
  - Lokale Laufzeitordner und OneDrive-Ordner werden vorbereitet; SQLite-Schema wird idempotent initialisiert und Startdaten werden geseedet.
  - PDF-/XLSX-Reports und SQLite-/JSON-Backups implementiert.
  - README und `docs/ARCHITEKTUR.md` ergänzt.
  - Projektüberblick, Fachkonzept, Status, Quellenlage, Entscheidungsliste, Risiken und Index aktualisiert.
- Verifikation:
  - `npm run app:prepare` erfolgreich.
  - `npm run typecheck` erfolgreich.
  - `npm run build` erfolgreich.
  - `npm audit --omit=dev` ohne Findings.
  - Lokaler Server auf `http://localhost:3000` gestartet.
  - `/api/health`, `/api/dashboard`, Stammdaten-APIs, Reportexport und Backupexport erfolgreich geprüft.
- Einordnung:
  - V1 ist lokal nutzbar. Automatische Importlogik, Dublettenabgleich, Plan/Ist-Automation und Backup-Wiederherstellung bleiben spätere Ausbaustufen.

### [2026-04-28] setup | Projektumgebung und Wissensbasis angelegt
- Anlass oder Quelle: Startauftrag zur Einrichtung von `Haushaltskosten` vergleichbar zum Projekt `Labordaten`.
- Änderungen:
  - Git-Projekt initialisiert und Arbeitsbranch `codex/ab-2026-04-28` angelegt.
  - `AGENTS.md` mit projektbezogenen Regeln, Pflicht-Einstieg, Haupt-Vault-Anbindung, Prioritätslogik, Branch-Strategie und Abschlusskontrakt angelegt.
  - `AGENTS.local.md` lokal angelegt und in `.gitignore` ausgeschlossen.
  - Projektbezogene Wissensbasis `KI-Wissen-Haushaltskosten/` mit Startseiten, Prozessseiten, Status, Log, Qualitätsprüfung und erster Rohquelle angelegt.
  - `.editorconfig`, `.gitattributes`, `.gitignore` und `README.md` ergänzt.
- Einordnung:
  - Es wurde bewusst noch keine ausführbare Anwendung und kein technischer App-Scaffold angelegt.
