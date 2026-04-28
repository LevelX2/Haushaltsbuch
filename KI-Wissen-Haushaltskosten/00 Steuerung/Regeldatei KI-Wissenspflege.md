# Regeldatei KI-Wissenspflege

## Zweck
Diese Wissensbasis dient der dauerhaften, strukturierten und verlinkten Dokumentation des Projekts `Haushaltskosten`.

## Projektgrenze
- Diese Wissensbasis behandelt nur dieses Projekt.
- Fachliche Nachbarprojekte oder allgemeine Notizen werden nicht eingemischt.

## Arbeitssprache
- Wissensseiten werden in klarem Deutsch gepflegt.
- In normalen deutschen Texten werden echte Umlaute und `ß` verwendet.
- Schreibweisen wie `ae`, `oe`, `ue` oder `ss` statt Umlaut oder Eszett sind nur für technische Bezeichner, Dateinamen, Pfade, Code-Symbole, IDs, bestehende Dateilinks oder originale Quellbezeichnungen zulässig.
- Technische Dateinamen, Modulnamen und IDs bleiben in ihrer Originalschreibweise.

## Primäre Quellen
- Primär gelten die in `01 Rohquellen` abgelegten Projektquellen.
- Repository-Dateien, Fachkonzepte, Nutzeranforderungen, Testdatenmodelle und relevante Dokumente sollen zuerst dort referenziert oder abgelegt werden.
- Bei Abweichungen zwischen älterer Dokumentation und aktuellem Code wird der Konflikt sichtbar gemacht statt stillschweigend geglättet.

## Mindeststandard pro neuer Quelle
1. Quelle vollständig lesen oder vollständig auswerten.
2. Kernaussagen, Begriffe, Entscheidungen, Prozesse, Risiken und offene Punkte erfassen.
3. Bezug zu bestehenden Wissensseiten prüfen.
4. Betroffene Seiten aktualisieren oder neu anlegen.
5. Verlinkungen und Quellenbasis ergänzen.
6. Index und Log aktualisieren.
7. Beachten, dass eine einzelne Quelle mehrere Wissensseiten berühren kann.

## Antwortregeln
- Antworten zum Projekt basieren primär auf dieser Wissensbasis.
- Antworten beginnen mit dem vorhandenen Wiki-Bestand, nicht mit erneuter Rohquellen-Suche.
- Dafür zuerst [[../02 Wissen/00 Uebersichten/Index]] lesen, dann relevante Wissensseiten, danach nur bei Bedarf Rohquellen oder externe Recherchen heranziehen.
- Wenn Aussagen nur konzeptionell dokumentiert, aber noch nicht umgesetzt sind, wird das offengelegt.
- Wenn der aktuelle Workspace eine abweichende Lage zeigt, wird diese als eigener Stand markiert.
- Wenn aus einer Antwort wiederverwendbares Wissen entsteht, wird dieses als neue oder aktualisierte Wissensseite zurück in die Wissensbasis geführt.

## Bevorzugte Seitentypen
- Übersichten
- Begriffe und Konzepte
- Entscheidungen
- Prozesse
- Risiken und offene Punkte
- Quellenbewertungen

## Qualitätsregeln
- Keine unbelegten Vermutungen.
- Widersprüche sichtbar kennzeichnen.
- Fakten, Interpretation und offene Punkte trennen.
- Größere Themen bei Wachstum in Unterseiten aufteilen.

## Betriebsdateien
- `Index.md` ist ein inhaltsorientierter Katalog der wichtigsten Wissensseiten. Jeder Eintrag soll mindestens Link und Kurzbeschreibung tragen.
- `Log.md` ist eine chronologische Verlaufsliste in absteigender Reihenfolge. Es nutzt Monatsblöcke im Format `## YYYY-MM`, der neueste Monat steht oben, und neue Einträge werden im obersten passenden Monatsblock direkt oben ergänzt.
- Log-Einträge sollen mit parsebarem Datumspräfix beginnen, bevorzugt `### [YYYY-MM-DD] typ | titel`.
- `Aktueller Projektstatus.md` ist eine verdichtete Zustandsübersicht des aktuellen Stands und kein Changelog. Die Seite soll den Projektstand als Snapshot zeigen, nicht die zeitliche Abfolge der Änderungen nacherzählen.
- Für `Aktueller Projektstatus.md` sind kompakte Rubriken wie `Umgesetzt`, `Teilweise umgesetzt`, `Offen` und `Wichtige Grenzen` zu bevorzugen. Detailverlauf, Verifikationen und einzelne Umsetzungsschritte gehören stattdessen ins `Log.md`.
- Für externe Webquellen soll nach Möglichkeit ein lokaler Snapshot in `01 Rohquellen` abgelegt werden. Wenn das nicht möglich ist, wird mindestens eine Rohquellen-Referenz mit URL und Abrufdatum angelegt.

## Lint-Regeln
- regelmäßig auf Widersprüche, veraltete Aussagen, Orphan-Seiten, fehlende Querverweise, fehlende Pflichtabschnitte und defekte Links prüfen
- wichtige Konzepte ohne eigene Seite als Erweiterungskandidaten markieren
- aus Lint-Ergebnissen konkrete Korrekturhinweise ableiten, nicht nur allgemeine Warnungen
