-- DBLDW Production Workflow System
-- PostgreSQL 15+ / Supabase hosted

create extension if not exists pgcrypto;

create type public.production_status as enum (
  'planned', 'prepared', 'in_production', 'editing', 'quality_control',
  'ready', 'published', 'archived'
);
create type public.task_status as enum ('open', 'in_progress', 'done', 'skipped', 'blocked');
create type public.task_origin as enum ('template', 'custom');
create type public.suggestion_status as enum ('open', 'accepted', 'rejected', 'ignored');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.formats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text not null default '',
  default_publish_weekday smallint check (default_publish_weekday between 1 and 7),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, slug)
);

create table public.templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  format_id uuid not null references public.formats(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  description text not null default '',
  current_version_id uuid,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.template_versions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.templates(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  change_summary text not null default '',
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (template_id, version_number)
);

alter table public.templates
  add constraint templates_current_version_fk
  foreign key (current_version_id) references public.template_versions(id) on delete set null;

create table public.template_sections (
  id uuid primary key default gen_random_uuid(),
  template_version_id uuid not null references public.template_versions(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  description text not null default '',
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now()
);

create table public.template_tasks (
  id uuid primary key default gen_random_uuid(),
  template_section_id uuid not null references public.template_sections(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 240),
  description text not null default '',
  hint text not null default '',
  is_required boolean not null default true,
  estimated_minutes integer check (estimated_minutes is null or estimated_minutes between 1 and 10080),
  position integer not null default 0 check (position >= 0),
  task_type text not null default 'standard'
    check (task_type in ('standard','edit_point','insert','overlay','note','advertising','link_tip')),
  created_at timestamptz not null default now()
);

create table public.template_subtasks (
  id uuid primary key default gen_random_uuid(),
  template_task_id uuid not null references public.template_tasks(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 240),
  description text not null default '',
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now()
);

create table public.template_quality_checks (
  id uuid primary key default gen_random_uuid(),
  template_task_id uuid not null references public.template_tasks(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 240),
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now()
);

create table public.template_change_log (
  id uuid primary key default gen_random_uuid(),
  template_version_id uuid not null references public.template_versions(id) on delete cascade,
  change_type text not null,
  entity_type text not null,
  entity_title text not null default '',
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.productions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  format_id uuid not null references public.formats(id) on delete restrict,
  template_id uuid references public.templates(id) on delete set null,
  template_version_id uuid references public.template_versions(id) on delete set null,
  working_title text not null default '' check (char_length(working_title) <= 240),
  final_title text not null default '' check (char_length(final_title) <= 240),
  production_date date not null,
  planned_publish_date date not null,
  actual_publish_date date,
  status public.production_status not null default 'planned',
  priority smallint check (priority is null or priority between 1 and 3),
  notes text not null default '' check (char_length(notes) <= 20000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  check (production_date <= planned_publish_date),
  check (actual_publish_date is null or status in ('published','archived'))
);

create table public.production_sections (
  id uuid primary key default gen_random_uuid(),
  production_id uuid not null references public.productions(id) on delete cascade,
  source_template_section_id uuid references public.template_sections(id) on delete set null,
  title text not null check (char_length(title) between 1 and 160),
  description text not null default '',
  position integer not null default 0 check (position >= 0),
  is_collapsed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.production_tasks (
  id uuid primary key default gen_random_uuid(),
  production_section_id uuid not null references public.production_sections(id) on delete cascade,
  source_template_task_id uuid references public.template_tasks(id) on delete set null,
  title text not null check (char_length(title) between 1 and 240),
  description text not null default '',
  hint text not null default '',
  is_required boolean not null default true,
  status public.task_status not null default 'open',
  estimated_minutes integer check (estimated_minutes is null or estimated_minutes between 1 and 10080),
  position integer not null default 0 check (position >= 0),
  origin public.task_origin not null default 'template',
  task_type text not null default 'standard'
    check (task_type in ('standard','edit_point','insert','overlay','note','advertising','link_tip')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.production_subtasks (
  id uuid primary key default gen_random_uuid(),
  production_task_id uuid not null references public.production_tasks(id) on delete cascade,
  source_template_subtask_id uuid references public.template_subtasks(id) on delete set null,
  title text not null check (char_length(title) between 1 and 240),
  description text not null default '',
  timecode text check (timecode is null or timecode ~ '^(?:[0-9]{1,3}:)?[0-5][0-9]:[0-5][0-9]$'),
  status public.task_status not null default 'open',
  position integer not null default 0 check (position >= 0),
  origin public.task_origin not null default 'template',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.production_quality_checks (
  id uuid primary key default gen_random_uuid(),
  production_task_id uuid not null references public.production_tasks(id) on delete cascade,
  source_template_quality_check_id uuid references public.template_quality_checks(id) on delete set null,
  title text not null check (char_length(title) between 1 and 240),
  is_completed boolean not null default false,
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.production_activity (
  id uuid primary key default gen_random_uuid(),
  production_id uuid not null references public.productions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null,
  entity_id uuid,
  action_type text not null,
  previous_value jsonb not null default '{}'::jsonb,
  new_value jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.learning_suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  format_id uuid not null references public.formats(id) on delete cascade,
  template_id uuid references public.templates(id) on delete cascade,
  suggestion_type text not null check (suggestion_type in ('add_task','make_optional','remove_task','reorder_task','add_hint')),
  title text not null,
  description text not null default '',
  evidence jsonb not null default '[]'::jsonb,
  normalized_key text not null,
  confidence_score numeric(4,3) not null default 0 check (confidence_score between 0 and 1),
  occurrence_count integer not null default 0 check (occurrence_count >= 0),
  status public.suggestion_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique (user_id, format_id, suggestion_type, normalized_key)
);

create table public.ignored_learning_patterns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  format_id uuid not null references public.formats(id) on delete cascade,
  normalized_key text not null,
  reason text not null default '',
  created_at timestamptz not null default now(),
  unique (user_id, format_id, normalized_key)
);

create index formats_user_active_idx on public.formats (user_id, is_active);
create index templates_user_format_idx on public.templates (user_id, format_id, is_active);
create index template_versions_template_idx on public.template_versions (template_id, version_number desc);
create index template_sections_version_position_idx on public.template_sections (template_version_id, position);
create index template_tasks_section_position_idx on public.template_tasks (template_section_id, position);
create index productions_user_status_publish_idx on public.productions (user_id, status, planned_publish_date);
create index productions_user_dates_idx on public.productions (user_id, production_date, planned_publish_date);
create index production_sections_production_position_idx on public.production_sections (production_id, position);
create index production_tasks_section_status_idx on public.production_tasks (production_section_id, status, position);
create index production_subtasks_task_status_idx on public.production_subtasks (production_task_id, status, position);
create index production_activity_learning_idx on public.production_activity (user_id, action_type, created_at desc);
create index learning_suggestions_open_idx on public.learning_suggestions (user_id, status, created_at desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'profiles','formats','templates','productions','production_sections',
    'production_tasks','production_subtasks','production_quality_checks','learning_suggestions'
  ] loop
    execute format(
      'create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      table_name
    );
  end loop;
end $$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;
revoke all on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.create_production_from_template(
  p_template_id uuid,
  p_working_title text,
  p_production_date date,
  p_planned_publish_date date,
  p_priority smallint default null,
  p_notes text default ''
) returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_template public.templates;
  v_production_id uuid;
  v_section record;
  v_new_section_id uuid;
  v_task record;
  v_new_task_id uuid;
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  if p_production_date > p_planned_publish_date then raise exception 'invalid_date_order'; end if;

  select * into v_template from public.templates
  where id = p_template_id and user_id = v_user_id and is_active and current_version_id is not null;
  if not found then raise exception 'template_not_available'; end if;

  insert into public.productions (
    user_id, format_id, template_id, template_version_id, working_title,
    production_date, planned_publish_date, priority, notes
  ) values (
    v_user_id, v_template.format_id, v_template.id, v_template.current_version_id,
    coalesce(p_working_title, ''), p_production_date, p_planned_publish_date, p_priority, coalesce(p_notes, '')
  ) returning id into v_production_id;

  for v_section in
    select * from public.template_sections
    where template_version_id = v_template.current_version_id order by position, id
  loop
    insert into public.production_sections (
      production_id, source_template_section_id, title, description, position
    ) values (
      v_production_id, v_section.id, v_section.title, v_section.description, v_section.position
    ) returning id into v_new_section_id;

    for v_task in
      select * from public.template_tasks
      where template_section_id = v_section.id order by position, id
    loop
      insert into public.production_tasks (
        production_section_id, source_template_task_id, title, description, hint,
        is_required, estimated_minutes, position, origin, task_type
      ) values (
        v_new_section_id, v_task.id, v_task.title, v_task.description, v_task.hint,
        v_task.is_required, v_task.estimated_minutes, v_task.position, 'template', v_task.task_type
      ) returning id into v_new_task_id;

      insert into public.production_subtasks (
        production_task_id, source_template_subtask_id, title, description, position, origin
      )
      select v_new_task_id, id, title, description, position, 'template'
      from public.template_subtasks where template_task_id = v_task.id;

      insert into public.production_quality_checks (
        production_task_id, source_template_quality_check_id, title, position
      )
      select v_new_task_id, id, title, position
      from public.template_quality_checks where template_task_id = v_task.id;
    end loop;
  end loop;

  insert into public.production_activity (
    production_id, user_id, entity_type, entity_id, action_type, new_value
  ) values (
    v_production_id, v_user_id, 'production', v_production_id, 'created_from_template',
    jsonb_build_object('template_id', v_template.id, 'template_version_id', v_template.current_version_id)
  );

  return v_production_id;
end;
$$;

create or replace function public.duplicate_current_template_version(
  p_template_id uuid,
  p_change_summary text
) returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_template public.templates;
  v_version_id uuid;
  v_number integer;
  v_section record;
  v_new_section_id uuid;
  v_task record;
  v_new_task_id uuid;
begin
  select * into v_template from public.templates where id = p_template_id and user_id = v_user_id for update;
  if not found then raise exception 'template_not_found'; end if;
  select coalesce(max(version_number), 0) + 1 into v_number
  from public.template_versions where template_id = p_template_id;
  insert into public.template_versions (template_id, version_number, change_summary, created_by)
  values (p_template_id, v_number, coalesce(p_change_summary, ''), v_user_id)
  returning id into v_version_id;

  if v_template.current_version_id is not null then
    for v_section in
      select * from public.template_sections where template_version_id = v_template.current_version_id order by position
    loop
      insert into public.template_sections (template_version_id, title, description, position)
      values (v_version_id, v_section.title, v_section.description, v_section.position)
      returning id into v_new_section_id;
      for v_task in
        select * from public.template_tasks where template_section_id = v_section.id order by position
      loop
        insert into public.template_tasks (
          template_section_id, title, description, hint, is_required, estimated_minutes, position, task_type
        ) values (
          v_new_section_id, v_task.title, v_task.description, v_task.hint,
          v_task.is_required, v_task.estimated_minutes, v_task.position, v_task.task_type
        ) returning id into v_new_task_id;
        insert into public.template_subtasks (template_task_id, title, description, position)
          select v_new_task_id, title, description, position
          from public.template_subtasks where template_task_id = v_task.id;
        insert into public.template_quality_checks (template_task_id, title, position)
          select v_new_task_id, title, position
          from public.template_quality_checks where template_task_id = v_task.id;
      end loop;
    end loop;
  end if;
  update public.templates set current_version_id = v_version_id where id = p_template_id;
  insert into public.template_change_log (template_version_id, change_type, entity_type, details)
  values (v_version_id, 'version_created', 'template', jsonb_build_object('summary', p_change_summary));
  return v_version_id;
end;
$$;

-- RLS: every public table is protected.
do $$
declare table_name text;
begin
  foreach table_name in array array[
    'profiles','formats','templates','template_versions','template_sections','template_tasks',
    'template_subtasks','template_quality_checks','template_change_log','productions',
    'production_sections','production_tasks','production_subtasks','production_quality_checks',
    'production_activity','learning_suggestions','ignored_learning_patterns'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end $$;

create policy profiles_own on public.profiles for all to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy formats_own on public.formats for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy templates_own on public.templates for all to authenticated
  using ((select auth.uid()) = user_id) with check (
    (select auth.uid()) = user_id and exists (
      select 1 from public.formats f where f.id = format_id and f.user_id = (select auth.uid())
    )
  );
create policy template_versions_own on public.template_versions for all to authenticated
  using (exists (select 1 from public.templates t where t.id = template_id and t.user_id = (select auth.uid())))
  with check (
    created_by = (select auth.uid()) and
    exists (select 1 from public.templates t where t.id = template_id and t.user_id = (select auth.uid()))
  );
create policy template_sections_own on public.template_sections for all to authenticated
  using (exists (
    select 1 from public.template_versions v join public.templates t on t.id = v.template_id
    where v.id = template_version_id and t.user_id = (select auth.uid())
  )) with check (exists (
    select 1 from public.template_versions v join public.templates t on t.id = v.template_id
    where v.id = template_version_id and t.user_id = (select auth.uid())
  ));
create policy template_tasks_own on public.template_tasks for all to authenticated
  using (exists (
    select 1 from public.template_sections s join public.template_versions v on v.id=s.template_version_id
      join public.templates t on t.id=v.template_id
    where s.id=template_section_id and t.user_id=(select auth.uid())
  )) with check (exists (
    select 1 from public.template_sections s join public.template_versions v on v.id=s.template_version_id
      join public.templates t on t.id=v.template_id
    where s.id=template_section_id and t.user_id=(select auth.uid())
  ));
create policy template_subtasks_own on public.template_subtasks for all to authenticated
  using (exists (
    select 1 from public.template_tasks tt join public.template_sections s on s.id=tt.template_section_id
      join public.template_versions v on v.id=s.template_version_id join public.templates t on t.id=v.template_id
    where tt.id=template_task_id and t.user_id=(select auth.uid())
  )) with check (exists (
    select 1 from public.template_tasks tt join public.template_sections s on s.id=tt.template_section_id
      join public.template_versions v on v.id=s.template_version_id join public.templates t on t.id=v.template_id
    where tt.id=template_task_id and t.user_id=(select auth.uid())
  ));
create policy template_quality_checks_own on public.template_quality_checks for all to authenticated
  using (exists (
    select 1 from public.template_tasks tt join public.template_sections s on s.id=tt.template_section_id
      join public.template_versions v on v.id=s.template_version_id join public.templates t on t.id=v.template_id
    where tt.id=template_task_id and t.user_id=(select auth.uid())
  )) with check (exists (
    select 1 from public.template_tasks tt join public.template_sections s on s.id=tt.template_section_id
      join public.template_versions v on v.id=s.template_version_id join public.templates t on t.id=v.template_id
    where tt.id=template_task_id and t.user_id=(select auth.uid())
  ));
create policy template_change_log_own on public.template_change_log for all to authenticated
  using (exists (
    select 1 from public.template_versions v join public.templates t on t.id=v.template_id
    where v.id=template_version_id and t.user_id=(select auth.uid())
  )) with check (exists (
    select 1 from public.template_versions v join public.templates t on t.id=v.template_id
    where v.id=template_version_id and t.user_id=(select auth.uid())
  ));
create policy productions_own on public.productions for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy production_sections_own on public.production_sections for all to authenticated
  using (exists (select 1 from public.productions p where p.id=production_id and p.user_id=(select auth.uid())))
  with check (exists (select 1 from public.productions p where p.id=production_id and p.user_id=(select auth.uid())));
create policy production_tasks_own on public.production_tasks for all to authenticated
  using (exists (
    select 1 from public.production_sections s join public.productions p on p.id=s.production_id
    where s.id=production_section_id and p.user_id=(select auth.uid())
  )) with check (exists (
    select 1 from public.production_sections s join public.productions p on p.id=s.production_id
    where s.id=production_section_id and p.user_id=(select auth.uid())
  ));
create policy production_subtasks_own on public.production_subtasks for all to authenticated
  using (exists (
    select 1 from public.production_tasks pt join public.production_sections s on s.id=pt.production_section_id
      join public.productions p on p.id=s.production_id
    where pt.id=production_task_id and p.user_id=(select auth.uid())
  )) with check (exists (
    select 1 from public.production_tasks pt join public.production_sections s on s.id=pt.production_section_id
      join public.productions p on p.id=s.production_id
    where pt.id=production_task_id and p.user_id=(select auth.uid())
  ));
create policy production_quality_checks_own on public.production_quality_checks for all to authenticated
  using (exists (
    select 1 from public.production_tasks pt join public.production_sections s on s.id=pt.production_section_id
      join public.productions p on p.id=s.production_id
    where pt.id=production_task_id and p.user_id=(select auth.uid())
  )) with check (exists (
    select 1 from public.production_tasks pt join public.production_sections s on s.id=pt.production_section_id
      join public.productions p on p.id=s.production_id
    where pt.id=production_task_id and p.user_id=(select auth.uid())
  ));
create policy production_activity_own on public.production_activity for all to authenticated
  using ((select auth.uid())=user_id) with check (
    (select auth.uid())=user_id and exists (
      select 1 from public.productions p where p.id=production_id and p.user_id=(select auth.uid())
    )
  );
create policy learning_suggestions_own on public.learning_suggestions for all to authenticated
  using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy ignored_patterns_own on public.ignored_learning_patterns for all to authenticated
  using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);

-- Explicit grants support new projects where public is not auto-exposed to the Data API.
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
revoke all on function public.create_production_from_template(uuid,text,date,date,smallint,text) from public, anon;
revoke all on function public.duplicate_current_template_version(uuid,text) from public, anon;
grant execute on function public.create_production_from_template(uuid,text,date,date,smallint,text) to authenticated;
grant execute on function public.duplicate_current_template_version(uuid,text) to authenticated;
revoke all on all tables in schema public from anon;
