---
typ: entscheidung
status: aktiv
letzte_aktualisierung: 2026-04-28
quellen:
  - ../../01 Rohquellen/fachkonzepte/2026-04-28 Zweite Projektvorgabe Fullstack MVP Haushaltsbuch.md
  - ../../../docs/ARCHITEKTUR.md
tags:
  - architektur
  - nextjs
  - prisma
  - sqlite
  - v1
---

# Technische Umsetzung V1 Next Prisma SQLite

## Entscheidung
Version 1 wird als lokale Next.js-Fullstack-App mit App Router, TypeScript, Prisma Client und SQLite umgesetzt.

## Begründung
Der Stack passt zur Vorgabe, Frontend und Backend zunächst nicht zu trennen. Serverseitige App-Router-Endpunkte übernehmen Datenbankzugriff, Berechnungslogik, Reportgenerierung, Dateioperationen, Backup und spätere Importvorbereitung.

## Lokale Datenhaltung
Die produktive SQLite-Datei liegt standardmäßig unter:

```text
C:\Users\Lui\AppData\Local\Haushaltsbuch\Haushaltsbuch.sqlite
```

OneDrive wird nicht als produktiver Datenbankort genutzt, sondern für Reports, Importordner, Backups und Exporte.

## Schema und Initialisierung
Das fachliche Schema ist in `prisma/schema.prisma` modelliert. Prisma Client wird als ORM genutzt.

Für die lokale Schemaanlage wird zusätzlich `scripts/init-db.mjs` verwendet. Grund: In der aktuellen Node-24-Umgebung validiert Prisma das Schema und generiert den Client erfolgreich, die Prisma-Migrate-/DB-Push-Schema-Engine bricht jedoch ohne Detailfehler ab. Die idempotente SQLite-Initialisierung hält die Anwendung lokal lauffähig und lässt Prisma weiter als ORM arbeiten.

## V1-Arbeitsbereiche
- Dashboard
- Kostenpositionen
- Einmalige Ausgaben
- Befristete Kosten
- Fälligkeiten
- Zahlungen
- Anbieter
- Kategorien
- Dokumente / Belege
- Prüfeingang
- Reports
- Backup / Export
- Einstellungen

## API-Vertrag
Die REST-ähnlichen Endpunkte liegen unter `src/app/api`. Sie sind in `docs/ARCHITEKTUR.md` tabellarisch dokumentiert.

## Qualitätsstand
Am 2026-04-28 verifiziert:
- `npm run app:prepare`
- `npm run typecheck`
- `npm run build`
- `npm audit --omit=dev`
- `/api/health`
- `/api/dashboard`
- Stammdaten-API
- Reportexport PDF/XLSX
- Backup SQLite/JSON

## Grenzen
- Keine Benutzerverwaltung.
- Keine Cloud-Datenbank.
- Keine automatische Bank-, Amazon-, E-Mail- oder PDF-Analyse.
- Prüfeingang ist für spätere Imports vorbereitet, aber KI-Import ist noch nicht implementiert.
- Wiederherstellung aus Backup ist konzeptionell vorbereitet, aber noch keine UI-Funktion.
