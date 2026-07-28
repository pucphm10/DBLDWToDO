# DBLDW Production

Persönliches Produktionssystem für die Postproduktion der DBLDW-Formate
**Klassiker**, **Vorschau** und **Bonusrunde**. Aus versionierten Standardvorlagen
entstehen unabhängige Produktionen mit Checklisten, Schnittpunkten,
Qualitätskontrollen und nachvollziehbaren Lernvorschlägen.

## Funktionsumfang

- E-Mail/Passwort-Registrierung, Login, Logout und Passwort-Reset mit Supabase Auth
- drei datengetriebene Formate mit ausführlichen, unabhängigen Startvorlagen
- unveränderliche Vorlagenversionen und Änderungshistorie
- atomare Produktionserstellung aus einer vollständigen Vorlagenkopie
- Bereiche, Aufgaben, Unteraufgaben, Hinweise und Qualitätskontrollen
- schnelle Erfassung von Schnittpunkten mit validierten Zeitcodes
- Status, Suche, Filter, Produktionsnotizen und Archivstatus
- transparenter Gesamt- und Pflichtfortschritt
- Dashboard mit nächsten und überfälligen Produktionen
- regelbasierte Lernvorschläge mit Annehmen, Ablehnen und dauerhaftem Ignorieren
- vollständige benutzerbezogene Row Level Security
- responsive Navigation ab 320 Pixeln und tastaturbedienbare Alternativen
- GitHub-Pages-Deployment über GitHub Actions

## Screenshots

Nach dem ersten Deployment können hier Screenshots ergänzt werden:

- `docs/screenshots/dashboard.png`
- `docs/screenshots/production-detail.png`
- `docs/screenshots/template-editor.png`

## Technik

React 19, TypeScript, Vite, Tailwind CSS, React Router (HashRouter), TanStack
Query, React Hook Form, Zod, dnd-kit, Lucide, Supabase Auth/PostgreSQL/RLS und
Vitest mit React Testing Library.

Die Architektur ist in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) beschrieben.

## Voraussetzungen

- Node.js 24
- pnpm 11.9
- ein Supabase-Projekt
- optional: Supabase CLI für lokale Datenbanktests und Migrationen

## Lokale Installation

```bash
pnpm install
cp .env.example .env
```

In `.env` eintragen:

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<publishable-oder-anon-key>
VITE_BASE_PATH=/
```

Der Publishable/Anon Key ist für Browser-Clients bestimmt und sichtbar. Die
Sicherheit entsteht durch RLS. **Niemals** einen Service-Role- oder Secret-Key
im Frontend beziehungsweise in GitHub Pages verwenden.

## Supabase einrichten

1. Im Supabase Dashboard ein Projekt erstellen.
2. Unter **Authentication → Providers → Email** E-Mail/Passwort aktivieren.
3. Unter **Authentication → URL Configuration** die lokalen und produktiven
   Redirect-URLs ergänzen, zum Beispiel:
   - `http://localhost:5173/**`
   - `https://<github-name>.github.io/<repository>/**`
4. Migrationen in Reihenfolge anwenden:

   ```bash
   supabase link --project-ref <project-ref>
   supabase db push
   ```

5. Die Startdaten werden nach dem ersten bestätigten Login automatisch und
   idempotent über `seed_my_workspace()` angelegt.
6. Für produktive Bestätigungs- und Reset-E-Mails einen eigenen SMTP-Anbieter
   konfigurieren. Supabase' Testversand ist stark limitiert.

Die Migrationen erteilen `authenticated` explizite Data-API-Rechte. Das ist für
neue Supabase-Projekte wichtig, bei denen Tabellen seit April 2026 nicht zwingend
automatisch exponiert werden. RLS bleibt davon unabhängig immer aktiv.

## Entwicklung und Qualität

```bash
pnpm dev
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm preview
```

### Fortschrittslogik

- eine Aufgabe ist erledigt, wenn sie manuell `done` ist oder alle nicht
  übersprungenen Unteraufgaben erledigt sind;
- übersprungene optionale Aufgaben fallen aus dem Nenner;
- übersprungene Pflichtaufgaben bleiben offen;
- Qualitätschecks werden separat gezählt und ändern den Aufgabenfortschritt in
  Version 1 nicht.

## GitHub Pages

Der Workflow `.github/workflows/deploy-pages.yml` prüft TypeScript, Linting und
Tests, baut mit dem Repository-Base-Path und deployt anschließend.

1. Repository auf GitHub anlegen und dieses Projekt auf den Hauptbranch `main`
   pushen.
2. **Settings → Pages → Source** auf **GitHub Actions** setzen.
3. Unter **Settings → Secrets and variables → Actions → Variables** anlegen:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Den ersten Workflow-Lauf abwarten.
5. Die resultierende Pages-URL in Supabase als Site URL und Redirect URL
   hinterlegen.

HashRouter macht direkte Reloads auf Unterseiten robust. Der Vite-Base-Path wird
im Workflow automatisch aus dem Repository-Namen erzeugt.

## Datenbank

Wichtige Tabellen:

- `profiles`, `formats`
- `templates`, `template_versions`, `template_sections`, `template_tasks`,
  `template_subtasks`, `template_quality_checks`, `template_change_log`
- `productions`, `production_sections`, `production_tasks`,
  `production_subtasks`, `production_quality_checks`, `production_activity`
- `learning_suggestions`, `ignored_learning_patterns`

Wichtige RPCs:

- `create_production_from_template`: vollständige atomare Kopie
- `duplicate_current_template_version`: unabhängige neue Vorlagenversion
- `seed_my_workspace`: idempotente Startformate und -vorlagen
- `refresh_learning_suggestions`: wiederkehrende Nutzungssignale auswerten
- `resolve_learning_suggestion`: Vorschlag auflösen; Annahme versioniert die Vorlage

## Bekannte Einschränkungen

- Realtime und Storage sind bewusst noch nicht aktiv; das Schema ist für spätere
  Datei-/Thumbnail-Funktionen vorbereitet.
- Teamfunktionen und beliebig tiefe Aufgabenbäume sind nicht Teil von Version 1.
- Ähnlichkeit nutzt normalisierten Text, noch keine fuzzy Trigram- oder KI-Suche.
- Die Datenbank-Integrationstests benötigen ein verknüpftes Supabase-Testprojekt.
  Die lokale Suite deckt derzeit Geschäftslogik und UI-Grundzustände ab.
- Vorlagenaufgaben können in der aktuellen Oberfläche hinzugefügt, umbenannt und
  gelöscht werden. Vollständiges Drag-and-drop für Vorlagen ist als nächste
  UX-Erweiterung vorgesehen; die Datenbank unterstützt Positionen bereits.

## Nächste Erweiterungen

1. dnd-kit-Reihenfolge mit synchroner Tastatur-Alternative vollständig aktivieren
2. Playwright-E2E-Suite gegen eine isolierte Supabase-Branch-Datenbank
3. Offline-Warteschlange und Konfliktanzeige
4. Storage für Thumbnails und Produktionsdateien
5. Trigram-Ähnlichkeit und erklärbare Reihenfolgevorschläge
6. optionale Teamrollen über sichere `app_metadata`
