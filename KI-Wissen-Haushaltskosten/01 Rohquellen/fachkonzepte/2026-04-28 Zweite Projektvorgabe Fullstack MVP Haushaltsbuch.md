# Zweite Projektvorgabe Fullstack-MVP Haushaltsbuch

## Quelle
- Typ: Chatauftrag des Nutzers
- Datum: 2026-04-28
- Anlass: Umsetzung der Anwendung von Grund auf als lokales MVP

## Kernaussage
Die Anwendung `Haushaltskosten` soll als lokale Haushaltsbuch- und Fixkostenübersicht umgesetzt werden. Im Mittelpunkt steht eine zuverlässige Übersicht aller regelmäßigen, einmaligen und befristeten Haushaltskosten. Der erste Nutzen ist die Umrechnung unterschiedlicher Zahlungsrhythmen auf eine monatliche Basis.

## Technische Vorgabe
- lokale Fullstack-Webanwendung
- Next.js mit App Router
- TypeScript
- SQLite als lokale Datenbank
- Prisma als ORM
- lokale Dateiablage für Dokumente und Importdateien
- browserbasierte Desktop-Oberfläche mit responsiver Darstellung
- Reportexport nach OneDrive
- keine produktive SQLite-Datei direkt in OneDrive

Standardpfade:

```text
C:\Users\<Benutzer>\AppData\Local\Haushaltsbuch
├─ Haushaltsbuch.sqlite
├─ logs
└─ temp

C:\Users\<Benutzer>\OneDrive\Haushaltsbuch
├─ Reports
├─ Import
├─ Backup
├─ Export
└─ Dokumente_optional
```

## V1-Umfang
Version 1 soll schlank bleiben und unmittelbar nutzbar sein:
- manuelle Erfassung von regelmäßigen Kostenpositionen
- manuelle Erfassung einmaliger Ausgaben
- manuelle Erfassung befristeter Kostenpositionen
- Anbieter/Zahlungsempfänger
- Kategorien
- Zahlungsrhythmen
- Fälligkeiten
- Beginn und Ende von Kostenpositionen
- Status und Prüfstatus
- automatische Monatswert- und Jahreswertberechnung
- Dashboard
- Listenansicht, Filter und Suche
- einfache Auswertungen
- Reportexport nach OneDrive
- Backup/Export

Nicht zwingend in V1:
- automatische PDF-Analyse
- KI-Import
- E-Mail-Auswertung
- Kontoauszugsimport
- Amazon-Import
- automatische Bankabstimmung
- mobile Live-Bearbeitung
- Benutzerverwaltung
- Cloud-Datenbank
- mehrere Haushalte/Mandanten

## Zentrale fachliche Objekte
- `CostPosition`: laufende, einmalige, befristete oder unklare Verpflichtung oder Ausgabe.
- `Payment`: konkrete oder erwartete Kontobewegung; nicht identisch mit einer Kostenposition.
- `Document`: Beleg oder Quelle mit Metadaten, Pfad, Hash und Verknüpfungen; Datei nicht als Blob in der Datenbank.
- `ImportSuggestion`: Prüfeingang für automatische oder manuelle Vorschläge, ohne automatische Veränderung des produktiven Bestands.
- `Provider`: Anbieter oder Zahlungsempfänger mit Aliaslogik.
- `Category`: pflegbare Kategorie.
- `HouseholdScope`: optionaler Haushaltsbezug.

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

Befristung ist keine Hauptklasse, sondern eine Eigenschaft.

## Zahlungsrhythmen
Unterstützt werden sollen:
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

Benutzerdefinierte Rhythmen sollen perspektivisch Zahlungen pro Jahr, Monate/Wochen-Intervalle, Ratenanzahl, Startdatum und Enddatum abbilden.

## Monatswert- und Jahreswertlogik
- monatlich: Monatswert = Betrag
- jährlich: Monatswert = Betrag / 12
- halbjährlich: Monatswert = Betrag / 6
- quartalsweise: Monatswert = Betrag / 3
- zweimonatlich: Monatswert = Betrag / 2
- wöchentlich: Jahreswert = Betrag * 52, Monatswert = Jahreswert / 12
- vierwöchentlich: Jahreswert = Betrag * 13, Monatswert = Jahreswert / 12
- einmalig: Monatswert für Fixkosten = 0; Betrag bleibt als einmalige Ausgabe auswertbar
- befristete Zahlung: Monatswert je nach Betrachtungslogik berechnen und als befristet kennzeichnen

## Kategorien
Startliste:
Wohnen, Energie, Wasser / Abwasser, Versicherungen, Telekommunikation, Mobilität / Auto, Gesundheit, Lebensmittel, Haushalt, Hund / Haustier, Abos / Medien, Bank / Finanzen, Steuern / Gebühren, Freizeit, Kleidung, Technik / Anschaffungen, Handwerker / Instandhaltung, Geschenke, Einnahmen, Sonstiges, Unklar.

## Haushaltsbezug
Optionaler Bezug:
gesamter Haushalt, Person 1, Person 2, Hund / Haustier, Haus / Immobilie, Auto, sonstige Person, sonstiger Zweck, unklar.

