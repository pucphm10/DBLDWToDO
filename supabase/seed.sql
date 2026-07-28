-- Startdaten werden benutzerbezogen erzeugt, damit RLS und Eigentum korrekt bleiben.
-- Nach Registrierung führt die App einmal `select public.seed_my_workspace()` aus.
-- Alternativ als angemeldeter Benutzer über die REST/RPC-API aufrufen.
-- Der Vorgang ist idempotent: vorhandene Format-Slugs werden nicht erneut angelegt.
select public.seed_my_workspace();
