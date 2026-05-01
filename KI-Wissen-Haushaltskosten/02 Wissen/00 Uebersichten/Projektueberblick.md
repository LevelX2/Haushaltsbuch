---
typ: uebersicht
status: aktiv
letzte_aktualisierung: 2026-05-01
quellen:
  - ../../00 Projektstart.md
  - ../../01 Rohquellen/fachkonzepte/2026-04-28 Erste Projektvorgabe Haushaltskosten.md
  - ../../01 Rohquellen/fachkonzepte/2026-04-28 Zweite Projektvorgabe Fullstack MVP Haushaltsbuch.md
  - ../../../docs/ARCHITEKTUR.md
tags:
  - projekt
  - ueberblick
---

# Projektüberblick

## Kurzbeschreibung
`Haushaltskosten` ist eine lokale Haushaltsbuch- und Fixkostenübersicht zur strukturierten Erfassung und Auswertung regelmäßiger, einmaliger, befristeter und unklarer Haushaltskosten.

## Aktueller Rahmen
- Die technische Umsetzung ist als Next.js-Fullstack-App mit TypeScript, Prisma Client und SQLite angelegt.
- Die Anwendung läuft lokal im Browser und speichert die produktive SQLite-Datenbank im AppData-Ordner.
- OneDrive wird für Reports, Importordner, Backup und Export genutzt.
- Automatische Import- und Codex-Zuordnungen laufen über App-APIs mit Preview, Apply, Regeln und Audit statt über direkte SQL-Schreibzugriffe.
- Das allgemeine Import-Pattern ist repo-lokal dokumentiert; persönliche Codex-Skills dürfen nur lokale Ausprägungen dieses Patterns sein.
- Die Projektumgebung bleibt auf wiki-first Arbeit, lokale Agent-Regeln und Anbindung an das Haupt-Vault vorbereitet.

## Fachliches Zielbild
Die Anwendung soll finanzielle Inputs eines Haushalts erfassen, klassifizieren und auswertbar machen. Der erste praktische Nutzen ist die Umrechnung aller laufenden Kosten unabhängig vom Zahlungsrhythmus auf eine monatliche Basis.

Im Mittelpunkt stehen:
- regelmäßige Kosten
- einmalige Ausgaben
- befristete Kostenpositionen
- unklare Vorgänge
- monatliche und jährliche Hochrechnung
- Fälligkeiten
- Kategorien, Anbieter und Haushaltsbezug
- Quellen, Belege und Prüfeingang
- Reportexport und Backup nach OneDrive

## Erwartete Wissensfelder
- Kostenpositionen, Zahlungen, Dokumente und Importvorschläge bleiben getrennte Objekte.
- Befristung ist eine Eigenschaft, keine eigene Hauptklasse.
- Import- und KI-Daten dürfen manuell bestätigte Daten nicht ungeprüft überschreiben.
- Codex darf als KI-Akteur Belege analysieren und strukturierte Importentscheidungen über lokale App-APIs anwenden; die Anwendung validiert Relationen, Status und Überschreibungsregeln.
- Einmalige Ausgaben zählen nicht automatisch in laufende monatliche Fixkosten.
- Spätere Importquellen sind PDF, E-Mail, Kontoauszug und Amazon, zunächst aber nur vorbereitet.

## Offener Punkt
Die V1-Anwendung ist lauffähig. Offen bleiben spätere Importautomatisierung, Plan/Ist-Abgleich, Dublettenlogik über mehrere Quellen und eine Wiederherstellungsfunktion aus Backup.
