---
typ: betrieb
status: aktiv
letzte_aktualisierung: 2026-04-30
quellen:
  - ../../00 Steuerung/Regeldatei KI-Wissenspflege.md
  - ../../02 Wissen/Prozesse/Arbeitsworkflow Wissenspflege und Projektanfragen.md
tags:
  - betrieb
  - vorgaben
  - entwicklungsregeln
  - wiederverwendung
---

# Generische Entwicklungsvorgaben

## Zweck
Diese Seite sammelt projektinterne, wiederverwendbare Regeln und Entwicklungsvorgaben für das aktuelle Projekt `Haushaltskosten`.

Sie dient nicht dazu, jeden Einzelfall festzuhalten, sondern übertragbare Leitplanken zu sammeln:
- für neue Funktionen innerhalb dieses Projekts
- für spätere Überarbeitungen bestehender Bereiche
- als lokale Delta-Sammlung gegenüber dem führenden Haupt-Vault, wenn dort globale oder typspezifische Regeln bereits definiert sind

## Einordnung neuer Erkenntnisse
- Neue Erkenntnisse sollen nicht nur auf den konkreten Einzelfall beschrieben werden, sondern darauf geprüft werden, ob sie eine allgemeinere Regel für vergleichbare UI-, Modellierungs- oder Prozessfragen ausdrücken.
- Global oder typspezifisch ist eine Erkenntnis dann, wenn sie auch außerhalb dieses Projekts sinnvoll wiederverwendbar wäre; solche Regeln sollen nach Freigabe in das Haupt-Vault zurückgeführt werden.
- Projektintern generisch ist eine Erkenntnis dann, wenn sie innerhalb dieses Projekts für mehrere fachliche Seiten, ähnliche Stammdatenobjekte, weitere Formulare oder vergleichbare Systembestandteile sinnvoll wäre.
- Spezifisch ist eine Erkenntnis dann, wenn sie im Wesentlichen nur für einen einzelnen Sonderfall, eine konkrete Fachentscheidung oder einen eng begrenzten Ablauf gilt.
- Projektinterne generische Regeln gehören auf diese Seite.
- Spezifische Regeln gehören in die jeweils fachlich passende Wissensseite, damit die generischen Entwicklungsvorgaben schlank und wiederverwendbar bleiben.

## Startregel für dieses Projekt
- Bis weitere Vorgaben vorliegen, werden keine konkreten UI-, Architektur- oder Datenmodellentscheidungen festgeschrieben.
- Neue Anforderungen werden zuerst als Rohquelle oder klar referenzierte Quelle aufgenommen und danach in passende Wissensseiten überführt.
- Kostenperioden und durchschnittliche Monatskosten sind früh fachlich sauber zu definieren, bevor ein Datenmodell umgesetzt wird.

## Dateiablage nach Belegeingang
- Neue Belege werden im Eingang unter `C:\Users\Lui\OneDrive\Haushaltsbuch\Import\Rechnungseingang` geprüft.
- Im Rechnungseingang kann zusätzlich die Metadaten-Datei `_Rechnungseingang_Index.jsonl` liegen.
- Diese Datei wird von der Gmail- oder Dokumenteneingang-Routine gepflegt; jede Zeile ist ein eigenes JSON-Objekt zu genau einem Beleg.
- Das Haushaltsbuch soll vorhandene JSONL-Metadaten bevorzugt als Vorbefüllung nutzen, um OCR-Arbeit zu sparen.
- Die PDF-Datei bleibt trotzdem die verbindliche Primärquelle.
- Wenn ein Metadatenfeld fehlt, unsicher ist oder widersprüchlich wirkt, muss die PDF geprüft werden.
- Nach erfolgreicher Buchung kann der JSONL-Eintrag als verarbeitet markiert oder in ein verarbeitetes Log übernommen werden.
- Nach erfolgreicher Verarbeitung werden Rechnungen und rechnungsartige Belege in die dauerhafte Unterlagenablage verschoben:
  `C:\Users\Lui\OneDrive\Unterlagen\Rechnungen\<Jahr>`.
- Der in der Anwendung gespeicherte Dokumentpfad muss nach dem Verschieben auf den endgültigen Ablagepfad zeigen.
- Der Eingang soll nach einem abgeschlossenen Lauf nur noch die Rückmeldedatei oder bewusst offen gelassene Prüffälle enthalten.
- Gegenbelege, zum Beispiel PayPal-Belege zu einer vorhandenen Rechnung, dürfen ebenfalls abgelegt werden, zählen aber nicht als zusätzliche Ausgabe.
