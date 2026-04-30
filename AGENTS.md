# Projekt Agent Instructions

## Projektbezogene Wissensbasis

Für dieses Repository existiert eine projektbezogene KI-Wissensbasis im Ordner:

`KI-Wissen-Haushaltskosten/`

Bei neuen Threads, neuen Aufgaben und Projektfragen ist diese Wissensbasis primär zu verwenden.

Falls lokal vorhanden, soll zusätzlich `AGENTS.local.md` gelesen werden. Diese Datei kann auf das führende Haupt-Vault und den passenden Projekttyp verweisen.

## Projektziel

`Haushaltskosten` ist als Anwendung für laufende, dauerhafte Haushaltskosten geplant. Erfasst und ausgewertet werden sollen wiederkehrende Kosten wie Energie, Strom, Abonnements, Gemeindekosten und ähnliche feste Belastungen, um den durchschnittlichen monatlichen Fixkostenblock eines Haushalts sichtbar zu machen.

Solange keine weiteren fachlichen oder gestalterischen Vorgaben vorliegen, sollen keine konkreten UI-, Architektur- oder Datenmodellentscheidungen vorweggenommen werden. Die Wissensbasis hält den Startstand fest und dient als spätere Entscheidungsgrundlage.

## Pflicht-Einstieg für neue Threads

Zu Beginn projektbezogener Arbeit zuerst diese Dateien lesen:

1. `KI-Wissen-Haushaltskosten/00 Projektstart.md`
2. `KI-Wissen-Haushaltskosten/02 Wissen/00 Uebersichten/Index.md`
3. `KI-Wissen-Haushaltskosten/02 Wissen/Prozesse/Arbeitsworkflow Wissenspflege und Projektanfragen.md`
4. `KI-Wissen-Haushaltskosten/00 Steuerung/Regeldatei KI-Wissenspflege.md`

## Haupt-Vault-Anbindung

- Allgemeine Entwicklungsregeln, globale Abschlusskommandos und projektübergreifende Wissenspflege-Regeln leben führend im persönlichen Haupt-Vault.
- Globale Regeln sollen hier nicht vollständig dupliziert werden.
- Projektspezifische Deltas, Beispiele und lokale Präzisierungen bleiben in dieser Wissensbasis.
- Persönliche lokale Pfade, private Dokumentablagen und systembezogene Eingangsroutinen gehören nicht in commitbare Repo-Dateien. Sie werden über `AGENTS.local.md` im Haupt-Vault aufgelöst; für dieses Projekt verweist die lokale Datei auf die dortige Projektseite `03 Projekte/Haushaltsbuch.md`.

## Priorität und Fallback

- Dieses Repository bleibt die führende Quelle für projektspezifische Regeln, Arbeitsweisen und Wissenspflege in `Haushaltskosten`.
- Falls `AGENTS.local.md` vorhanden und lesbar ist, dient die Datei nur dazu, den passenden Projekttyp und die globale Regelbasis aus dem Haupt-Vault aufzulösen.
- Falls `AGENTS.local.md` fehlt oder in einer Umgebung nicht lesbar ist, gelten die lokalen Regeln dieses Repositories ohne diese Zusatzauflösung weiter.
- Bei Konflikten gilt diese Reihenfolge:
  1. ausdrücklich formulierte projektspezifische Regeln in diesem Repository
  2. projektspezifische Auflösung oder Zusatzhinweise aus `AGENTS.local.md`
  3. globale oder typspezifische Default-Regeln aus dem Haupt-Vault
- Globale Regeln ergänzen die Projektregeln, ersetzen sie aber nicht stillschweigend.

## Arbeitsmodus

- Arbeite `wiki-first`.
- Beantworte Projektfragen zuerst aus dem vorhandenen Wissensbestand.
- Ziehe Rohquellen, Repository-Dateien oder Webquellen nur dann nach, wenn die Wissensbasis Lücken hat, veraltet ist oder verifiziert werden muss.
- Wenn neue belastbare Erkenntnisse entstehen, die einen erkennbaren dauerhaften Wert haben, führe sie in die Wissensbasis zurück.
- Wenn du bei einer Änderung eine Regel oder Anforderung erkennst, prüfe, ob sie global, typspezifisch oder nur für dieses Projekt gilt.
- Projektinterne, wiederverwendbare Regeln und lokale Deltas sammle in `KI-Wissen-Haushaltskosten/03 Betrieb/Generische Entwicklungsvorgaben.md`.
- Projektübergreifende Regeln werden nach Freigabe in das Haupt-Vault zurückgeführt.
- Spezifische Erkenntnisse für nur einen Fachfall, eine Seite oder einen einzelnen Ablauf gehören in die fachlich passende Wissensseite und nicht in die generischen Entwicklungsvorgaben.

## Git-Arbeitsweise

