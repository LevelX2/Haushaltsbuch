# Log

## 2026-04

### [2026-04-30] betrieb | Belegeingang verarbeitet und Ablagegrenzen festgelegt
- Anlass oder Quelle: Nutzerwunsch, den aktuellen Belegeingang zu prüfen und verarbeitete Rechnungen künftig nach der lokal definierten Rechnungsablage zu verschieben.
- Fachliche und betriebliche Festlegung:
  - Der Belegeingang ist die lokal definierte Arbeitsliste für neue Dokumente.
  - Persönliche lokale Pfade und systembezogene Ablageregeln werden über `AGENTS.local.md` im Haupt-Vault aufgelöst und nicht in commitbaren Repo-Dateien geführt.
  - Eine optionale JSONL-Metadaten-Datei kann pro Zeile ein JSON-Objekt mit Metadaten zu genau einem Beleg enthalten.
  - Vorhandene JSONL-Metadaten sollen als Vorbefüllung bevorzugt genutzt werden, die PDF bleibt aber die verbindliche Primärquelle.
  - Fehlende, unsichere oder widersprüchliche Metadaten müssen gegen die PDF geprüft werden.
  - Nach erfolgreicher Buchung kann der JSONL-Eintrag als verarbeitet markiert oder in ein verarbeitetes Log übernommen werden.
  - Nach erfolgreicher Verarbeitung werden Rechnungen und rechnungsartige Belege in die dauerhafte Rechnungsablage des passenden Jahres verschoben.
  - Die Anwendung speichert danach den endgültigen Dokumentpfad.
  - Gegenbelege werden nicht als zusätzliche Ausgabe gezählt.
- Verarbeitung:
  - 20 Eingangsdokumente wurden verarbeitet und in die lokal definierte Rechnungsablage für 2026 verschoben.
  - 20 `Document`-Einträge, 18 neue Ausgabenbelege und 1 neue prüfpflichtige Kostenposition `Apple iCloud+ 50 GB` wurden angelegt.
  - Der vorhandene APO-/PayPal-Vorgang über 35,37 EUR wurde auf die eigentliche apo-discounter-Rechnung als Hauptbeleg umgehängt, ohne eine doppelte Ausgabe anzulegen.
  - Bioscientia 118,56 EUR und ARGOS 20,00 EUR bleiben wegen nicht textuell auslesbarer PDFs als Prüffälle sichtbar.
- Verifikation:
  - Vor dem Lauf wurde eine lokale SQLite-Sicherung angelegt.
  - Der Rechnungseingang enthält nach dem Lauf nur noch die Rückmeldedatei.
  - Stichproben zeigen Dokumentpfade in der lokal definierten Rechnungsablage für 2026.

### [2026-04-30] umsetzung | Dashboard-Jahresübersicht auf Fixkosten und 12 Monate ausgerichtet
- Anlass oder Quelle: Nutzerwunsch, die Jahresübersicht stärker als Dashboard aufzubauen.
- Änderungen:
  - Die Startseitenübersicht stellt oben die erwartete monatliche Fixkostenbelastung als zentrale Kachel dar.
  - Die Fixkosten werden darunter nach Gruppen aufgeschlüsselt und zeigen Monatswert, Jahreswert und Anzahl der Positionen.
  - Die Ist-Kosten zeigen nun den laufenden Monat plus die 11 Monate davor.
  - Die 12-Monats-Liste zeigt je Monat Summe und Anzahl der zugrunde liegenden Zahlungen.
- Verifikation:
  - `npm run typecheck` erfolgreich.
  - Smoke-Check `GET /api/dashboard` auf dem laufenden lokalen Dev-Server erfolgreich.
  - `npm run build` durch Windows-Dateisperre bei `prisma generate` blockiert, während ein lokaler Next-Dev-Server lief.

### [2026-04-30] umsetzung | Zahlungstypen für Bargeldabhebung und Umbuchung ergänzt
- Anlass oder Quelle: Nutzerfrage zur Behandlung von Bargeldauszahlungen und regelmäßigen Überweisungen auf ein Aktiendepotkonto.
- Fachliche Festlegung:
  - Bargeldabhebungen und interne Umbuchungen sind echte Bankbewegungen, aber keine Haushaltsausgaben.
  - Sie bleiben in der Zahlungsliste sichtbar und filterbar.
  - Sie erzeugen keinen Ausgabenbeleg und zählen nicht in den Fixkostenblock.
  - Spätere Barzahlungen oder echte Ausgaben werden separat erfasst.
- Änderungen:
  - Neue Zahlungstypen `CASH_WITHDRAWAL` und `TRANSFER` ergänzt.
  - Deutsche Labels `Bargeldabhebung` und `Umbuchung` ergänzt.
  - Zahlungsformular akzeptiert die neuen Typen.
  - Zahlungsliste hat einen Filter `Zahlungstyp`.
  - Zahlungsliste hat eine freie Suche über Beschreibung, Anbieter, Kostenposition, Bankreferenz, Betrag, Zahlungstyp, Abgleichstatus und verknüpfte Ausgabenbelege.
  - CAMT-Import erkennt `BARGELDAUSZAHLUNG`/Geldautomat als `CASH_WITHDRAWAL`.
  - CAMT-Import erkennt Depot-/Verrechnungskonto-/Wertpapier-/Tagesgeld-/Umbuchungstexte als `TRANSFER`.
  - Bereits importierte Zahlungen wurden nachklassifiziert: 11 Bargeldabhebungen und 1 Umbuchung.
  - Die Zahlungsliste zeigt Kontoabgänge mit Minus und roter Zahl, Einnahmen und Erstattungen mit Plus und grüner Zahl.
