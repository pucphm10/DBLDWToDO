create index if not exists ignored_learning_patterns_format_id_idx
  on public.ignored_learning_patterns (format_id);

create index if not exists learning_suggestions_format_id_idx
  on public.learning_suggestions (format_id);
create index if not exists learning_suggestions_template_id_idx
  on public.learning_suggestions (template_id);

create index if not exists production_activity_production_id_idx
  on public.production_activity (production_id);

create index if not exists production_quality_checks_production_task_id_idx
  on public.production_quality_checks (production_task_id);
create index if not exists production_quality_checks_source_template_quality_check_id_idx
  on public.production_quality_checks (source_template_quality_check_id);

create index if not exists production_sections_source_template_section_id_idx
  on public.production_sections (source_template_section_id);

create index if not exists production_subtasks_source_template_subtask_id_idx
  on public.production_subtasks (source_template_subtask_id);

create index if not exists production_tasks_source_template_task_id_idx
  on public.production_tasks (source_template_task_id);

create index if not exists productions_format_id_idx
  on public.productions (format_id);
create index if not exists productions_template_id_idx
  on public.productions (template_id);
create index if not exists productions_template_version_id_idx
  on public.productions (template_version_id);

create index if not exists template_change_log_template_version_id_idx
  on public.template_change_log (template_version_id);

create index if not exists template_quality_checks_template_task_id_idx
  on public.template_quality_checks (template_task_id);

create index if not exists template_subtasks_template_task_id_idx
  on public.template_subtasks (template_task_id);

create index if not exists template_versions_created_by_idx
  on public.template_versions (created_by);

create index if not exists templates_current_version_id_idx
  on public.templates (current_version_id);
create index if not exists templates_format_id_idx
  on public.templates (format_id);
