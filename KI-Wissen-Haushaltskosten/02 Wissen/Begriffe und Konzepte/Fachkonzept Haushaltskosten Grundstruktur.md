---
typ: wissen
status: aktiv
letzte_aktualisierung: 2026-04-29
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
- `Zahlung`: tatsächliche Zahlungsbewegung aus Bank, Karte, PayPal, Barzahlung oder vergleichbaren Zahlungswegen.
- `Dokument`: Quelle oder Beleg mit Metadaten und Dateipfad.
- `Ausgabenbeleg`: normalisierter fachlicher Einkaufs-, Bestell- oder Rechnungsbeleg aus Quellen wie Amazon, eBay, E-Mail, PDF oder manueller Erfassung.
- `Importvorschlag`: Prüfobjekt, das den produktiven Bestand nicht automatisch verändert.
- `Anbieter`: Zahlungsempfänger oder Provider mit Aliaslogik.
- `Kategorie`: pflegbare Auswertungskategorie.
- `Haushaltsbezug`: optionaler Bezug auf Haushalt, Person oder Zweck.

## Belegbasierter Zahlungsabgleich
Shop-Bestellungen, Rechnungen, Bescheide und E-Mail-Belege werden fachlich als eigene Ausgabenbelege behandelt. Sie beschreiben, was gekauft, berechnet oder gefordert wurde. Bankumsätze beschreiben dagegen nur, wann welcher Betrag tatsächlich bezahlt oder erstattet wurde.

Der Abgleich zwischen Ausgabenbeleg und Bankumsatz erfolgt daher wie eine einfache offene-Posten-Prüfung:
- Ein Ausgabenbeleg kann aus Amazon, eBay, PayPal, E-Mail, PDF, manuellem Eintrag oder einer anderen Quelle stammen.
- Eine Zahlung kann später gegen einen oder mehrere Ausgabenbelege vorgeschlagen oder bestätigt werden.
- Rechnungen, Beitragsrechnungen, Bescheide, Schlussrechnungen, Verwarnungs- oder Bußgeldbescheide sind Forderungen oder Gutschriften und gehören nicht als echte Zahlung in die Zahlungsliste.
- Erwartete oder fällige Beträge aus Belegen bleiben am Ausgabenbeleg oder an einer Kostenposition nachvollziehbar; sie werden erst durch Bank-, Karten-, PayPal- oder Barbewegung zur Zahlung.
- Stornierungen, Rücksendungen, Erstattungen, Teilerstattungen und Sammelabbuchungen müssen als Prüfstatus sichtbar bleiben.
- Nicht jeder Ausgabenbeleg wird automatisch zur laufenden Haushaltskostenposition. Erst die fachliche Einordnung entscheidet, ob der Beleg als Fixkostenkandidat, einmalige Ausgabe, private Ausgabe, Erstattung oder ignorierter Vorgang behandelt wird.

Der Zahlungsabgleich wird als eigene Beziehung zwischen Ausgabenbeleg und Zahlung geführt. Dadurch bleiben Beleg und tatsächliche Kontobewegung fachlich getrennt, können aber gemeinsam geprüft werden. Automatische Treffer verwenden mindestens Betrag, Datum, Anbietertext, Belegnummer oder ähnliche Verwendungszweckdaten. Sichere Treffer können als `AUTO_CONFIRMED` geführt werden, unsichere als `PROPOSED`, mehrdeutige als `AMBIGUOUS`. Manuelle Bestätigung oder Ablehnung bleibt als spätere Prüffunktion möglich.

In Anzeigen soll der Abgleichstatus filterbar sichtbar sein:
- `offen`: kein plausibler Zahlungsabgleich vorhanden
- `Vorschlag`: ein plausibler, aber noch nicht bestätigter Treffer
- `mehrdeutig`: mehrere ähnlich plausible Treffer
- `abgeglichen`: automatisch oder manuell bestätigter Treffer
- `nicht zahlungsrelevant`: etwa stornierte Belege oder Nullbeträge

Die Wiederkehr-Einschätzung eines Ausgabenbelegs ist eine editierbare fachliche Vorentscheidung und keine automatische Wahrheit. Sinnvolle Anzeigenwerte sind:
- `wiederkehrend`: klare laufende Verpflichtung oder Abo, zum Beispiel Telekom Festnetz, Apple Services, jährliche Versicherung oder Super Duolingo als Jahresabo
- `potenziell wiederkehrend`: Quelle oder Text deutet auf Abo, Versorgung oder wiederholten Bedarf hin, ist aber noch nicht sicher genug für eine Kostenposition
- `einmalig`: Bestellung, Verwarnungsgeld, Bußgeld, Handwerkerrechnung, Einzelkauf oder sonstiger singulärer Vorgang
- `unklar`: nicht genug Information

Wenn ein Ausgabenbeleg aus einer bereits gepflegten Kostenposition entsteht, soll die Vorbelegung vorrangig aus deren Rhythmus kommen. `ONE_TIME` wird zu `einmalig`; Monats-, Quartals-, Jahres- und ähnliche Rhythmen werden zu `wiederkehrend`. Reine Textheuristiken dürfen höchstens vorbelegen und müssen in der Liste änderbar bleiben.