- Verifikation:
  - `npm run prisma:generate` erfolgreich nach Stoppen des Dev-Servers.
  - `npm run typecheck` erfolgreich.
  - `npm run build` erfolgreich.

### [2026-04-30] korrektur | Beendete Kostenpositionen zusammenführbar gemacht
- Anlass oder Quelle: Nutzerhinweis, dass `Cosmos Autoversicherung alter Corsa Rückerstattung` nicht als Ziel/Partner der Zusammenführung auftauchte.
- Ursache:
  - Die Zusammenführungslogik und Zielauswahl erlaubten nur aktive Kostenpositionen.
  - Für beendete Altverträge ist das zu eng, weil Rückerstattungen oder Schlussabrechnungen in einen beendeten Vorgang umgehängt werden können müssen.
- Änderungen:
  - Zusammenführung erlaubt nun aktive und beendete Kostenpositionen, sofern sie nicht ersetzt, ignoriert oder veraltet sind.
  - Die Zielauswahl zeigt aktive und beendete nicht ersetzte Kostenpositionen.
  - UI-Überschrift von `Dublette zusammenführen` auf `Kostenposition zusammenführen` präzisiert.
  - Die Kostenposition `Cosmos Autoversicherung alter Corsa Rückerstattung` wurde in `Cosmos Autoversicherung alter Corsa` zusammengeführt und danach gelöscht.
  - Die verbleibende Kostenposition bündelt nun 2 Zahlungen, 2 Dokumente und 2 Ausgabenbelege.
- Verifikation:
  - `npm run typecheck` erfolgreich.

### [2026-04-30] umsetzung | Kostenpositionsliste mit direkten Aktionen erweitert
- Anlass oder Quelle: Nutzerwunsch, Kostenpositionen nicht erst über Scrollen zum Formular bearbeiten zu müssen und Verknüpfungen direkt aus der Liste sehen zu können.
- Änderungen:
  - Die Kostenpositionsliste hat eine neue Spalte `Aktion`.
  - `Bearbeiten` öffnet das Formular und scrollt automatisch dorthin.
  - `Verknüpfungen` lädt und zeigt Ausgabenbelege, Zahlungen, Dokumente und Historie direkt unter der jeweiligen Tabellenzeile.
  - Die Detailanzeige kann pro Zeile wieder ausgeblendet werden.
- Verifikation:
  - `npm run typecheck` erfolgreich.

### [2026-04-30] umsetzung | Wiederkehr-Filter in Kostenpositionen ergänzt
- Anlass oder Quelle: Nutzerwunsch, in den Kostenpositionen gezielt alle wiederkehrenden Zahlungen und deren Details sehen zu können.
- Änderungen:
  - Die Kostenpositionsliste hat einen Filter `Wiederkehr` mit `Wiederkehrend`, `Einmalig`, `Unklar` und `Alle`.
  - Die Hauptsicht `Kostenpositionen` ist standardmäßig auf `Wiederkehrend` voreingestellt.
  - Einmalige und unklare Positionen bleiben über den Filter erreichbar.
- Verifikation:
  - `npm run typecheck` erfolgreich.

### [2026-04-30] umsetzung | Verknüpfungen an Kostenpositionen sichtbar gemacht
- Anlass oder Quelle: Nutzerfrage, wie sichtbar wird, welche Ausgabenbelege und Zahlungen an einer Kostenposition hängen.
- Änderungen:
  - Der Detailendpunkt einer Kostenposition liefert nun Zahlungen, Ausgabenbelege, Dokumente und Versionen inklusive relevanter Anzeigeinformationen.
  - Im Kostenpositionsformular gibt es den Knopf `Verknüpfungen anzeigen`.
  - Nach Klick werden Ausgabenbelege, Zahlungen, Dokumente und Historie der geöffneten Kostenposition in einem eigenen Bereich angezeigt.
  - Der Bereich kann wieder ausgeblendet werden, damit das Bearbeiten der Stammdaten übersichtlich bleibt.
- Verifikation:
  - `npm run typecheck` erfolgreich.

### [2026-04-30] korrektur | Ersetzte Kostenpositions-Dubletten aus Bestand entfernt
- Anlass oder Quelle: Nutzerkorrektur, dass der Kostenpositionsbestand keine alten ersetzten Dubletten enthalten soll.
- Fachliche Festlegung:
  - Eine Kostenposition ist der zusammenfassende Vorgang.
  - Ausgabenbelege und Zahlungen hängen an dieser Kostenposition.
  - Dubletten werden nach Umhängen aller Bezüge gelöscht und nicht dauerhaft als ersetzte Kostenposition im Bestand gehalten.
  - Preisänderungen desselben Vorgangs werden über Versionen derselben Kostenposition abgebildet, nicht als neue Kostenposition.
- Änderungen:
  - Die Zusammenführungslogik löscht die Quell-Dublette nach erfolgreichem Umhängen von Zahlungen, Dokumenten, Ausgabenbelegen und Prüfvorschlägen.
  - Die UI beschreibt die Zusammenführung jetzt als Umhängen und anschließendes Löschen der Dublette.
  - Die alte leere Dublette `YouTube Premium Lite Start` wurde gelöscht.
  - `YouTube Premium Lite` ist die einzige verbleibende YouTube-Kostenposition und bündelt zwei Dokumentquellen, eine Zahlung und einen Ausgabenbeleg.
- Verifikation:
  - `npm run typecheck` erfolgreich.

