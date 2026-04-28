---
typ: prozess
status: aktiv
letzte_aktualisierung: 2026-04-28
quellen:
  - ../../00 Steuerung/Regeldatei KI-Wissenspflege.md
  - Quellenverarbeitung in dieser Wissensbasis.md
  - Wiki-first Query und Linting.md
tags:
  - workflow
  - wissenspflege
  - projektarbeit
---

# Arbeitsworkflow Wissenspflege und Projektanfragen

## Kurzfassung
Dieser Workflow beschreibt, wie die Wissensbasis im Alltag genutzt und gepflegt wird. Er stellt sicher, dass neue Informationen nicht im Chat verloren gehen und dass Antworten sowie Projektaufgaben zuerst auf dem vorhandenen Wissensbestand aufbauen.

## Quellenbasis
- [[../../00 Steuerung/Regeldatei KI-Wissenspflege]]
- [[Quellenverarbeitung in dieser Wissensbasis]]
- [[Wiki-first Query und Linting]]

## Zielbild
- Neue Quellen werden als Rohquellen aufgenommen und in bestehendes Wissen integriert.
- Projektfragen werden zuerst gegen die Wissensbasis beantwortet.
- Wiederverwendbare Ergebnisse aus Analysen, Entscheidungen oder Aufgaben fließen zurück in die Wissensbasis.
- Zustandsübersichten und Chronik bleiben getrennt: `Aktueller Projektstatus` zeigt den verdichteten Ist-Zustand, das `Log` hält die zeitliche Abfolge fest.
- Das `Log` bleibt dabei schnell lesbar: Monatsblöcke stehen absteigend, und neue Einträge werden im neuesten passenden Monatsblock oben ergänzt.

## Wann der Workflow genutzt wird
- wenn eine neue Quelle zum Projekt auftaucht
- wenn eine Frage zum Projekt beantwortet werden soll
- wenn durch eine Aufgabe neues belastbares Projektwissen entsteht
- wenn die Wissensbasis auf Konsistenz oder Vollständigkeit geprüft werden soll

## Fall 1: Neue Quelle aufnehmen
### Typischer Auslöser
- Du gibst mir eine Datei, einen Text, ein Konzept oder einen Link und sagst sinngemäß: `Nimm das in die Projekt-Wissensbasis auf.`

### Ablauf
1. Quelle in `01 Rohquellen` ablegen oder als Rohquellen-Referenz erfassen.
2. Quelle vollständig lesen oder vollständig auswerten.
3. Betroffene Wissensseiten im Index und im bestehenden Wiki identifizieren.
4. Bestehende Seiten aktualisieren oder neue Seiten anlegen.
5. Verlinkungen und Quellenbasis ergänzen.
6. Index aktualisieren, falls neue relevante Seiten entstanden sind.
7. Eintrag im Log im neuesten passenden Monatsblock oben ergänzen.

## Fall 2: Frage zum Projekt beantworten
### Typischer Auslöser
- Du fragst nach Datenmodell, Fachlogik, Validierung, Rollen, Import, Export, UI, Architektur oder aktuellem Projektstand.

### Ablauf
1. Zuerst [[../00 Uebersichten/Index]] lesen.
2. Relevante Wissensseiten im Zusammenhang lesen.
3. Nur bei Bedarf Rohquellen oder frische Code- oder Webquellen hinzuziehen.
4. Antwort mit klarer Trennung von gesichertem Wissen, Unsicherheit und offenem Punkt formulieren.
5. Wenn aus der Antwort neues wiederverwendbares Wissen entsteht, dieses zurück in die Wissensbasis führen.

## Fall 3: Erkenntnisse aus einer Aufgabe zurückführen
### Typischer Auslöser
- Wir haben ein Problem analysiert, eine Entscheidung getroffen, ein Risiko geklärt oder einen Prozess verstanden.

### Ablauf
1. Prüfen, ob das Ergebnis wiederverwendbar ist.
2. Passende Wissensseite aktualisieren oder neue Seite anlegen.
3. Bei Statuswissen bewusst trennen:
   - `Aktueller Projektstatus` nur als verdichteten Snapshot aktualisieren.
   - `Log` für zeitliche Abfolge, Verifikation und konkrete Änderungsschritte ergänzen; neue Einträge stehen im passenden Monatsblock oben.
4. Quellenbasis ergänzen:
   - Chat-Ergebnis nur dann, wenn es auf klar benennbaren Projektquellen oder verifizierter Analyse beruht.
   - Bei Codebezug bevorzugt auf Repo-Quellen oder konkrete Dateien verweisen.
5. Index und Log nachziehen.

## Fall 4: Wissensbasis health-checken
### Typischer Auslöser
- Du sagst sinngemäß: `Prüfe die Wissensbasis` oder `Mach einen Lint-Check`.

### Ablauf
1. Index, Log und Stichproben aus den Wissensseiten lesen.
2. Auf Widersprüche, Orphans, defekte Links, fehlende Pflichtabschnitte und veraltete Aussagen prüfen.
3. Konkrete Korrekturhinweise in [[../../03 Betrieb/Qualitaetspruefung]] dokumentieren.
4. Wenn sinnvoll, fehlende Verlinkungen oder kleinere Strukturkorrekturen direkt nachziehen.

## Empfohlene Kurzbefehle für den Alltag
- `Nimm diese Quelle in die Projekt-Wissensbasis auf.`
- `Beantworte das wiki-first aus der Projekt-Wissensbasis.`
- `Führe dieses Ergebnis als Projektwissen in die Wissensbasis zurück.`
- `Mach einen Lint-Check für die Wissensbasis.`

## Was der Workflow nicht automatisch tut
- Er pflegt die Wissensbasis nicht unsichtbar im Hintergrund ohne Anlass.
- Er ersetzt keine frische Verifikation, wenn sich Code oder Projektlage geändert haben.
- Er macht aus unklaren Aussagen keine gesicherten Fakten.

## Verwandte Seiten
- [[Quellenverarbeitung in dieser Wissensbasis]]
- [[Wiki-first Query und Linting]]
- [[../../03 Betrieb/Log]]
- [[../../03 Betrieb/Qualitaetspruefung]]