## Belege und Dokumente
Zu unterscheiden sind unter anderem Rechnung, Dauerrechnung, Beitragsrechnung, Beitragsmitteilung, Vertrag, Vertragsänderung, Kündigungsbestätigung, Abschlagsplan, Jahresabrechnung, Bescheid, Zahlungsaufforderung, Mahnung, Gutschrift, Rückerstattung, Kontoauszug, Kreditkartenabrechnung, Zahlungsdienstleister-Beleg, Kassenbon, Angebot, Auftragsbestätigung, Versicherungsunterlage, Darlehensunterlage, Leasingplan, Miet-/Nebenkostenunterlage, Wartungsvertrag, Abo-Bestätigung, Einkommensbeleg und Steuerbescheid.

Fachliche Hauptgruppen:
1. Zahlungsbelege
2. Vertrags- und Stammdatenbelege
3. Änderungsbelege
4. Abrechnungsbelege
5. Konto- und Zahlungsdaten
6. Einkommensbelege
7. Planungs- und Vorstufenbelege
8. Sonderbelege

Angebote dürfen nicht automatisch als Ausgabe zählen. Mahnungen dürfen nicht als neue Kostenposition behandelt werden. Gutschriften und Rückerstattungen müssen als Korrektur oder Einnahme mit Bezug verarbeitet werden können.

## Zahlungen und Abrechnungen
Zu unterscheiden sind normale Ausgabe, Abschlag, Vorauszahlung, Nachzahlung, Gutschrift, Rückerstattung, Storno, Korrektur, Umbuchung und Einnahme.

Beispiel Strom:
- monatlicher Abschlag = regelmäßige Kostenposition
- Jahresnachzahlung = einmalige Ausgabe mit Bezug zur Kostenposition
- Guthaben = Rückerstattung mit Bezug zur Kostenposition
- neuer Abschlagsplan = Änderungsvorschlag

## Prüfeingang und Vertrauen
Im Prüfeingang landen neue Importvorschläge, unklare Belege, mögliche neue Kostenpositionen, Änderungsvorschläge, unbekannte Zahlungen, mögliche Dubletten und Daten mit geringer Sicherheit.

Status-/Vertrauenswerte:
- sicher
- geschätzt
- automatisch erkannt
- manuell bestätigt
- zu prüfen
- veraltet
- ersetzt
- ignoriert

Import- oder KI-Daten dürfen bestehende manuelle Daten nicht ungeprüft überschreiben.

## Historie, Plan/Ist und Dubletten
Kostenpositionen sollen perspektivisch historische Werte mit Gültigkeitszeitraum unterstützen. Tatsächliche Zahlungen sollen Plan/Ist-Abweichungen erzeugen, aber nicht automatisch den Plan überschreiben. Mehrere Quellen dürfen auf denselben Vorgang verweisen; derselbe Vorgang darf aber nur einmal auswertungswirksam werden.

## Reports und Backup
Button: `Reports aktualisieren`

Vorgesehene Reports:
1. Fixkostenübersicht aktuell
2. Monatsbelastung nach Kategorien
3. Fälligkeiten der nächsten 90 Tage
4. Prüf- und Klärungsliste
5. Jahresübersicht

Formate:
- PDF
- XLSX
- optional HTML, CSV, JSON

Zusätzlich:
- Backup der SQLite-Datenbank
- JSON-Gesamtexport
- CSV-/Excel-Export der Kostenpositionen
- Backup-Ordner in OneDrive
- Wiederherstellung konzeptionell vorbereiten

## Spätere Importe
Vorbereitet, aber nicht V1:
- PDF-/Bildanalyse
- E-Mail-Analyse
- Kontoauszugsimport
- Amazon-Auswertung
- KI-Strukturierung in Importvorschläge

Grundregel: KI-Ergebnisse dürfen den Datenbestand nicht direkt verändern, sondern landen im Prüfeingang.

## Priorisierte Umsetzung
Phase 1: Next.js/TypeScript/Prisma/SQLite, Datenmodell, manuelle Erfassung, Monats-/Jahreswert, Dashboard, Listen, Filter, Suche.  
Phase 2: Einmalige/befristete Kosten, Fälligkeiten, Statusmodell, Notizen, Zahlungserfassung.  
Phase 3: Reports nach OneDrive, PDF, XLSX, Backup/Export.  
Phase 4: Dokumente/Belege, Importordner, Prüfeingang.  
Phase 5: KI-/PDF-Import, Kontoauszüge, Plan/Ist.  
Phase 6: E-Mail, Amazon und erweiterte Analyse.

## Zentrale Leitregel
Die Anwendung muss alle Inputs zunächst erfassen, darf sie aber erst nach Klassifikation und Prüfung auswertungswirksam machen. Belege, Zahlungen, Kostenpositionen und Quellen müssen getrennt behandelt werden, damit keine Dubletten entstehen und regelmäßige Kosten nicht mit einmaligen Zahlungen vermischt werden.