### [2026-04-30] korrektur | Gegenseitige Zusammenführung von Kostenpositionen verhindert
- Anlass oder Quelle: Nutzerhinweis, dass nach weiterer Dubletten-Zusammenführung sowohl `YouTube Premium Lite` als auch `YouTube Premium Lite Start` als ersetzt erschienen und nicht mehr in der Prognose auftauchten.
- Ursache:
  - Nach der ersten korrekten Zusammenführung konnte die bereits ersetzte Position noch als Ziel einer erneuten Zusammenführung verwendet werden.
  - Dadurch wurde die aktive Zielposition versehentlich wieder in die ersetzte Dublette zurückgeführt.
- Korrektur:
  - `YouTube Premium Lite` wurde als aktive, manuell bestätigte Kostenposition wiederhergestellt.
  - `YouTube Premium Lite Start` bleibt beendet und ersetzt.
  - Dokumente, Zahlung und Ausgabenbeleg hängen wieder an der aktiven Position.
  - Die Zahlungsprognose enthält wieder genau einen YouTube-Eintrag.
  - Die Zusammenführungslogik blockiert künftig Quell- oder Zielpositionen, die nicht aktiv oder bereits ersetzt/ignoriert/veraltet sind.
  - Die UI-Zielauswahl zeigt nur noch aktive, nicht ersetzte Zielpositionen.
- Verifikation:
  - `npm run typecheck` erfolgreich.

### [2026-04-30] korrektur | Zielauswahl für Kostenpositions-Dubletten entfiltert
- Anlass oder Quelle: Nutzerhinweis, dass in der Dubletten-Zusammenführung faktisch nur die geöffnete oder aktuell gefilterte Position auswählbar war.
- Änderung:
  - Die Zielauswahl der Dubletten-Zusammenführung nutzt nun eine eigene ungefilterte Kostenpositionsliste.
  - Suche, Kategorie, Ansichtsmodus und Sortierung der aktuellen Tabelle schränken die Zielauswahl nicht mehr ein.
  - Die geöffnete Quellposition bleibt aus der Zielauswahl ausgeschlossen.
- Verifikation:
  - `npm run typecheck` erfolgreich.

### [2026-04-30] umsetzung | Doppelte Kostenpositionen zusammenführbar gemacht
- Anlass oder Quelle: Nutzerhinweis, dass `YouTube Premium Lite` und `YouTube Premium Lite Start` in der Zahlungsprognose doppelt erscheinen, obwohl es derselbe Vorgang ist.
- Fachliche Einordnung:
  - Die Dublette entstand aus zwei Quellen: Abo-Start-Hinweis vom 22.12.2025 und spätere Apple-Rechnung vom 22.04.2026.
  - Beide Quellen gehören zu einem laufenden Vorgang; die Prognose darf ihn nur einmal zählen.
- Änderungen:
  - Neuer API-Endpunkt `/api/cost-positions/[id]/merge` führt eine Kostenposition in eine Ziel-Kostenposition zusammen.
  - Beim Zusammenführen werden Zahlungen, Dokumente, Ausgabenbelege und Importvorschläge auf die Zielposition umgehängt.
  - Die Quellposition wird auf `ENDED` und `REPLACED` gesetzt.
  - In der Kostenpositions-Bearbeitung gibt es einen Bereich `Dublette zusammenführen`.
  - `YouTube Premium Lite Start` wurde in `YouTube Premium Lite` zusammengeführt; der Start-Hinweis hängt nun als Dokument an der bestätigten Zielposition.
- Verifikation:
  - `npm run typecheck` erfolgreich.
  - Zahlungsprognose enthält für YouTube nur noch einen Eintrag.

### [2026-04-30] umsetzung | Ausgabenbelege nach Quelle, Beleginfo und Datum filterbar gemacht
- Anlass oder Quelle: Nutzerhinweis, dass in den Ausgabenbelegen eine gezielte Suche nach Quelle und Beleginfo sowie ein Datumsfilter fehlen.
- Änderungen:
  - Die Ausgabenbelegliste hat ein Suchfeld `Quelle / Beleg`.
  - Die Suche berücksichtigt Quelle, Anbieter, Belegnummer, Titel, Notizen, verknüpfte Kostenposition und Belegpositionen.
  - Datumsfilter `Datum von` und `Datum bis` filtern über Belegdatum oder Fälligkeit.
  - Ein Button `Filter löschen` setzt Text-, Datums- und Statusfilter gemeinsam zurück.
- Verifikation:
  - `npm run typecheck` erfolgreich.

### [2026-04-30] umsetzung | Wiederkehrende Zahlung ohne Rechnungsbeleg übernehmbar gemacht
- Anlass oder Quelle: Nutzerbeispiel `Kontrafunk | Unterstützung | DAUERAUFTRAG`, eine freiwillige monatliche Dauerzahlung ohne Rechnungsbeleg.
- Fachliche Einordnung:
  - Solche Fälle sind keine Ausgabenbelege, sondern echte Zahlungen, aus denen eine wiederkehrende Kostenposition entstehen soll.
  - Ein künstlicher Rechnungsbeleg wäre fachlich irreführend; die Kostenposition hält Rhythmus, Kategorie, Betrag, Anbieter und Zahlungsart.
- Änderungen:
  - Neuer API-Endpunkt `/api/payments/[id]/recurring-cost-position` erstellt aus einer Zahlung eine aktive wiederkehrende Kostenposition.
  - Die Zahlungsliste bietet bei ausgewählter Zahlung ohne Kostenposition die Aktion `Zahlung ohne Beleg als Kostenposition übernehmen`.
  - Beim Übernehmen können Kategorie und Rhythmus gesetzt werden; gleichartige vorhandene Zahlungen werden automatisch verknüpft.
  - Der Kontrafunk-Fall wurde konkret angelegt: Kostenposition `Kontrafunk`, monatlich, Kategorie `Abos / Medien`, Zahlungsart `Dauerauftrag`, 10,00 EUR monatlich, 120,00 EUR jährlich, 4 vorhandene Zahlungen verknüpft.
