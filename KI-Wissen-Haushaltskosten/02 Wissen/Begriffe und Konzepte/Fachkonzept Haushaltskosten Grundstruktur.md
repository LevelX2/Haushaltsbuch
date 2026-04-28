---
typ: wissen
status: aktiv
letzte_aktualisierung: 2026-04-28
quellen:
  - ../../01 Rohquellen/fachkonzepte/2026-04-28 Erste Projektvorgabe Haushaltskosten.md
  - ../../01 Rohquellen/fachkonzepte/2026-04-28 Zweite Projektvorgabe Fullstack MVP Haushaltsbuch.md
tags:
  - fachkonzept
  - haushaltskosten
  - fixkosten
---

# Fachkonzept Haushaltskosten Grundstruktur

## Zweck
Diese Seite hält die fachliche Grundstruktur der Haushaltskosten-Anwendung fest. Seit der zweiten Projektvorgabe ist sie Grundlage für das V1-Datenmodell.

## Kernidee
Die Anwendung soll alle relevanten finanziellen Inputs zunächst erfassen und danach klassifizieren. Auswertungswirksam werden Inputs erst, wenn sie als Kostenposition oder Zahlung geprüft und fachlich eingeordnet sind.

## Kernobjekte
- `Kostenposition`: laufende, einmalige, befristete oder unklare Verpflichtung oder Ausgabe.
- `Zahlung`: konkrete oder erwartete Kontobewegung.
- `Dokument`: Quelle oder Beleg mit Metadaten und Dateipfad.
- `Importvorschlag`: Prüfobjekt, das den produktiven Bestand nicht automatisch verändert.
- `Anbieter`: Zahlungsempfänger oder Provider mit Aliaslogik.
- `Kategorie`: pflegbare Auswertungskategorie.
- `Haushaltsbezug`: optionaler Bezug auf Haushalt, Person oder Zweck.

## Klassifikation
Jeder Input erhält eine Wiederkehr:
- regelmäßig
- einmalig
- unklar

Zusätzlich erhält er eine zeitliche Begrenzung:
- unbefristet
- befristet bis Datum
- befristet nach Anzahl von Zahlungen/Raten
- unbekannt
- nicht relevant

`Befristet` ist keine Hauptklasse, sondern eine Eigenschaft.

## Zahlungsrhythmen
V1 unterstützt:
- monatlich
- zweimonatlich
- quartalsweise
- halbjährlich
- jährlich
- wöchentlich
- vierwöchentlich
- einmalig
- unregelmäßig
- benutzerdefiniert
- unklar

## Monatswert- und Jahreswertlogik
- monatlich: Jahreswert = Betrag * 12
- zweimonatlich: Jahreswert = Betrag * 6
- quartalsweise: Jahreswert = Betrag * 4
- halbjährlich: Jahreswert = Betrag * 2
- jährlich
- wöchentlich: Jahreswert = Betrag * 52
- vierwöchentlich: Jahreswert = Betrag * 13
- einmalig: Monats- und Jahreswert für Fixkosten = 0
- benutzerdefiniert: JSON-Regel mit `paymentsPerYear`, `everyMonths` oder `everyWeeks`

Einmalige Ausgaben bleiben separat auswertbar und werden nicht automatisch in den laufenden monatlichen Fixkostenblock eingerechnet.

## Startkategorien
Die Anwendung startet mit den Kategorien Wohnen, Energie, Wasser / Abwasser, Versicherungen, Telekommunikation, Mobilität / Auto, Gesundheit, Lebensmittel, Haushalt, Hund / Haustier, Abos / Medien, Bank / Finanzen, Steuern / Gebühren, Freizeit, Kleidung, Technik / Anschaffungen, Handwerker / Instandhaltung, Geschenke, Einnahmen, Sonstiges und Unklar.

## Status- und Vertrauensmodell
Relevante Informationen können sicher, geschätzt, automatisch erkannt, manuell bestätigt, zu prüfen, veraltet, ersetzt oder ignoriert sein.

KI- oder Importdaten dürfen nicht denselben Vertrauensstatus haben wie manuell bestätigte Daten und dürfen bestehende Daten nicht ungeprüft überschreiben.

## V1-Grenzen
V1 ist auf manuelle Erfassung, Dashboard, Listen, Berechnung, Fälligkeiten, Reports, Backup, Dokumentmetadaten und Prüfeingang fokussiert. Automatische PDF-, Kontoauszugs-, E-Mail- und Amazon-Importe sind fachlich vorbereitet, aber noch nicht umgesetzt.
