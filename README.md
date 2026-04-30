# Haushaltskosten

`Haushaltskosten` ist eine lokale Fullstack-Webanwendung zur Erfassung und Auswertung laufender, einmaliger und befristeter Haushaltskosten.

Die Anwendung rechnet unterschiedliche Zahlungsrhythmen auf Monats- und Jahreswerte um. So wird sichtbar, welcher regelmäßige Kostenblock durchschnittlich pro Monat anfällt.

## Funktionsumfang

- Kostenpositionen für regelmäßige, einmalige und befristete Ausgaben
- Zahlungen als tatsächliche Bank-, Karten-, PayPal- oder Barbewegungen
- Anbieter, Kategorien und Haushaltsbezüge
- Ausgabenbelege für Bestellungen und Rechnungen mit erstem Amazon-Textimport
- CAMT-ZIP-Import für lokale Bankumsätze
- Dokument- und Belegmetadaten ohne Datei-Blob in der Datenbank
- Prüfeingang für unklare oder vorbereitete Importdaten
- Dashboard mit Monats- und Jahreswerten
- Zahlungsprognose und Fälligkeitsübersicht
- PDF-/XLSX-Reports
- SQLite-Backup und JSON-Gesamtexport

## Technischer Stand

Das Projekt ist als lokales MVP angelegt:

- Next.js App Router
- TypeScript
- Prisma Client
- SQLite
- serverseitige API-Routen im Next.js-Prozess
- lokale Laufzeitdaten außerhalb des Repositorys

## Schnellstart

```powershell
npm install
npm run app:prepare
npm run dev
```

Danach ist die Anwendung lokal erreichbar:

```text
http://localhost:3000
```

`npm run app:prepare` legt die lokalen Laufzeitordner an, erzeugt den Prisma Client, initialisiert das SQLite-Schema und schreibt Seed-Daten.

## Wichtige Kommandos

```powershell
npm run app:prepare   # Laufzeitordner, Prisma Client, SQLite-Schema und Seed-Daten
npm run dev           # lokale Entwicklung
npm run build         # Produktionsbuild
npm run typecheck     # TypeScript-Prüfung
npm audit --omit=dev  # Dependency-Audit ohne devDependencies
```

## Lokale Daten

Die produktive SQLite-Datei liegt standardmäßig außerhalb des Repositorys:

```text
C:\Users\<Benutzer>\AppData\Local\Haushaltsbuch\Haushaltsbuch.sqlite
```

Reports, Backups, Exporte und optionale Importordner liegen standardmäßig unter:

```text
C:\Users\<Benutzer>\OneDrive\Haushaltsbuch
```

Die Pfade sind in der Anwendung unter `Einstellungen` änderbar.

Bei jedem neuen Reportlauf werden vorhandene PDF-/XLSX-Reports aus dem Report-Stammordner zuerst nach `Reports\Archiv` verschoben. Direkt im Reportordner liegt dadurch nur der aktuellste automatisch erzeugte Reportlauf.

## Git- und Datenschutzhinweise

Lokale Laufzeitdaten werden nicht versioniert. Die `.gitignore` schließt unter anderem aus:

- `.env` und lokale Environment-Dateien
- SQLite-Datenbanken (`*.sqlite`, `*.sqlite3`, `*.db`)
- `data/`, `tmp/`, `.next/`, `node_modules/`
- lokale Dokumentablagen
- `AGENTS.local.md`

Die Datei `.env.example` enthält nur einen generischen Beispielpfad. Persönliche lokale Konfiguration gehört in `.env` oder `AGENTS.local.md` und bleibt außerhalb von Git.

## Architektur

Details zu Systemarchitektur, Datenbankschema, API-Endpunkten und UI-Aufbau stehen in:

- `docs/ARCHITEKTUR.md`

## Wissensbasis

Projektfragen und fachliche Entscheidungen werden wiki-first über `KI-Wissen-Haushaltskosten/` bearbeitet. Relevante Einstiegsseiten sind:

- `KI-Wissen-Haushaltskosten/00 Projektstart.md`
- `KI-Wissen-Haushaltskosten/02 Wissen/00 Uebersichten/Index.md`
- `KI-Wissen-Haushaltskosten/02 Wissen/00 Uebersichten/Aktueller Projektstatus.md`
- `KI-Wissen-Haushaltskosten/02 Wissen/Prozesse/Arbeitsworkflow Wissenspflege und Projektanfragen.md`

## Lokale Agent-Anbindung

`AGENTS.md` enthält die commitbaren Projektregeln. `AGENTS.local.md` ist lokal und nicht versioniert; dort kann eine persönliche Wissensbasis angebunden werden.

## Lizenz

Dieses Projekt steht unter der MIT-Lizenz. Details stehen in `LICENSE`.
