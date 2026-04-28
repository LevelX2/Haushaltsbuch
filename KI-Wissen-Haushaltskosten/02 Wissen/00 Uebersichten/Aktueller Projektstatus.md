---
typ: uebersicht
status: aktiv
letzte_aktualisierung: 2026-04-28
quellen:
  - ../../00 Projektstart.md
  - ../../03 Betrieb/Log.md
  - ../../01 Rohquellen/fachkonzepte/2026-04-28 Erste Projektvorgabe Haushaltskosten.md
  - ../../01 Rohquellen/fachkonzepte/2026-04-28 Zweite Projektvorgabe Fullstack MVP Haushaltsbuch.md
  - ../../../docs/ARCHITEKTUR.md
tags:
  - status
---

# Aktueller Projektstatus

## Einordnung
Diese Seite beschreibt den aktuellen Projektstand als Snapshot. Zeitliche Abfolgen, einzelne Umsetzungsschritte und Verifikationen werden im [[../../03 Betrieb/Log]] geführt.

## Umgesetzt
- Das Repository ist als Git-Projekt initialisiert.
- Eine commitbare `AGENTS.md` mit projektbezogenen Regeln, Einstiegspunkten, Prioritätslogik, Branch-Strategie und lokalem Abschlusskontrakt ist angelegt.
- Eine lokale, nicht versionierte `AGENTS.local.md` bindet das persönliche Haupt-Vault `mein-wissen` und den Projekttyp `Web-Fachsystem` an.
- Die projektbezogene KI-Wissensbasis `KI-Wissen-Haushaltskosten/` ist mit Startstruktur, Index, Prozessseiten, Statusseite, Log und erster Rohquelle angelegt.
- `.editorconfig`, `.gitattributes`, `.gitignore` und ein kurzes `README.md` sind vorhanden.
- Die V1-Anwendung ist als Next.js-App mit App Router, TypeScript, Prisma Client und SQLite angelegt.
- Das Prisma-Schema modelliert Kostenpositionen, Zahlungen, Anbieter, Kategorien, Haushaltsbezüge, Dokumente, Importvorschläge, Reports, Backups, Einstellungen und Kostenpositionshistorie.
- Lokale Laufzeitordner und OneDrive-Ausgabeordner werden per Skript vorbereitet.
- Die SQLite-Datenbank wird lokal initialisiert und mit Startkategorien, Haushaltsbezügen, Standardanbieter und Pfadeinstellungen geseedet.
- Die UI enthält Dashboard, Kostenpositionen, einmalige Ausgaben, befristete Kosten, Fälligkeiten, Zahlungen, Anbieter, Kategorien, Dokumente, Prüfeingang, Reports, Backup/Export und Einstellungen.
- API-Endpunkte für alle V1-Arbeitsbereiche sind angelegt.
- PDF- und XLSX-Reports sowie SQLite-/JSON-Backups werden in die konfigurierten OneDrive-Ordner geschrieben.

## Teilweise umgesetzt
- Prüfeingang, Dokumente und Importvorschläge sind modelliert und manuell nutzbar, aber automatische Importlogik ist noch nicht umgesetzt.
- Historische Werte sind über `CostPositionVersion` vorbereitet; eine ausgereifte Historien-UI gibt es noch nicht.
- Plan/Ist ist durch getrennte Kostenpositionen und Zahlungen vorbereitet; automatische Abweichungserkennung ist noch offen.

## Offen
- Automatische PDF-, E-Mail-, Kontoauszugs- und Amazon-Auswertung.
- Dublettenlogik über mehrere Quellen.
- Wiederherstellung aus Backup als UI-Funktion.
- Geplanter oder automatischer Reportlauf über Windows-Aufgabenplanung.
- App-interner Fachwissenspool, falls später benötigt.

## Wichtige Grenzen
- Es gibt keine Benutzerverwaltung und keine Cloud-Datenbank.
- Die produktive SQLite-Datei liegt bewusst nicht in OneDrive.
- Prisma Client wird genutzt; die lokale Tabelleninitialisierung erfolgt zusätzlich über `scripts/init-db.mjs`, weil Prisma Migrate/DB Push in der aktuellen Node-24-Umgebung ohne verwertbare Detailmeldung aussteigt.
- Die erste V1 ist ein lokales MVP und noch keine vollständige Finanz-, Bank- oder Dokumentenanalyse.
