create or replace function public.seed_my_workspace()
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_format record;
  v_template uuid;
  v_version uuid;
  v_section uuid;
  v_task uuid;
  v_section_data jsonb;
  v_task_title text;
  v_section_position integer := 0;
  v_task_position integer;
  v_created integer := 0;
  v_structure jsonb := jsonb_build_array(
    jsonb_build_object('title','Rohmaterial & Vorbereitung','tasks',jsonb_build_array(
      'Riverside-Video herunterladen','Riverside-Einzelspuren herunterladen','RØDECaster-Aufnahme importieren',
      'Prüfen, ob alle Audio- und Videodateien vollständig sind','Rohmaterial sichern',
      'Dateien einheitlich benennen','Projektordner anlegen','Schnittprojekt anlegen',
      'Speicherplatz prüfen','Backup der Rohdateien erstellen')),
    jsonb_build_object('title','Schnitt','tasks',jsonb_build_array(
      'Audios synchronisieren','Video und Audio synchronisieren','Audios schneiden','Videoschnitt durchführen',
      'Notierte Schnittpunkte','Werbung für Premium-Version herausschneiden','Intro prüfen','Outro prüfen',
      'Pausen und Versprecher kontrollieren','Unnötige Wiederholungen entfernen',
      'Kameraschnitte kontrollieren','Übergänge kontrollieren')),
    jsonb_build_object('title','Einspieler','tasks',jsonb_build_array(
      'Video-Einspieler ergänzen','Foto-Einspieler vorbereiten','Foto-Einspieler in Canva erstellen',
      'Statistiken einfügen','Tabellen einfügen','Screenshots einfügen','Quellen kontrollieren',
      'Bildrechte beziehungsweise Herkunft prüfen')),
    jsonb_build_object('title','Einblendungen','tasks',jsonb_build_array(
      'Spielernamen einblenden','Vereinsnamen einblenden','Trainernamen einblenden',
      'Tabellen und Platzierungen einblenden','Wettbewerbsnamen einblenden','Schreibweise kontrollieren',
      'Einblendungsdauer prüfen','Position und Lesbarkeit prüfen')),
    jsonb_build_object('title','Audio & Qualitätskontrolle','tasks',jsonb_build_array(
      'Lautstärke aller Personen prüfen','Lautstärkeunterschiede ausgleichen','Hintergrundgeräusche prüfen',
      'Knackser und Störgeräusche entfernen','Übersteuerungen prüfen','Musiklautstärke kontrollieren',
      'Intro- und Outro-Lautstärke prüfen','Export mit Kopfhörern kontrollieren',
      'Stichproben auf Smartphone-Lautsprecher prüfen','Finalen Audiomix prüfen')),
    jsonb_build_object('title','Shownotes','tasks',jsonb_build_array(
      'Transkript in Claude Skill übertragen','Shownotes schreiben','Roten Faden kontrollieren',
      'Werbung in Shownotes ergänzen','Linktipps ergänzen','Erwähnte Personen und Vereine prüfen',
      'Rechtschreibung prüfen','Links testen','Kapitelmarken erstellen','Finale Beschreibung freigeben')),
    jsonb_build_object('title','Werbung','tasks',jsonb_build_array(
      'Werbepartner kontrollieren','Werbetext in Shownotes ergänzen','Partnerlink ergänzen',
      'Rabattcode kontrollieren','Werbeblock im Video kontrollieren','Werbung für Premium-Version entfernen',
      'Unterschiedliche Versionen korrekt exportieren','Sponsorennennung gegen Briefing prüfen')),
    jsonb_build_object('title','Titel','tasks',jsonb_build_array(
      'A-Titel erstellen','B-Titel erstellen','C-Titel erstellen','Titelvarianten vergleichen',
      'Finalen Titel auswählen','Titel auf Verständlichkeit prüfen','Titel auf Länge prüfen',
      'Titel auf Spotify-Tauglichkeit prüfen','Rechtschreibung prüfen')),
    jsonb_build_object('title','Thumbnail','tasks',jsonb_build_array(
      'Thumbnail-Konzept festlegen','Thumbnail 16:9 erstellen','Thumbnail 9:16 erstellen',
      'Thumbnail 4:3 erstellen','Lesbarkeit auf kleinen Displays prüfen','Namen und Logos kontrollieren',
      'Rechtschreibung kontrollieren','Finale Dateien exportieren','Dateien korrekt benennen')),
    jsonb_build_object('title','Export','tasks',jsonb_build_array(
      'Audio-Master exportieren','Video-Master exportieren','Premium-Version exportieren',
      'Öffentliche Version exportieren','Exportauflösung prüfen','Framerate prüfen','Audiocodec prüfen',
      'Dateigröße kontrollieren','Dateinamen kontrollieren','Export stichprobenartig ansehen',
      'Anfang und Ende kontrollieren')),
    jsonb_build_object('title','Veröffentlichung','tasks',jsonb_build_array(
      'Audio hochladen','Video hochladen','Thumbnail hochladen','Titel eintragen','Shownotes eintragen',
      'Kapitelmarken eintragen','Veröffentlichungsdatum festlegen','Plattformen kontrollieren',
      'Veröffentlichung testen','Ton und Bild nach Upload prüfen','Links nach Veröffentlichung testen')),
    jsonb_build_object('title','Social Media','tasks',jsonb_build_array(
      'Mögliche Reels markieren','Mögliche Shorts markieren','Social-Clips schneiden',
      'Untertitel erstellen','Untertitel manuell prüfen','Caption schreiben','Social-Thumbnail erstellen',
      'Veröffentlichungszeit planen','Links und Tags prüfen')),
    jsonb_build_object('title','Archiv','tasks',jsonb_build_array(
      'Projektdateien sichern','Finale Exporte sichern','Rohmaterial archivieren',
      'Nicht benötigte Cache-Dateien entfernen','Learnings notieren','Offene Fehler dokumentieren',
      'Folge als abgeschlossen markieren')),
    jsonb_build_object('title','Nächste Aufnahme vorbereiten','tasks',jsonb_build_array(
      'RØDECaster vorbereiten','Soundpads prüfen','SD-Karte prüfen','Speicherplatz prüfen',
      'Akkus laden','Mikrofone prüfen','Kameras prüfen','Riverside-Setup prüfen',
      'Einspieler für die nächste Aufnahme sammeln'))
  );
