# Haushaltskosten

`Haushaltskosten` ist eine lokale Fullstack-Webanwendung für laufende, einmalige und befristete Haushaltskosten.

Der praktische Kernnutzen: Kosten werden unabhängig vom Zahlungsrhythmus auf Monats- und Jahreswerte umgerechnet. Reports und Backups werden lokal erzeugt und in OneDrive abgelegt.

## Aktueller Stand

Version 1 ist als lokales MVP angelegt:

- Next.js App Router
- TypeScript
- Prisma Client
- SQLite im lokalen AppData-Ordner
- manuelle Erfassung von Kostenpositionen, Zahlungen, Anbietern, Kategorien, Dokumenten und Prüfpunkten
- Dashboard, Listen, Filter, Monats-/Jahreswertberechnung
- PDF-/XLSX-Reports nach OneDrive
- SQLite-Backup und JSON-Gesamtexport nach OneDrive

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

## Wichtige Kommandos

```powershell
npm run app:prepare   # Laufzeitordner, Prisma Client, SQLite-Schema und Seed-Daten
npm run dev           # lokale Entwicklung
npm run build         # Produktionsbuild
npm run typecheck     # TypeScript-Prüfung
npm audit --omit=dev  # Dependency-Audit
```

## Lokale Daten und OneDrive

Die produktive SQLite-Datei liegt standardmäßig hier:

```text
C:\Users\Lui\AppData\Local\Haushaltsbuch\Haushaltsbuch.sqlite
```

Reports und Backups liegen standardmäßig hier:

```text
C:\Users\Lui\OneDrive\Haushaltsbuch\Reports
C:\Users\Lui\OneDrive\Haushaltsbuch\Backup
```

Die Pfade sind in der Anwendung unter `Einstellungen` änderbar.

## Architektur

Details zu Systemarchitektur, Dateistruktur, Datenbankschema, API-Endpunkten und UI-Aufbau stehen in:

- `docs/ARCHITEKTUR.md`

## Wissensbasis

Projektfragen und fachliche Entscheidungen werden wiki-first über `KI-Wissen-Haushaltskosten/` bearbeitet. Relevante Einstiegsseiten sind:

- `KI-Wissen-Haushaltskosten/00 Projektstart.md`
- `KI-Wissen-Haushaltskosten/02 Wissen/00 Uebersichten/Index.md`
- `KI-Wissen-Haushaltskosten/02 Wissen/00 Uebersichten/Aktueller Projektstatus.md`
- `KI-Wissen-Haushaltskosten/02 Wissen/Prozesse/Arbeitsworkflow Wissenspflege und Projektanfragen.md`

## Lokale Agent-Anbindung

`AGENTS.md` enthält die commitbaren Projektregeln. `AGENTS.local.md` ist lokal und nicht versioniert; dort wird das persönliche Haupt-Vault `mein-wissen` angebunden.