- Verifikation:
  - `npm run typecheck` erfolgreich.

### [2026-04-29] korrektur | Zahlungen von Forderungs- und Rechnungsbelegen getrennt
- Anlass oder Quelle: Nutzerhinweis, dass aus Dokumentunterlagen importierte Rechnungen, Bescheide und sonstige Forderungen fachlich keine Zahlungen sind, sondern Ausgabenbelege. Zahlungen sollen tatsächliche Bank-, Karten-, PayPal- oder Barbewegungen bleiben.
- Erkenntnis:
  - Rechnungsbelege und Lieferantenforderungen beschreiben die Verpflichtung oder Ausgabe.
  - Bankauszüge, Kartenbelastungen, PayPal-Abbuchungen und Barzahlungen beschreiben den Zahlungsausgleich.
  - PayPal kann doppelt relevant sein: als Beleg-/Shopquelle und zusätzlich als Bankbewegung; die Bankbewegung muss später gegen den Beleg abgeglichen statt doppelt ausgewertet werden.
- Änderungen:
  - `PurchaseDocument` um `dueDate` und optionale Verknüpfung zur Kostenposition erweitert.
  - Zahlungsliste blendet `IGNORED`-Zahlungen standardmäßig aus.
  - 94 frühere Beleg-/Forderungszahlungen wurden als Ausgabenbelege übernommen.
  - Die ursprünglichen 94 `Payment`-Einträge wurden nicht gelöscht, sondern auf `IGNORED` gesetzt.
  - In `Zahlungen` bleiben für 2026 aktuell 342 echte Bankbewegungen sichtbar.
- Verifikation:
  - `npm run prisma:generate` erfolgreich.
  - `npm run db:init` erfolgreich.
  - `npm run typecheck` erfolgreich.
  - `npm run build` erfolgreich.

### [2026-04-29] umsetzung | Wiederkehr-Einschätzung für Ausgabenbelege korrigiert
- Anlass oder Quelle: Nutzerhinweis, dass die Anzeige `wiederkehrend möglich` fachlich zu grob war und offensichtlich einmalige Vorgänge wie Ordnungsamt oder Einzelkäufe falsch erscheinen ließ.
- Änderungen:
  - Ausgabenbelege verwenden nun die editierbaren Werte `wiederkehrend`, `potenziell wiederkehrend`, `einmalig` und `unklar`.
  - Die Ausgabenbelegliste zeigt die Wiederkehr-Einschätzung als Auswahlfeld, sodass sie direkt je Beleg geändert werden kann.
  - Die Vorbelegung nutzt vorrangig den Rhythmus einer verknüpften Kostenposition; `ONE_TIME` wird zu `einmalig`, laufende Rhythmen zu `wiederkehrend`.
  - Textheuristiken bleiben nur Fallback, etwa für Abo-/Premium-/Telekom-/Versicherungsbegriffe oder klare Einmalbegriffe wie Verwarnung, Bußgeld, Hotel, Handwerkerarbeiten und Bestellungen.
  - 95 vorhandene Ausgabenbelege wurden neu vorbelegt: 52 `wiederkehrend`, 41 `einmalig`, 1 `potenziell wiederkehrend`, 1 `unklar`.
- Verifikation:
  - `npm run typecheck` erfolgreich.

### [2026-04-29] umsetzung | Zahlungsabgleich manuell bestätigbar gemacht
- Anlass oder Quelle: Nutzerfrage, wie ein vorgeschlagener Zahlungsabgleich in den Ausgabenbelegen bestätigt werden kann.
- Änderungen:
  - Neuer API-Endpunkt `/api/payment-matches/[id]` aktualisiert den Status eines Zahlungsabgleichs.
  - Vorschläge und mehrdeutige Treffer können in der Ausgabenbelegliste bestätigt oder abgelehnt werden.
  - Bestätigung setzt `MANUAL_CONFIRMED`; Ablehnung setzt `REJECTED`.
- Verifikation:
  - `npm run typecheck` erfolgreich.
  - `/ausgabenbelege` und `/api/purchase-documents` lokal mit HTTP 200 geprüft.

### [2026-04-29] umsetzung | Zahlungsabgleich in Zahlungsliste sichtbar gemacht
- Anlass oder Quelle: Nutzerhinweis, dass in der Zahlungsliste nicht erkennbar war, ob eine Zahlung einem Ausgabenbeleg zugeordnet ist.
- Änderungen:
  - Die Zahlungs-API liefert Zahlungsabgleiche inklusive Ausgabenbeleg mit.
  - Die Zahlungsliste zeigt eine Spalte `Ausgabenbeleg` mit Abgleichstatus, Belegtitel, Belegbetrag und Match-Score.
  - Die Zahlungsliste kann nach Abgleichstatus `offen`, `Vorschlag`, `mehrdeutig` und `abgeglichen` gefiltert werden.
- Verifikation:
  - `npm run typecheck` erfolgreich.
  - `/zahlungen` lokal mit HTTP 200 geprüft.