begin
  if v_user is null then raise exception 'authentication_required'; end if;

  for v_format in
    select * from (values
      ('Klassiker','klassiker','Ausführliches Hauptformat mit mehreren Themenblöcken.',1),
      ('Vorschau','vorschau','Vorschau auf die aktuelle Runde und Spielpaarungen.',4),
      ('Bonusrunde','bonusrunde','Flexibles Sonderformat für Gäste und Spezialthemen.',null::integer)
    ) as f(name,slug,description,weekday)
  loop
    if exists (select 1 from public.formats where user_id=v_user and slug=v_format.slug) then
      continue;
    end if;
    insert into public.formats (user_id,name,slug,description,default_publish_weekday)
      values (v_user,v_format.name,v_format.slug,v_format.description,v_format.weekday)
      returning id into v_section;
    insert into public.templates (user_id,format_id,name,description)
      values (v_user,v_section,v_format.name || ' Standard','Ausführliche DBLDW Postproduktions-Rohliste')
      returning id into v_template;
    insert into public.template_versions (template_id,version_number,change_summary,created_by)
      values (v_template,1,'Initiale Standardvorlage',v_user) returning id into v_version;
    update public.templates set current_version_id=v_version where id=v_template;

    v_section_position := 0;
    for v_section_data in select value from jsonb_array_elements(v_structure)
    loop
      insert into public.template_sections (template_version_id,title,position)
        values (v_version,v_section_data->>'title',v_section_position) returning id into v_section;
      v_task_position := 0;
      for v_task_title in select jsonb_array_elements_text(v_section_data->'tasks')
      loop
        insert into public.template_tasks (
          template_section_id,title,position,is_required,task_type,hint
        ) values (
          v_section,v_task_title,v_task_position,
          not (v_task_title in ('Mögliche Reels markieren','Mögliche Shorts markieren','Stichproben auf Smartphone-Lautsprecher prüfen')),
          case
            when v_task_title='Notierte Schnittpunkte' then 'edit_point'
            when v_task_title like '%Einspieler%' then 'insert'
            when v_task_title like '%einblenden%' then 'overlay'
            when v_task_title like '%Werbepartner%' then 'advertising'
            when v_task_title='Linktipps ergänzen' then 'link_tip'
            else 'standard'
          end,
          case when v_task_title='Shownotes schreiben'
            then 'Die Shownotes müssen sich wie eine zusammenhängende Geschichte mit rotem Faden lesen. Sie sollen nicht wie eine reine Aufzählung einzelner Themen wirken.'
            else '' end
        ) returning id into v_task;
        if v_task_title='Shownotes schreiben' then
          insert into public.template_quality_checks (template_task_id,title,position)
          select v_task, title, position from (values
            ('Starker Einstieg vorhanden',0),('Klare Verbindung zwischen den Themen',1),
            ('Zentraler roter Faden',2),('Keine reine Themenliste',3),
            ('Verständlicher Abschluss',4),('Alle wichtigen Links vorhanden',5)
          ) q(title,position);
        end if;
        v_task_position := v_task_position + 1;
      end loop;
      v_section_position := v_section_position + 1;
    end loop;
    v_created := v_created + 1;
  end loop;
  return v_created;
end;
$$;

revoke all on function public.seed_my_workspace() from public, anon;
grant execute on function public.seed_my_workspace() to authenticated;