Nicht jede wiederkehrende Ausgabe hat einen Rechnungs- oder Einkaufsbeleg. Daueraufträge, freiwillige Unterstützungszahlungen, Spenden, Mitgliedsbeiträge oder ähnliche selbst ausgelöste regelmäßige Zahlungen dürfen direkt aus der Zahlung heraus als Kostenposition übernommen werden. In diesem Fall ist die Zahlung selbst der fachliche Auslöser; ein Ausgabenbeleg wird nicht künstlich erzeugt. Die Kostenposition hält Rhythmus, Kategorie, Betrag, Anbieter und Zahlungsart, während die vorhandenen und künftigen Zahlungen dagegen verknüpft werden.

Bargeldabhebungen und interne Umbuchungen sind eigene Zahlungstypen, aber keine Haushaltsausgaben. Eine Bargeldabhebung beschreibt nur den Wechsel von Bankkonto zu Bargeldbestand. Eine Umbuchung beschreibt Vermögensumschichtung, zum Beispiel Girokonto zu Depot, Verrechnungskonto oder Tagesgeld. Beide bleiben in der Zahlungsliste sichtbar und filterbar, sollen aber nicht als Ausgabenbeleg erzeugt und nicht in den Haushaltskostenblock eingerechnet werden. Die eigentliche Ausgabe entsteht erst durch spätere Barzahlung oder durch einen echten Ausgabenbeleg/Zahlungsvorgang.

Wenn mehrere Quellen denselben laufenden Vorgang erzeugen, etwa ein Abo-Start-Hinweis und eine spätere Rechnung, dürfen daraus nicht dauerhaft mehrere Kostenpositionen entstehen. Die fachlich richtige Behandlung ist eine Zusammenführung auf eine Ziel-Kostenposition. Dabei werden Zahlungen, Dokumente, Ausgabenbelege und Prüfvorschläge auf die Zielposition umgehängt. Die leere Dublette wird danach gelöscht, damit der Kostenpositionsbestand kein Altlastenregister wird. Die Quellenlage bleibt an der Zielposition über Dokumente, Ausgabenbelege, Zahlungen, Notizen und Versionen nachvollziehbar.

Preisänderungen desselben Vertrags, Abos oder laufenden Vorgangs sollen nicht als neue Kostenposition entstehen. Sie werden als Version oder Historieneintrag derselben Kostenposition geführt. Nur ein fachlich neuer Vertrag, Anbieterwechsel oder klar getrenntes Produkt soll eine neue Kostenposition erzeugen.

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

Wenn ein Beleg nicht ausreichend automatisch erkannt wird, muss im Prüfeingang eine manuelle Einordnung ergänzt werden können. Diese Einordnung beschreibt den fachlichen Inhalt oder Zweck des Belegs, zum Beispiel ein 30-Tage-Abo für Nahrungsergänzungsmittel und den Haushalts- oder Personenbezug. Zusätzlich soll im Prüfeingang eine Kostengruppe aus den gepflegten Kategorien angegeben werden können. Diese Angaben unterstützen die spätere korrekte Klassifikation, ohne den produktiven Bestand automatisch zu verändern.

## Zusammengesetzte Bescheide mit Vorauszahlungen
Gebühren- und Abgabenbescheide können mehrere fachliche Vorgänge in einem Dokument enthalten. Typisch sind eine endgültige Abrechnung für einen zurückliegenden Zeitraum, ein neuer Vorauszahlungsbescheid für den Folgezeitraum, eine Fälligkeitstabelle sowie Guthaben, Nachzahlungen oder Verrechnungen.

Solche Belege dürfen nicht nur als einzelner OCR-Text oder als einzelner Gesamtbetrag übernommen werden. Die Anwendung muss sie fachlich zerlegen:
- Der Beleg bleibt als Quelle mit Bescheidart, Datum, Anbieter, Objekt oder Aktenzeichen erhalten.
- Der Abrechnungsteil beschreibt den endgültig festgesetzten Betrag für den abgerechneten Zeitraum.
- Der Vorauszahlungsteil beschreibt die neue laufende Kostenposition oder Kostenpositionsversion mit Gültigkeitszeitraum und Jahresbetrag.
- Fälligkeiten werden als erwartete Zahlungen oder Forderungspositionen erfasst.
- Guthaben, Nachzahlungen und Verrechnungen werden getrennt von der laufenden Kostenposition dokumentiert, damit Planwert, tatsächliche Kontobewegung und Auswertung nicht vermischt werden.

Beispiele sind Abfallgebühren, Grundsteuer, Wasser und Abwasser, Energieabschläge und ähnliche öffentliche oder versorgerbezogene Bescheide.

## V1-Grenzen
V1 ist auf lokale Erfassung, Dashboard, Listen, Berechnung, Fälligkeiten, Reports, Backup, Dokumentmetadaten, Prüfeingang, ersten Amazon-Textimport, ersten CAMT-ZIP-Import, ersten automatischen Zahlungsabgleich, editierbare Wiederkehr-Einschätzungen und wiederkehrende Zahlungen ohne Rechnungsbeleg fokussiert. Automatische PDF- und E-Mail-Importe sowie quellenübergreifende Dubletten- und Sammelzahlungslogik sind fachlich vorbereitet, aber noch nicht vollständig umgesetzt.
