---
typ: offene-punkte
status: aktiv
letzte_aktualisierung: 2026-04-28
quellen:
  - ../../01 Rohquellen/fachkonzepte/2026-04-28 Erste Projektvorgabe Haushaltskosten.md
  - ../../01 Rohquellen/fachkonzepte/2026-04-28 Zweite Projektvorgabe Fullstack MVP Haushaltsbuch.md
tags:
  - risiko
  - offene-punkte
---

# Risiken und offene Punkte

## Offene Fachfragen
- Wie detailliert sollen Plan/Ist-Abweichungen später automatisch erkannt und bewertet werden?
- Welche Dublettenregeln gelten priorisiert für Amazon, E-Mail, PDF-Rechnung und Bankumsatz?
- Wie soll die Wiederherstellung aus Backup fachlich freigegeben und technisch abgesichert werden?
- Welche Dokumenttypen benötigen für den späteren KI-Import eigene Extraktionsregeln?

## Offene technische Fragen
- Soll später ein geplanter Reportlauf über Windows-Aufgabenplanung eingerichtet werden?
- Soll der spätere Heimnetz- oder Tailscale-Zugriff weiterhin ohne Benutzerverwaltung bleiben oder eine lokale Authentifizierung bekommen?
- Soll Prisma Migrate erneut geprüft werden, wenn Node-/Prisma-Versionen wechseln?

## Aktuelle Risiken
- Automatische Importlogik kann Dubletten oder falsche Überschreibungen erzeugen, wenn sie nicht strikt über den Prüfeingang läuft.
- Reportdateien in OneDrive können sensible Daten enthalten; der reduzierte Mobilreport sollte vor breiter Nutzung bewusst gestaltet werden.
- Die manuelle SQLite-Initialisierung muss bei Schemaänderungen konsequent nachgezogen werden, solange Prisma Migrate lokal nicht genutzt wird.