### [2026-04-29] umsetzung | Reportordner archiviert alte Reportläufe
- Anlass oder Quelle: Nutzerwunsch, dass im OneDrive-Reportordner nur der aktuellste automatisch erzeugte Reportlauf direkt liegen soll.
- Änderungen:
  - `src/server/services/reporting.ts` verschiebt vorhandene PDF-/XLSX-Reports vor der Neuerzeugung nach `Reports/Archiv`.
  - Das Archiv wird bei Bedarf angelegt.
  - Bei Namenskonflikten im Archiv wird ein Zähler an den Dateinamen angehängt, damit keine archivierten Reports überschrieben werden.
  - `README.md`, `docs/ARCHITEKTUR.md` und die Statusseite beschreiben das neue Reportordner-Verhalten.

### [2026-04-29] umsetzung | CAMT-ZIP-Import für Bankzahlungen ergänzt
- Anlass oder Quelle: Nutzerhinweis auf Kontoauszüge 2026 im lokalen SPK-Ordner mit zwei CAMT-ZIP-Formaten sowie Hinweis, dass der Importknopf bei Ausgabenbelegen nicht funktioniert.
- Änderungen:
  - Der Ausgabenbeleg-Button `Einfügen` fängt fehlende Browser-Zwischenablageberechtigung ab und zeigt nun einen verständlichen Hinweis auf manuelles `Strg+V`.
  - Neuer Endpunkt `/api/payments/import/camt-directory` liest CAMT-ZIP-Dateien aus einem lokalen Ordner.
  - Die Zahlungen-Seite enthält einen Importbereich für lokale CAMT-ZIP-Ordner.
  - CAMT `.001.02` und `.001.08` werden unterstützt; Dubletten werden über die Bankreferenz übersprungen.
- Datenimport:
  - Aus dem lokalen SPK-Ordner wurden 2 ZIP-Dateien gelesen.
  - 684 CAMT-Umsatzdatensätze wurden erkannt.
  - 342 Zahlungen wurden angelegt.
  - 342 Dubletten aus dem zweiten Format wurden übersprungen.
- Verifikation:
  - `npm run typecheck` erfolgreich.
  - `npm run build` erfolgreich nach Stoppen des projektbezogenen Dev-Servers.

### [2026-04-29] wartung | GitHub-Vorprüfung für private Pfade und Gitignore
- Anlass oder Quelle: Nutzerwunsch, das Repository vor der GitHub-Anbindung auf persönliche Informationen, Datenbankdateien und fehlende Ignore-Regeln zu prüfen.
- Änderungen:
  - Commitbare Beispielpfade in `.env.example`, `README.md`, `docs/ARCHITEKTUR.md` und der technischen Entscheidungsseite wurden von benutzerspezifischen Windows-Pfaden auf generische Benutzerpfade umgestellt.
  - Die betroffenen Rohquellen wurden nach ausdrücklicher Nutzerfreigabe anonymisiert.
  - Die `README.md` wurde für GitHub-Sichtbarkeit mit Funktionsumfang, Schnellstart, lokalen Daten und Datenschutzhinweisen überarbeitet.
  - Seed-Daten und UI-Beispieltext verwenden keine persönlichen Namen mehr.
  - Wissensseiten zur lokalen Agent-Anbindung beschreiben die persönliche Wissensbasis generisch.
- Verifikation:
  - `.env`, `AGENTS.local.md`, `.next/`, `node_modules/`, `tmp/` und `tsconfig.tsbuildinfo` sind ignoriert.
  - Datenbankmuster `*.sqlite`, `*.sqlite3`, `*.db` sowie `data/` und lokale Dokumentordner sind in `.gitignore` abgedeckt.
  - `npm run typecheck` erfolgreich.

### [2026-04-29] wartung | MIT-Lizenz ergänzt
- Anlass oder Quelle: Nutzerentscheidung, vor der GitHub-Anbindung eine Lizenz in das Repository aufzunehmen.
- Änderungen:
  - `LICENSE` mit MIT-Lizenz und neutralem Rechteinhaber `Haushaltskosten contributors` angelegt.
  - `README.md` um einen kurzen Lizenzabschnitt ergänzt.

### [2026-04-29] wartung | GitHub Actions CI ergänzt
- Anlass oder Quelle: Nutzerwunsch, sinnvolle GitHub Actions für das Repository direkt in GitHub anzulegen.
- Änderungen:
  - `.github/workflows/ci.yml` ergänzt.
  - Der Workflow läuft bei Push auf `main` und bei Pull Requests.
  - Die CI nutzt `windows-latest` mit Node.js 24 und führt `npm ci`, `npm run typecheck`, `npm run build` und `npm audit --omit=dev` aus.
- Einordnung:
  - `windows-latest` passt zum aktuellen lokalen Zielbetrieb mit Windows-AppData- und OneDrive-Pfaden.

### [2026-04-29] umsetzung | Automatischer Zahlungsabgleich für Ausgabenbelege ergänzt
- Anlass oder Quelle: Nutzerfrage, ob Zahlungen automatisch Ausgabenbelegen zugeordnet werden können und wie Statusfelder und Filter das in der Anzeige widerspiegeln.
- Änderungen:
  - Ausgabenbelege können über `/api/purchase-documents/auto-match` automatisch gegen echte Zahlungen abgeglichen werden.
  - Matching nutzt Betrag, Belegnummer im Verwendungszweck, Anbieter-/Amazon-Erkennung, Artikelnähe und Datumsnähe.
  - Treffer werden in `PaymentMatch` mit Status `AUTO_CONFIRMED`, `PROPOSED` oder `AMBIGUOUS` geführt; offene und nicht zahlungsrelevante Fälle werden in der Anzeige abgeleitet.
  - Die Ausgabenbelegliste zeigt den Abgleichstatus mit Betrag, Datum und Score des besten Treffers und kann nach Abgleichstatus, Belegstatus und Wiederkehr-Einschätzung filtern.
  - CAMT-Beträge werden im XML-Punktformat korrekt gelesen; bereits importierte CAMT-Zahlungen können bei Parserkorrekturen aktualisiert statt nur übersprungen werden.
  - Die lokal importierten CAMT-Zahlungen aus einem lokalen Bankordner wurden nachkorrigiert.
