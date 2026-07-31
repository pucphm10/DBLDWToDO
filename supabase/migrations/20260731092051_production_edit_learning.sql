create or replace function public.capture_production_task_activity()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_production_id uuid;
  v_user_id uuid;
  v_action text;
begin
  select p.id, p.user_id into v_production_id, v_user_id
  from public.production_sections ps
  join public.productions p on p.id = ps.production_id
  where ps.id = case when tg_op = 'DELETE'
    then old.production_section_id else new.production_section_id end;

  if v_user_id is distinct from (select auth.uid()) then
    raise exception 'production_not_available';
  end if;

  if tg_op = 'DELETE' then
    v_action := 'task_deleted';
  elsif new.title is distinct from old.title then
    v_action := 'task_title_changed';
  elsif new.status is distinct from old.status then
    v_action := 'task_status_changed';
  else
    return new;
  end if;

  insert into public.production_activity (
    production_id, user_id, entity_type, entity_id, action_type, previous_value, new_value
  ) values (
    v_production_id, v_user_id, 'task', old.id, v_action,
    to_jsonb(old), case when tg_op = 'DELETE' then '{}'::jsonb else to_jsonb(new) end
  );

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create or replace function public.capture_production_subtask_activity()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_production_id uuid;
  v_user_id uuid;
  v_action text;
begin
  select p.id, p.user_id into v_production_id, v_user_id
  from public.production_tasks pt
  join public.production_sections ps on ps.id = pt.production_section_id
  join public.productions p on p.id = ps.production_id
  where pt.id = case when tg_op = 'DELETE'
    then old.production_task_id else new.production_task_id end;

  if v_user_id is distinct from (select auth.uid()) then
    raise exception 'production_not_available';
  end if;

  if tg_op = 'DELETE' then
    v_action := 'subtask_deleted';
  elsif new.title is distinct from old.title then
    v_action := 'subtask_title_changed';
  elsif new.status is distinct from old.status then
    v_action := 'subtask_status_changed';
  else
    return new;
  end if;

  insert into public.production_activity (
    production_id, user_id, entity_type, entity_id, action_type, previous_value, new_value
  ) values (
    v_production_id, v_user_id, 'subtask', old.id, v_action,
    to_jsonb(old), case when tg_op = 'DELETE' then '{}'::jsonb else to_jsonb(new) end
  );

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists capture_production_task_activity on public.production_tasks;
create trigger capture_production_task_activity
after update of title, status or delete on public.production_tasks
for each row execute function public.capture_production_task_activity();

drop trigger if exists capture_production_subtask_activity on public.production_subtasks;
create trigger capture_production_subtask_activity
after update of title, status or delete on public.production_subtasks
for each row execute function public.capture_production_subtask_activity();

create or replace function public.refresh_learning_suggestions()
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_count integer := 0;
  v_signal record;
begin
  if v_user is null then raise exception 'authentication_required'; end if;

  for v_signal in
    select p.format_id, min(p.template_id::text)::uuid template_id,
      public.normalize_learning_text(pt.title) normalized_key,
      min(pt.title) sample_title, count(distinct p.id) occurrence_count,
      jsonb_agg(distinct jsonb_build_object('production_id',p.id,'title',pt.title)) evidence
    from public.production_tasks pt
    join public.production_sections ps on ps.id=pt.production_section_id
    join public.productions p on p.id=ps.production_id
    where p.user_id=v_user and pt.origin='custom'
    group by p.format_id, public.normalize_learning_text(pt.title)
    having count(distinct p.id) >= 3
  loop
    if not exists (
      select 1 from public.ignored_learning_patterns
      where user_id=v_user and format_id=v_signal.format_id and normalized_key=v_signal.normalized_key
    ) then
      insert into public.learning_suggestions (
        user_id,format_id,template_id,suggestion_type,title,description,evidence,
        normalized_key,confidence_score,occurrence_count
      ) values (
        v_user,v_signal.format_id,v_signal.template_id,'add_task',
        '„' || v_signal.sample_title || '“ zur Vorlage hinzufügen?',
        'Diese Aufgabe wurde in mehreren Produktionen dieses Formats individuell ergänzt.',
        v_signal.evidence,v_signal.normalized_key,
        least(1, v_signal.occurrence_count::numeric / 5),v_signal.occurrence_count
      ) on conflict (user_id,format_id,suggestion_type,normalized_key) do update
        set evidence=excluded.evidence, occurrence_count=excluded.occurrence_count,
            confidence_score=excluded.confidence_score, updated_at=now()
        where public.learning_suggestions.status='open';
      v_count := v_count + 1;
    end if;
  end loop;

  for v_signal in
    select p.format_id, min(p.template_id::text)::uuid template_id,
      public.normalize_learning_text(pt.title) normalized_key,
      min(pt.title) sample_title, count(distinct p.id) occurrence_count,
      jsonb_agg(distinct jsonb_build_object('production_id',p.id,'task_id',pt.id)) evidence
    from public.production_tasks pt
    join public.production_sections ps on ps.id=pt.production_section_id
    join public.productions p on p.id=ps.production_id
    where p.user_id=v_user and pt.origin='template' and pt.status='skipped'
    group by p.format_id, public.normalize_learning_text(pt.title)
    having count(distinct p.id) >= 5
  loop
    insert into public.learning_suggestions (
      user_id,format_id,template_id,suggestion_type,title,description,evidence,
      normalized_key,confidence_score,occurrence_count
    ) values (
      v_user,v_signal.format_id,v_signal.template_id,'make_optional',
      '„' || v_signal.sample_title || '“ optional machen?',
      'Diese Vorlagenaufgabe wurde wiederholt übersprungen.',
      v_signal.evidence,v_signal.normalized_key,
      least(1, v_signal.occurrence_count::numeric / 8),v_signal.occurrence_count
    ) on conflict (user_id,format_id,suggestion_type,normalized_key) do update
      set evidence=excluded.evidence, occurrence_count=excluded.occurrence_count,
          confidence_score=excluded.confidence_score, updated_at=now()
      where public.learning_suggestions.status='open';
    v_count := v_count + 1;
  end loop;

  for v_signal in
    select p.format_id, p.template_id,
      public.normalize_learning_text(pa.previous_value->>'title') normalized_key,
      min(pa.previous_value->>'title') sample_title,
      count(distinct pa.production_id) occurrence_count,
      jsonb_agg(distinct jsonb_build_object(
        'production_id',pa.production_id,
        'task_id',pa.entity_id,
        'title',pa.previous_value->>'title'
      )) evidence
    from public.production_activity pa
    join public.productions p on p.id=pa.production_id
    where pa.user_id=v_user
      and pa.action_type='task_deleted'
      and pa.previous_value->>'origin'='template'
      and p.template_id is not null
    group by p.format_id, p.template_id,
      public.normalize_learning_text(pa.previous_value->>'title')
    having count(distinct pa.production_id) >= 3
  loop
    if not exists (
      select 1 from public.ignored_learning_patterns
      where user_id=v_user and format_id=v_signal.format_id and normalized_key=v_signal.normalized_key
    ) then
      insert into public.learning_suggestions (
        user_id,format_id,template_id,suggestion_type,title,description,evidence,
        normalized_key,confidence_score,occurrence_count
      ) values (
        v_user,v_signal.format_id,v_signal.template_id,'remove_task',
        '„' || v_signal.sample_title || '“ aus der Vorlage entfernen?',
        'Diese Vorlagenaufgabe wurde in mehreren Produktionen bewusst gelöscht.',
        v_signal.evidence,v_signal.normalized_key,
        least(1, v_signal.occurrence_count::numeric / 5),v_signal.occurrence_count
      ) on conflict (user_id,format_id,suggestion_type,normalized_key) do update
        set evidence=excluded.evidence, occurrence_count=excluded.occurrence_count,
            confidence_score=excluded.confidence_score, updated_at=now()
        where public.learning_suggestions.status='open';
      v_count := v_count + 1;
    end if;
  end loop;

  return v_count;
