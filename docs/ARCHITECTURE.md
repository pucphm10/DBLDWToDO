# Architektur

## Leitlinien

DBLDW Production ist eine clientseitige React-SPA. Persistenz, Authentifizierung,
Autorisierung und atomare Geschäftsprozesse liegen in Supabase/PostgreSQL. Die UI
enthält keine formatabhängigen Sonderfälle; Formate, Vorlagen und Aufgaben sind
durchgehend datengetrieben.

## Schichten

- `src/app`: Routing, Session, Query-Client und Layout
- `src/features`: fachliche UI und Datenzugriff je Bereich
- `src/components`: wiederverwendbare Interaktionsbausteine
- `src/lib`: Supabase-Client, Validierung, Fehlertexte und Geschäftslogik
- `supabase/migrations`: Schema, RLS, Trigger und atomare RPCs
- `supabase/seed.sql`: benutzerbezogene, idempotente Startdaten

## Zentrale Entscheidungen

1. **HashRouter:** Unterrouten funktionieren auf GitHub Pages auch nach einem Reload
   ohne serverseitige Fallback-Regeln.
2. **Unveränderliche Vorlagenversionen:** Jede Speicherung erzeugt über eine RPC
   eine neue Version. Produktionen referenzieren die verwendete Version und besitzen
   eigenständige Kopien aller Bereiche, Aufgaben, Unteraufgaben und Qualitätschecks.
3. **Atomare RPCs:** `create_production_from_template` und
   `create_template_version` kapseln mehrstufige Kopiervorgänge in einer
   Datenbanktransaktion.
4. **Eigentum über Wurzelobjekte:** Direkte Tabellen besitzen `user_id`. Bei
   Kindtabellen prüfen RLS-Policies das Eigentum über die Elternbeziehung.
5. **Keine geheimen Schlüssel im Client:** Nur Publishable/Anon Key wird verwendet.
   Sicherheit entsteht durch RLS, nicht durch das Verbergen des Browser-Keys.
6. **Regelbasiertes Lernen:** Aktivitätsereignisse werden normalisiert ausgewertet.
   Vorschläge ändern niemals automatisch eine Vorlage.

## Fortschritt

Eine nicht übersprungene Aufgabe zählt als erledigt, wenn ihr Status `done` ist oder
alle nicht übersprungenen Unteraufgaben erledigt sind. Übersprungene optionale
Aufgaben werden aus dem Nenner entfernt; übersprungene Pflichtaufgaben bleiben offen.
Gesamt- und Pflichtfortschritt werden getrennt berechnet. Qualitätschecks werden
separat ausgewiesen und verändern in Version 1 nicht den Aufgabenfortschritt.

## Abweichungen vom vorgeschlagenen Modell

- `template_change_log` ergänzt die geforderte nachvollziehbare Änderungshistorie.
- `task_type` wird auch in Produktionsaufgaben kopiert, damit Schnellerfassung
  datengetrieben den passenden Zielknoten findet.
- Lernereignisse verwenden `production_activity`; eine zweite Event-Tabelle wäre
  redundant.
- Kindtabellen tragen bewusst nicht überall `user_id`. Eigentum wird referenziell
  über die Wurzel geprüft und kann nicht unabhängig divergieren.
