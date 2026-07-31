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

  -- A parent task deletion cascades to its subtasks after the parent row is gone.
  -- The task-level activity already contains the full previous task state.
  if tg_op = 'DELETE' and v_user_id is null then
    return old;
  end if;

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

revoke all on function public.capture_production_subtask_activity() from public, anon;