- Ergebnis des ersten Abgleichlaufs:
  - 95 Ausgabenbelege geprüft.
  - 342 sichtbare Bankzahlungen vorhanden; 341 davon mit Betrag ungleich 0 für Matching berücksichtigt.
  - 1 Treffer automatisch bestätigt.
  - 16 Treffer als Vorschlag angelegt.
  - 74 geprüfte Ausgabenbelege bleiben offen.
- Verifikation:
  - `npm run typecheck` erfolgreich.
  - `npm run build` erfolgreich, nachdem laufende projektbezogene Next/Prisma-Prozesse beendet wurden.

### [2026-04-29] umsetzung | Dashboard-Kategorie- und Ist-Ausgabenansicht geschärft
- Anlass oder Quelle: Nutzerfrage, ob `Kosten nach Kategorie` tatsächliche Monatszahlungen oder hochgerechnete Monatskosten zeigt, und Wunsch nach einer kompakten Ist-Ausgabenansicht.
- Erkenntnis:
  - Die Kachel summiert pro Kategorie die normalisierten Monatswerte aktiver, wiederkehrender und auswertungswirksamer Kostenpositionen.
  - Einmalige Ausgaben und unklare oder nicht auswertungswirksame Positionen sind dort nicht enthalten.
- Änderung:
  - Der Hinweis steht jetzt kurz in der Überschrift `Kosten nach Kategorie (hochgerechnete Monatswerte)`.
  - Die Betriebskachel wurde unter die Kategorieauswertung verschoben.
  - Rechts neben der Betriebskachel zeigt eine neue Kachel die tatsächlichen gebuchten oder abgeglichenen Ausgaben der letzten drei Kalendermonate als Ist-Werte.

### [2026-04-29] umsetzung und fachkonzept | Quellenneutrale Ausgabenbelege für Shop-Bestellungen begonnen
- Anlass oder Quelle: Nutzerentscheidung, Amazon-Bestellungen nicht nur als Hilfsdaten zum Bankauszug zu nutzen, sondern als fachliche Ausgabenbelege zu modellieren; das Modell soll auch eBay, E-Mail-Belege, PDFs und andere Shopquellen aufnehmen können.
- Erkenntnis:
  - Ausgabenbelege beschreiben den fachlichen Kauf oder Rechnungsinhalt.
  - Bankumsätze beschreiben die tatsächliche Zahlung oder Erstattung und werden später gegen die Belege abgeglichen.
  - Der Abgleich entspricht einer einfachen offenen-Posten-Prüfung und darf Storno, Rücksendung, Erstattung, Sammelzahlung und unklare Fälle nicht verdecken.
- Änderungen:
  - Datenmodell um `PurchaseDocument`, `PurchaseItem` und `PaymentMatch` erweitert.
  - SQLite-Initialisierung um die neuen Tabellen und Indizes ergänzt.
  - Neue API-Endpunkte `/api/purchase-documents` und `/api/purchase-documents/import/amazon-text` angelegt.
  - Neue UI-Seite `Ausgabenbelege` mit Amazon-Textimport und Belegliste ergänzt.
  - Fachkonzept um den belegbasierten Zahlungsabgleich erweitert.
- Verifikation:
  - `npm run prisma:generate` erfolgreich nach Stoppen des projektbezogenen Next-Dev-Servers, der die Prisma-Engine-DLL blockierte.
  - `npm run db:init` erfolgreich.
  - `npm run typecheck` erfolgreich.
  - Parser-Stichprobe für kopierten Amazon-Bestellseitentext erfolgreich.

### [2026-04-28] umsetzung | Prüfeingang als fortlaufenden Beleg-Review verbessert
- Anlass oder Quelle: Nutzerhinweis, dass das Bestätigen der Belege zu umständlich ist und offene Belege direkt nacheinander angezeigt werden sollen.
- Änderungen:
  - Prüfeingang wählt nach dem Laden automatisch den nächsten offenen Beleg aus.
  - Belegangaben werden im Detailbereich prominenter mit Aktion, Quelle, Confidence, Erfassungsdatum und extrahierten Angaben angezeigt.
  - `Übernehmen`, `Ablehnen` und `Später` aktualisieren den Status und springen direkt zum nächsten offenen Beleg.
- Verifikation:
  - `npm run typecheck` erfolgreich.
  - `npm run build` konnte nicht abgeschlossen werden, weil `prisma generate` unter Windows die Prisma Query-Engine-DLL wegen `EPERM` nicht umbenennen konnte; ein lokaler Next-Dev-Server lief bereits auf Port 3000.

### [2026-04-28] umsetzung | Prüfeingang-Bestätigung ohne Scrollzwang nachgezogen
- Anlass oder Quelle: Nutzerhinweis, dass die Beleg-prüfen-Seite zu schmal und hoch war, sodass zum Bestätigen gescrollt werden musste.
- Änderungen:
  - Entscheidungsaktionen `Übernehmen`, `Später` und `Ablehnen` stehen jetzt oben im Prüfbereich.
  - Der Prüfbereich ist auf Desktop breiter gewichtet und innerhalb der rechten Spalte scrollbar, während die Aktionen sichtbar bleiben.
- Verifikation:
  - `npm run typecheck` erfolgreich.