end;
$$;

create or replace function public.resolve_learning_suggestion(
  p_suggestion_id uuid,
  p_resolution public.suggestion_status
) returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_suggestion public.learning_suggestions;
  v_version uuid;
  v_section uuid;
begin
  if p_resolution not in ('accepted','rejected','ignored') then raise exception 'invalid_resolution'; end if;
  select * into v_suggestion from public.learning_suggestions
  where id=p_suggestion_id and user_id=v_user and status='open' for update;
  if not found then raise exception 'suggestion_not_available'; end if;

  if p_resolution='ignored' then
    insert into public.ignored_learning_patterns (user_id,format_id,normalized_key,reason)
      values (v_user,v_suggestion.format_id,v_suggestion.normalized_key,'Aus Lernvorschlag dauerhaft ignoriert')
      on conflict (user_id,format_id,normalized_key) do nothing;
  elsif p_resolution='accepted' then
    if v_suggestion.template_id is null then raise exception 'template_not_available'; end if;
    v_version := public.duplicate_current_template_version(
      v_suggestion.template_id, 'Lernvorschlag angenommen: ' || v_suggestion.title
    );
    if v_suggestion.suggestion_type='add_task' then
      select id into v_section from public.template_sections
      where template_version_id=v_version order by position limit 1;
      if v_section is null then
        insert into public.template_sections (template_version_id,title,position)
          values (v_version,'Ergänzungen',0) returning id into v_section;
      end if;
      insert into public.template_tasks (
        template_section_id,title,is_required,position
      ) values (
        v_section,
        trim(both '„“? ' from split_part(v_suggestion.title,' zur Vorlage',1)),
        false,
        (select coalesce(max(position),-1)+1 from public.template_tasks where template_section_id=v_section)
      );
      insert into public.template_change_log (template_version_id,change_type,entity_type,entity_title,details)
        values (v_version,'task_added','task',v_suggestion.title,jsonb_build_object('suggestion_id',v_suggestion.id));
    elsif v_suggestion.suggestion_type='make_optional' then
      update public.template_tasks tt set is_required=false
      from public.template_sections ts
      where tt.template_section_id=ts.id and ts.template_version_id=v_version
        and public.normalize_learning_text(tt.title)=v_suggestion.normalized_key;
      insert into public.template_change_log (template_version_id,change_type,entity_type,entity_title,details)
        values (v_version,'required_status_changed','task',v_suggestion.title,jsonb_build_object('suggestion_id',v_suggestion.id));
    elsif v_suggestion.suggestion_type='remove_task' then
      delete from public.template_tasks tt
      using public.template_sections ts
      where tt.template_section_id=ts.id and ts.template_version_id=v_version
        and public.normalize_learning_text(tt.title)=v_suggestion.normalized_key;
      insert into public.template_change_log (template_version_id,change_type,entity_type,entity_title,details)
        values (v_version,'task_removed','task',v_suggestion.title,jsonb_build_object('suggestion_id',v_suggestion.id));
    end if;
  end if;

  update public.learning_suggestions
  set status=p_resolution,resolved_at=now() where id=p_suggestion_id;
  return v_version;
end;
$$;

revoke all on function public.capture_production_task_activity() from public, anon;
revoke all on function public.capture_production_subtask_activity() from public, anon;
