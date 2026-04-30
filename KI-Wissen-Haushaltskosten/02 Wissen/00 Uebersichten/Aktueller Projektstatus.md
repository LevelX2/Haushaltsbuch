---
typ: uebersicht
status: aktiv
letzte_aktualisierung: 2026-04-29
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
- Eine lokale, nicht versionierte `AGENTS.local.md` kann eine persönliche Wissensbasis und den Projekttyp `Web-Fachsystem` anbinden.
- Die projektbezogene KI-Wissensbasis `KI-Wissen-Haushaltskosten/` ist mit Startstruktur, Index, Prozessseiten, Statusseite, Log und erster Rohquelle angelegt.
- `.editorconfig`, `.gitattributes`, `.gitignore` und ein kurzes `README.md` sind vorhanden.
- Die V1-Anwendung ist als Next.js-App mit App Router, TypeScript, Prisma Client und SQLite angelegt.
- Das Prisma-Schema modelliert Kostenpositionen, Zahlungen, Anbieter, Kategorien, Haushaltsbezüge, Dokumente, Importvorschläge, Reports, Backups, Einstellungen und Kostenpositionshistorie.
- Lokale Laufzeitordner und OneDrive-Ausgabeordner werden per Skript vorbereitet.
- Die SQLite-Datenbank wird lokal initialisiert und mit Startkategorien, Haushaltsbezügen, Standardanbieter und Pfadeinstellungen geseedet.
- Die UI enthält Dashboard, Kostenpositionen, einmalige Ausgaben, befristete Kosten, Fälligkeiten, Zahlungen, Anbieter, Kategorien, Dokumente, Prüfeingang, Reports, Backup/Export und Einstellungen.
- Die UI enthält einen Arbeitsbereich `Ausgabenbelege`, der kopierten Amazon-Bestellseitentext in quellenneutrale Ausgabenbelege importieren kann.
- Die Seite `Zahlungen` kann CAMT-ZIP-Dateien aus einem lokalen Bankordner importieren; die beiden vorliegenden CAMT-Formate `.001.02` und `.001.08` werden über Dublettenprüfung auf Bankreferenz nicht doppelt angelegt.
- Der CAMT-Import liest Bankbeträge im XML-Punktformat korrekt als Centbeträge und kann bereits importierte Umsätze bei korrigierter Parserlogik aktualisieren.
- API-Endpunkte für alle V1-Arbeitsbereiche sind angelegt.
- Das Datenmodell unterscheidet Ausgabenbelege, Belegpositionen, Zahlungen und Zahlungsabgleiche; Amazon ist dabei nur die erste konkrete Importquelle.
- Ausgabenbelege können automatisch gegen echte Zahlungen abgeglichen werden. Starke Treffer werden als `AUTO_CONFIRMED`, plausible Treffer als `PROPOSED` und mehrdeutige Fälle als `AMBIGUOUS` im Zahlungsabgleich geführt.
- Die Ausgabenbelegliste zeigt den Abgleichstatus als filterbares Feld mit offen, Vorschlag, mehrdeutig, abgeglichen und nicht zahlungsrelevant.
- Früher als Zahlungen geführte Rechnungs-, Bescheid- und Forderungsdaten wurden als Ausgabenbelege übernommen; die alten Zahlungseinträge sind auf `IGNORED` gesetzt und erscheinen nicht mehr in der normalen Zahlungsliste.
- PDF- und XLSX-Reports sowie SQLite-/JSON-Backups werden in die konfigurierten OneDrive-Ordner geschrieben.
- Vor einem neuen Reportlauf werden ältere PDF-/XLSX-Reports aus dem Report-Stammordner nach `Archiv` verschoben, sodass direkt im Reportordner nur der aktuellste automatisch erzeugte Lauf liegt.

## Teilweise umgesetzt
- Prüfeingang, Dokumente und Importvorschläge sind modelliert und manuell nutzbar. Für Ausgabenbelege existiert ein erster Amazon-Textimport; für Zahlungen existiert ein erster CAMT-ZIP-Import mit automatischem Abgleich. PDF- und E-Mail-Import sind noch offen.
- Historische Werte sind über `CostPositionVersion` vorbereitet; eine ausgereifte Historien-UI gibt es noch nicht.
- Plan/Ist ist durch getrennte Kostenpositionen und Zahlungen vorbereitet; automatische Abweichungserkennung ist noch offen.

## Offen
- Automatische PDF- und E-Mail-Auswertung.
- Fachliche UI-Verfeinerung für Ausgabenbelege, insbesondere Einordnung als wiederkehrend, befristet, einmalig, privat oder ignoriert.
- Dublettenlogik über mehrere Quellen.
- Wiederherstellung aus Backup als UI-Funktion.
- Geplanter oder automatischer Reportlauf über Windows-Aufgabenplanung.
- App-interner Fachwissenspool, falls später benötigt.

## Wichtige Grenzen
- Es gibt keine Benutzerverwaltung und keine Cloud-Datenbank.
- Die produktive SQLite-Datei liegt bewusst nicht in OneDrive.
- Prisma Client wird genutzt; die lokale Tabelleninitialisierung erfolgt zusätzlich über `scripts/init-db.mjs`, weil Prisma Migrate/DB Push in der aktuellen Node-24-Umgebung ohne verwertbare Detailmeldung aussteigt.
- Die erste V1 ist ein lokales MVP und noch keine vollständige Finanz-, Bank- oder Dokumentenanalyse.
