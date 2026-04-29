# Log

## 2026-04

### [2026-04-28] umsetzung | Kategorie-Filter für Kostenpositionen ergänzt
- Anlass oder Quelle: Nutzerwunsch, Kostenpositionen nach Kategorie filtern zu können.
- Änderungen:
  - Die Toolbar der Kostenpositionen enthält jetzt einen Kategorie-Filter mit allen gepflegten Kategorien.
  - Der vorhandene API-Parameter `categoryId` wird beim Laden der Liste genutzt.
  - Ein aktiver Kategoriefilter kann direkt zurückgesetzt werden.
- Verifikation:
  - `npm run typecheck` erfolgreich.

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

### [2026-04-28] umsetzung | Extrahierte Belegdaten lesbarer formatiert
- Anlass oder Quelle: Nutzerhinweis, dass die Anzeige technischer Felder wie `amountCents` schlecht lesbar ist.
- Änderungen:
  - `amountCents` und andere Cent-Felder werden im Prüfeingang als Eurobetrag angezeigt.
  - Häufige technische Feldnamen erhalten in der Belegprüfung deutsche Anzeigenamen.
- Verifikation:
  - `npm run typecheck` erfolgreich.

### [2026-04-28] umsetzung | Prüfeingang-Bestätigung ohne Scrollzwang nachgezogen
- Anlass oder Quelle: Nutzerhinweis, dass die Beleg-prüfen-Seite zu schmal und hoch war, sodass zum Bestätigen gescrollt werden musste.
- Änderungen:
  - Entscheidungsaktionen `Übernehmen`, `Später` und `Ablehnen` stehen jetzt oben im Prüfbereich.
  - Der Prüfbereich ist auf Desktop breiter gewichtet und innerhalb der rechten Spalte scrollbar, während die Aktionen sichtbar bleiben.
- Verifikation:
  - `npm run typecheck` erfolgreich.

### [2026-04-28] umsetzung | Prüfeingang als fortlaufenden Beleg-Review verbessert
- Anlass oder Quelle: Nutzerhinweis, dass das Bestätigen der Belege zu umständlich ist und offene Belege direkt nacheinander angezeigt werden sollen.
- Änderungen:
  - Prüfeingang wählt nach dem Laden automatisch den nächsten offenen Beleg aus.
  - Belegangaben werden im Detailbereich prominenter mit Aktion, Quelle, Confidence, Erfassungsdatum und extrahierten Angaben angezeigt.
  - `Übernehmen`, `Ablehnen` und `Später` aktualisieren den Status und springen direkt zum nächsten offenen Beleg.
- Verifikation:
  - `npm run typecheck` erfolgreich.
  - `npm run build` konnte nicht abgeschlossen werden, weil `prisma generate` unter Windows die Prisma Query-Engine-DLL wegen `EPERM` nicht umbenennen konnte; ein lokaler Next-Dev-Server lief bereits auf Port 3000.

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