### [2026-04-28] umsetzung | Extrahierte Belegdaten lesbarer formatiert
- Anlass oder Quelle: Nutzerhinweis, dass die Anzeige technischer Felder wie `amountCents` schlecht lesbar ist.
- Änderungen:
  - `amountCents` und andere Cent-Felder werden im Prüfeingang als Eurobetrag angezeigt.
  - Häufige technische Feldnamen erhalten in der Belegprüfung deutsche Anzeigenamen.
- Verifikation:
  - `npm run typecheck` erfolgreich.

### [2026-04-28] umsetzung | Manuelle Erfassungsformulare standardmäßig eingeklappt
- Anlass oder Quelle: Nutzerhinweis, dass manuelle Erfassungsformulare für Belege und ähnliche Eingaben selten genutzt werden und unnötig Platz belegen.
- Änderungen:
  - Erfassungsformulare für Kostenpositionen, Zahlungen und Dokumente sind initial eingeklappt und öffnen sich bei `Neu` oder beim Bearbeiten eines Listeneintrags.
  - Im Prüfeingang bleibt der Beleg-Review sichtbar; die manuellen Detailfelder darunter sind standardmäßig eingeklappt.
  - Formular-/Review-Panels stehen oberhalb der Listen, damit Tabellen die verfügbare Seitenbreite nutzen können.
  - Einheitliche Panel-Umschalter für manuelle Formularbereiche ergänzt.
- Verifikation:
  - `npm run typecheck` erfolgreich.
  - `npm run build` konnte nicht abgeschlossen werden, weil `prisma generate` unter Windows die Prisma Query-Engine-DLL wegen `EPERM` nicht umbenennen konnte.

### [2026-04-28] umsetzung | Fälligkeiten zur Zahlungsprognose umgebaut
- Anlass oder Quelle: Nutzerentscheidung, dass statt einer bloßen Fälligkeitsliste eine Prognose erwarteter regelmäßiger Zahlungen fachlich sinnvoller ist.
- Änderungen:
  - Neuer Endpunkt `/api/payment-forecast` berechnet erwartete nächste Zahlungen aus aktiven regelmäßigen Kostenpositionen.
  - Prognose nutzt als Basis zuerst `nextDueDate`, sonst die letzte gebuchte oder abgeglichene Zahlung, sonst das Startdatum der Kostenposition.
  - Zahlungsarten werden aus gepflegter Zahlungsart, Beschreibung oder Bankreferenz grob als Lastschrift, PayPal, Überweisung, Karte oder unklar klassifiziert.
  - Die bisherige Seite `/faelligkeiten` zeigt jetzt die Zahlungsprognose mit erwartetem Datum, Betrag, Rhythmus, Zahlungsart, Anbieter und Berechnungsbasis.
  - Zahlungsarten werden als kompakte Chips oberhalb der Liste angezeigt, damit die Prognosetabelle die Seite dominiert.
  - Die Prognosetabelle gruppiert erwartete Zahlungen nach Monat und zeigt pro Monat eine Zwischensumme.
  - Dashboard zeigt statt alter Fälligkeitsliste die nächsten erwarteten Zahlungen aus derselben Prognoselogik.
- Verifikation:
  - `npm run typecheck` erfolgreich.
  - Lokale HTTP-Prüfung von `/api/payment-forecast`, `/api/dashboard` und `/faelligkeiten` erfolgreich.
  - `npm run build` konnte nicht abgeschlossen werden, weil `prisma generate` unter Windows die Prisma Query-Engine-DLL wegen `EPERM` nicht umbenennen konnte.

### [2026-04-28] wissenspflege und datenpflege | Zusammengesetzte EVS-Bescheide mit Vorauszahlungen geklärt
- Anlass oder Quelle: Nutzerfrage zum `EVS Abfallgebührenbescheid 2022.pdf`, dessen importierter OCR-Text für die fachliche Nutzung nicht ausreichte.
- Erkenntnis:
  - Gebühren- und Abgabenbescheide mit Abrechnung, Vorauszahlungsbescheid, Fälligkeiten, Guthaben oder Nachzahlung müssen fachlich zerlegt werden.
  - Der Beleg bleibt Quelle; Abrechnungsteil, neue Kostenpositionsversion, Fälligkeiten und tatsächliche Verrechnungs- oder Zahlungsbeträge dürfen nicht vermischt werden.
- Datenpflege:
  - Der EVS-Beleg 2022 wurde als `BESCHEID` klassifiziert und mit der bestehenden Kostenposition `EVS Abfallgebühren` verknüpft.
  - Der Jahreswert der Vorauszahlung 2023 wurde mit `139,80 EUR` als historische Kostenpositionsversion ergänzt.
  - Vier Vorauszahlungs-Fälligkeiten für 2023 wurden als erwartete Vorauszahlungen aus dem Beleg angelegt; die erste Fälligkeit berücksichtigt das Guthaben aus 2022 und ist deshalb nur mit `8,15 EUR` als zu zahlender Betrag erfasst.
  - Der Importvorschlag wurde als übernommener zusammengesetzter Gebührenbescheid markiert.

### [2026-04-28] umsetzung | Dashboard-Prognose auf Monatssummen verdichtet
- Anlass oder Quelle: Nutzerhinweis, dass die nächsten erwarteten zu zahlenden Beträge im Dashboard nur Monatssummen zeigen sollen.
- Änderungen:
  - Dashboard gruppiert erwartete Zahlungen der nächsten 6 Monate jetzt nach Monat.
  - Die Monatssummen werden aus dem Prognoseumfang `Alle Zahlungen` berechnet und nicht auf die ersten Einzelzahlungen begrenzt.
  - Die Dashboard-Tabelle zeigt je Monat nur Anzahl erwarteter Zahlungen und Monatssumme, keine Einzelzahlungen mehr.