- Vor Dateiänderungen aktuellen Branch prüfen.
- Wenn der Branch `main` ist, vor der ersten Änderung automatisch einen datumsbasierten Arbeitsbranch mit Präfix `codex/` erstellen oder auf ihn wechseln.
- Standardschema für normale Arbeitsphasen: `codex/ab-YYYY-MM-DD`, bezogen auf das lokale Projektdatum.
- Wenn der passende Datumsbranch bereits existiert, wird er weiterverwendet.
- Innerhalb eines Datumsbranches dürfen mehrere Themen parallel bearbeitet werden, wenn sie zur aktuellen Arbeitsphase gehören.
- Commits bleiben trotzdem fachlich sinnvoll getrennt, zum Beispiel Wissensbasis, Projektumgebung, Backend-Logik, Frontend-UI, Tests, Datenpakete oder Migrationen.
- Ein eigener Themenbranch wird nur angelegt, wenn der Nutzer ihn ausdrücklich verlangt oder wenn eine Änderung besonders riskant, langlaufend oder klar getrennt vom laufenden Arbeitsstand ist.
- `main` bleibt der stabile Integrationsstand.
- Merge nach `main` erfolgt erst, wenn der Arbeitsbranch insgesamt prüfbar und grün ist.
- Wenn am Tagesende nicht alles sauber läuft, bleibt der Datumsbranch offen und wird am nächsten Arbeitstag weitergeführt oder bewusst abgeschlossen.
- Direkte Änderungen auf `main` sind nur auf ausdrücklichen Nutzerwunsch zulässig.
- Reine Lese-, Prüf- und Statusbefehle dürfen auf `main` laufen.

## Sprachregeln

- Sichtbare UI-Texte sollen echtes Deutsch mit Umlauten und `ß` verwenden.
- Der Benutzer soll im Chat und in direkt formulierten Anwendungstexten grundsätzlich mit `Du` angesprochen werden, sofern kein abweichender Wunsch geäußert wurde.
- In Fließtexten, Beschreibungen und Überschriften der Wissensbasis sollen echte Umlaute verwendet werden:
  `ä` statt `ae`, `ö` statt `oe`, `ü` statt `ue`, `Ä` statt `Ae`, `Ö` statt `Oe`, `Ü` statt `Ue`, `ß` statt `ss`, sofern es sich um normales Deutsch handelt.
- Ausnahmen:
  Dateinamen, Pfade, Code-Symbole, IDs, technische Bezeichner, Markdown-Links auf bestehende Dateien und originale Quellzitate bleiben in ihrer technischen oder originalen Schreibweise.

## Wissenspflege bei neuen Quellen

Wenn neue Projektquellen hinzukommen:

1. als Rohquelle in die Wissensbasis aufnehmen
2. vollständig lesen oder vollständig auswerten
3. betroffene Wissensseiten aktualisieren oder neu anlegen
4. Index aktualisieren
5. Log aktualisieren

## Freigabe vor Wissenspflege

Vor Änderungen an Wissensseiten der Wissensbasis soll die Einordnung im Chat kurz transparent gemacht werden, außer bei rein mechanischer Folgepflege oder klar naheliegenden Aktualisierungen an bereits etablierten Zielseiten.

Bei klaren, gut zuordenbaren Fällen darf die Wissenspflege direkt erfolgen. Dabei soll trotzdem kurz sichtbar werden:

1. welche Erkenntnis du aufnehmen oder ändern willst
2. warum diese Erkenntnis aus deiner Sicht dauerhaft nützlich oder wiederverwendbar ist
3. welche Wissensseite betroffen wäre oder neu angelegt werden soll

Die Punkte 2 und 3 dürfen nicht nur stichwortartig beantwortet werden. Sie sind jeweils kurz, aber konkret zu begründen, damit der Nutzer die Einschätzung prüfen und bei Bedarf ablehnen oder diese Regel anpassen kann.

Für diese Vorab-Ankündigung verwende im Chat dieses sichtbare Format:

1. `Erkenntnis`
2. `Dauerhafter Nutzen`
3. `Vorgeschlagene Wissensseite`
4. `Warum diese Seite`
5. `Abgrenzung zu Alternativen`
6. `Bitte um Freigabe`

Dabei gilt:

- Unter `Dauerhafter Nutzen` erkläre konkret, warum die Erkenntnis nicht nur für den Einzelfall gilt, sondern auch später wiederverwendbar oder entscheidungsrelevant sein könnte.
- Unter `Warum diese Seite` erkläre, warum genau diese Wissensseite fachlich oder strukturell der richtige Ort ist.
- Unter `Abgrenzung zu Alternativen` nenne kurz mögliche andere Zielseiten oder nur den Log-Eintrag und warum diese aus deiner Sicht weniger passend sind, falls die Zuordnung nicht offensichtlich ist.
- Die Begründungen müssen so klar sein, dass der Nutzer nicht nur über den Inhalt, sondern auch über deine Begründung und Einordnung bewusst entscheiden kann.

Eine ausdrückliche Zustimmung vor der Änderung ist besonders dann wichtig, wenn:

- die Zuordnung zur Zielseite nicht offensichtlich ist
- neue Seiten angelegt werden sollen, deren Nutzen oder Abgrenzung nicht klar ist
- die Erkenntnis weitreichende fachliche oder strukturelle Folgen haben kann
- Unsicherheit besteht, ob etwas global, typspezifisch oder projektspezifisch dokumentiert werden sollte

Wenn die Einordnung dagegen klar ist und der Nutzer nicht widersprochen hat, kann die Wissenspflege direkt durchgeführt werden.

Ausnahmen:

- Wenn der Nutzer die Wissenspflege für diesen konkreten Punkt ausdrücklich verlangt hat.
- Wenn es sich nur um rein mechanische Folgepflege bereits bestätigter Wissensänderungen handelt.

## Wichtige Betriebsregeln

- Rohquellen bleiben unverändert.
- Widersprüche zwischen neuen Quellen und bestehendem Wissen sichtbar machen, nicht stillschweigend überschreiben.
- Zwischen dokumentiertem Projektstand und aktuellem Workspace-Stand unterscheiden, wenn offene lokale Änderungen vorliegen.
- Wiederverwendbare Antworten, Entscheidungen, Analysen oder Risikoerklärungen nicht nur im Chat belassen, sondern als Wissensseiten oder Aktualisierungen zurückführen.
- Bis zur technischen Scaffold-Entscheidung gibt es noch keine projektspezifischen App-Checks. Sobald Stack, Backend, Frontend oder Datenhaltung angelegt werden, sind Start- und Prüfkommandos in der Wissensbasis und im README nachzuziehen.

## Wichtige Wissensbasis-Dateien

- Einstieg: `KI-Wissen-Haushaltskosten/02 Wissen/00 Uebersichten/Index.md`
- Workflow: `KI-Wissen-Haushaltskosten/02 Wissen/Prozesse/Arbeitsworkflow Wissenspflege und Projektanfragen.md`
- Log: `KI-Wissen-Haushaltskosten/03 Betrieb/Log.md`
- Qualitätsprüfung: `KI-Wissen-Haushaltskosten/03 Betrieb/Qualitaetspruefung.md`

## Einordnung von Status und Log

- `KI-Wissen-Haushaltskosten/02 Wissen/00 Uebersichten/Aktueller Projektstatus.md` ist eine verdichtete Zustandsübersicht und kein Änderungsprotokoll.
- Diese Seite soll den aktuellen Stand als Snapshot zeigen, zum Beispiel gegliedert in `Umgesetzt`, `Teilweise umgesetzt`, `Offen` und `Wichtige Grenzen`.
- Einzelne Schritte, Entscheidungen, Verifikationen und zeitliche Abfolgen gehören nicht als Erzählung in diese Statusseite, sondern in `KI-Wissen-Haushaltskosten/03 Betrieb/Log.md`.
- `KI-Wissen-Haushaltskosten/03 Betrieb/Log.md` bleibt chronologisch und append-only und beantwortet primär, was wann passiert ist.
- Wenn sich Statusseite und Log inhaltlich überschneiden, ist die Statusseite zu verdichten statt das Log auszudünnen.

## Abschlusskommandos

Wenn der Nutzer `Finito`, `Finale`, `Endfinale` oder `Ende` schreibt, gelten grundsätzlich die globalen Abschlusskommandos aus dem Haupt-Vault. Falls `AGENTS.local.md` vorhanden ist, ist dessen Referenz auf die globale Definition führend.

Wenn diese globale Auflösung in der aktuellen Umgebung nicht verfügbar ist, gilt als lokaler Minimalkontrakt:

- `Finito` oder `Ende`: lokaler Abschluss ohne automatischen Merge nach `main` und ohne automatischen Push; alle offenen Änderungen und ungetrackten Dateien prüfen, klar einordenbare und fachlich abgeschlossene Änderungen in sinnvolle Commit-Blöcke aufteilen, committen und verbleibende offene oder unklare Punkte kompakt benennen.
- `Finale`: zuerst denselben lokalen Abschluss wie bei `Finito` durchführen; danach den aktuellen Arbeitsbranch nach erfolgreichen Checks per Fast-Forward nach `main` übernehmen, Checks auf `main` erneut ausführen und `main` pushen, sofern alles sauber ist.
- `Endfinale`: wie `Finale`; zusätzlich einen vollständigeren Verify-Lauf, Wissensbasis-/Statuspflege, Logprüfung und kompakten Restpunkte-Check durchführen.

Für dieses Projekt gilt ergänzend:

- projektspezifische Checks, Wissenspflege und Zusatzschritte dürfen die globale Sequenz erweitern
- lokale offene Änderungen außerhalb dieses Threads sind kein automatischer Blocker, sollen aber im Abschluss sichtbar benannt werden
- Abschlusskommandos räumen den aktuellen Arbeitsbranch auf: Alles klar einordenbare und fachlich abgeschlossene wird automatisch in sinnvollen Commit-Blöcken committet, auch wenn es aus früheren Teilaufgaben desselben Branches stammt
- offene Änderungen werden nicht pauschal in einen Sammelcommit geworfen
- Änderungen, die offensichtlich unfertig, widersprüchlich, riskant oder nicht einordenbar sind, werden nicht automatisch committet; sie werden als offene Punkte benannt
- lokale Laufzeitdaten, Datenbanken, Builds, temporäre Dateien und private Overlays bleiben vom automatischen Committen ausgeschlossen