- Verifikation:
  - `npm run typecheck` erfolgreich.
  - `npx next build` erfolgreich.
  - `npm run build` konnte nicht abgeschlossen werden, weil `prisma generate` unter Windows die Prisma Query-Engine-DLL wegen `EPERM` nicht umbenennen konnte.

### [2026-04-28] umsetzung | Manuelle Einordnung und Kostengruppe im Prüfeingang ergänzt
- Anlass oder Quelle: Nutzerhinweis zum pur.AG-Beleg, der nicht automatisch ausreichend erkannt wurde und fachlich als 30-Tage-Abo für Nahrungsergänzungsmittel mit Personenbezug sowie passender Kostengruppe einzuordnen ist.
- Änderungen:
  - Im Beleg-Review ist die bestehende Notiz jetzt direkt als `Manuelle Einordnung` sichtbar.
  - Im Beleg-Review kann eine `Kostengruppe` aus den gepflegten Kategorien ausgewählt werden.
  - Beim Übernehmen, Zurückstellen oder Ablehnen eines Belegs werden diese Angaben zusammen mit dem Status gespeichert.
  - Das Fachkonzept hält fest, dass unzureichend automatisch erkannte Belege manuell mit Inhalt, Zweck, Kostengruppe und gegebenenfalls Haushalts- oder Personenbezug eingeordnet werden können müssen.
- Einordnung:
  - Es wurde kein neues Datenbankfeld benötigt; die manuelle Einordnung nutzt das vorhandene Notizfeld, die Kostengruppe wird strukturiert in den extrahierten Angaben des Importvorschlags mitgeführt.

### [2026-04-28] umsetzung | V1-Fullstack-App umgesetzt
- Anlass oder Quelle: zweite Projektvorgabe zur vollständigen lokalen Haushaltsbuch-/Fixkostenübersicht.
- Änderungen:
  - Neue Rohquelle `2026-04-28 Zweite Projektvorgabe Fullstack MVP Haushaltsbuch.md` aufgenommen.
  - Next.js-App mit App Router, TypeScript, Prisma Client und SQLite angelegt.
  - Datenmodell für Kostenpositionen, Zahlungen, Anbieter, Kategorien, Haushaltsbezüge, Dokumente, Prüfeingang, Reports, Backups, Einstellungen und Kostenpositionshistorie umgesetzt.
  - UI-Arbeitsbereiche für Dashboard, Kostenpositionen, einmalige Ausgaben, befristete Kosten, Fälligkeiten, Zahlungen, Anbieter, Kategorien, Dokumente, Prüfeingang, Reports, Backup/Export und Einstellungen erstellt.
  - API-Endpunkte für V1-Arbeitsbereiche angelegt.
  - Lokale Laufzeitordner und OneDrive-Ordner werden vorbereitet; SQLite-Schema wird idempotent initialisiert und Startdaten werden geseedet.
  - PDF-/XLSX-Reports und SQLite-/JSON-Backups implementiert.
  - README und `docs/ARCHITEKTUR.md` ergänzt.
  - Projektüberblick, Fachkonzept, Status, Quellenlage, Entscheidungsliste, Risiken und Index aktualisiert.
- Verifikation:
  - `npm run app:prepare` erfolgreich.
  - `npm run typecheck` erfolgreich.
  - `npm run build` erfolgreich.
  - `npm audit --omit=dev` ohne Findings.
  - Lokaler Server auf `http://localhost:3000` gestartet.
  - `/api/health`, `/api/dashboard`, Stammdaten-APIs, Reportexport und Backupexport erfolgreich geprüft.
- Einordnung:
  - V1 ist lokal nutzbar. Automatische Importlogik, Dublettenabgleich, Plan/Ist-Automation und Backup-Wiederherstellung bleiben spätere Ausbaustufen.

### [2026-04-28] umsetzung | Kategorie-Filter für Kostenpositionen ergänzt
- Anlass oder Quelle: Nutzerwunsch, Kostenpositionen nach Kategorie filtern zu können.
- Änderungen:
  - Die Toolbar der Kostenpositionen enthält jetzt einen Kategorie-Filter mit allen gepflegten Kategorien.
  - Der vorhandene API-Parameter `categoryId` wird beim Laden der Liste genutzt.
  - Ein aktiver Kategoriefilter kann direkt zurückgesetzt werden.
- Verifikation:
  - `npm run typecheck` erfolgreich.

### [2026-04-28] setup | Projektumgebung und Wissensbasis angelegt
- Anlass oder Quelle: Startauftrag zur Einrichtung von `Haushaltskosten` vergleichbar zum Projekt `Labordaten`.
- Änderungen:
  - Git-Projekt initialisiert und Arbeitsbranch `codex/ab-2026-04-28` angelegt.
  - `AGENTS.md` mit projektbezogenen Regeln, Pflicht-Einstieg, Haupt-Vault-Anbindung, Prioritätslogik, Branch-Strategie und Abschlusskontrakt angelegt.
  - `AGENTS.local.md` lokal angelegt und in `.gitignore` ausgeschlossen.
  - Projektbezogene Wissensbasis `KI-Wissen-Haushaltskosten/` mit Startseiten, Prozessseiten, Status, Log, Qualitätsprüfung und erster Rohquelle angelegt.
  - `.editorconfig`, `.gitattributes`, `.gitignore` und `README.md` ergänzt.
- Einordnung:
  - Es wurde bewusst noch keine ausführbare Anwendung und kein technischer App-Scaffold angelegt.
