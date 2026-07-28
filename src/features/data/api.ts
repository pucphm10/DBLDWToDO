import { supabase } from "../../lib/supabase";
import type { LearningSuggestion, Production, Template } from "../../types/domain";

function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data as T;
}

export async function listProductions(): Promise<Production[]> {
  const result = await supabase
    .from("productions")
    .select("*, formats(name,slug)")
    .neq("status", "archived")
    .order("planned_publish_date", { ascending: true })
    .limit(100);
  return unwrap(result as any);
}

export async function getProduction(id: string): Promise<Production> {
  const result = await supabase
    .from("productions")
    .select(`
      *, formats(name,slug), template_versions(version_number),
      production_sections(
        *,
        production_tasks(
          *,
          production_subtasks(*),
          production_quality_checks(*)
        )
      )
    `)
    .eq("id", id)
    .single();
  const production = unwrap<Production>(result as any);
  production.production_sections?.sort((a, b) => a.position - b.position);
  for (const section of production.production_sections ?? []) {
    section.production_tasks.sort((a, b) => a.position - b.position);
    for (const task of section.production_tasks) {
      task.production_subtasks.sort((a, b) => a.position - b.position);
      task.production_quality_checks.sort((a, b) => a.position - b.position);
    }
  }
  return production;
}

export async function listTemplates(): Promise<Template[]> {
  const result = await supabase
    .from("templates")
    .select("*, formats(name,slug), template_versions(version_number)")
    .eq("is_active", true)
    .order("name");
  const rows = unwrap(result as any) as Template[];
  return rows.map((row) => ({
    ...row,
    template_versions: row.template_versions?.sort((a, b) => b.version_number - a.version_number)
  }));
}

export async function getTemplate(id: string): Promise<any> {
  const templateResult = await supabase
    .from("templates")
    .select("*, formats(name,slug), template_versions(*)")
    .eq("id", id)
    .single();
  const template = unwrap<Record<string, any>>(templateResult as any);
  const versionId = template.current_version_id;
  const sectionResult = await supabase
    .from("template_sections")
    .select("*, template_tasks(*, template_subtasks(*), template_quality_checks(*))")
    .eq("template_version_id", versionId)
    .order("position");
  const sections = unwrap<any[]>(sectionResult as any);
  for (const section of sections) {
    section.template_tasks.sort((a: any, b: any) => a.position - b.position);
    for (const task of section.template_tasks) {
      task.template_subtasks.sort((a: any, b: any) => a.position - b.position);
      task.template_quality_checks.sort((a: any, b: any) => a.position - b.position);
    }
  }
  return { ...template, sections };
}

export async function createProduction(input: {
  templateId: string;
  workingTitle: string;
  productionDate: string;
  plannedPublishDate: string;
  priority?: number | null;
  notes?: string;
}): Promise<string> {
  const result = await supabase.rpc("create_production_from_template", {
    p_template_id: input.templateId,
    p_working_title: input.workingTitle,
    p_production_date: input.productionDate,
    p_planned_publish_date: input.plannedPublishDate,
    p_priority: input.priority ?? null,
    p_notes: input.notes ?? ""
  });
  return unwrap(result as any);
}

export async function updateTaskStatus(id: string, status: string) {
  const result = await supabase.from("production_tasks").update({
    status,
    completed_at: status === "done" ? new Date().toISOString() : null
  }).eq("id", id).select().single();
  return unwrap(result as any);
}

export async function updateSubtaskStatus(id: string, status: string) {
  const result = await supabase.from("production_subtasks").update({
    status,
    completed_at: status === "done" ? new Date().toISOString() : null
  }).eq("id", id).select().single();
  return unwrap(result as any);
}

export async function toggleQualityCheck(id: string, isCompleted: boolean) {
  const result = await supabase.from("production_quality_checks")
    .update({ is_completed: isCompleted }).eq("id", id).select().single();
  return unwrap(result as any);
}

export async function addSubtask(input: {
  taskId: string; title: string; timecode?: string | null;
}) {
  const positionResult = await supabase.from("production_subtasks")
    .select("position").eq("production_task_id", input.taskId)
    .order("position", { ascending: false }).limit(1);
  if (positionResult.error) throw new Error(positionResult.error.message);
  const position = (positionResult.data?.[0]?.position ?? -1) + 1;
  const result = await supabase.from("production_subtasks").insert({
    production_task_id: input.taskId,
    title: input.title,
    timecode: input.timecode || null,
    position,
    origin: "custom"
  }).select().single();
  return unwrap(result as any);
}

export async function addProductionTask(input: {
  sectionId: string; title: string; isRequired?: boolean;
}) {
  const positionResult = await supabase.from("production_tasks")
    .select("position").eq("production_section_id", input.sectionId)
    .order("position", { ascending: false }).limit(1);
  if (positionResult.error) throw new Error(positionResult.error.message);
  const result = await supabase.from("production_tasks").insert({
    production_section_id: input.sectionId,
    title: input.title,
    position: (positionResult.data?.[0]?.position ?? -1) + 1,
    origin: "custom",
    is_required: input.isRequired ?? false
  }).select().single();
  return unwrap(result as any);
}

export async function updateProduction(id: string, values: Record<string, unknown>) {
  const result = await supabase.from("productions").update(values).eq("id", id).select().single();
  return unwrap(result as any);
}

export async function setSectionCollapsed(id: string, value: boolean) {
  const result = await supabase.from("production_sections")
    .update({ is_collapsed: value }).eq("id", id).select().single();
  return unwrap(result as any);
}

export async function duplicateTemplateVersion(id: string, summary: string): Promise<string> {
  const result = await supabase.rpc("duplicate_current_template_version", {
    p_template_id: id, p_change_summary: summary
  });
  return unwrap(result as any);
}

export async function addTemplateTask(sectionId: string, title: string, required: boolean) {
  const positionResult = await supabase.from("template_tasks")
    .select("position").eq("template_section_id", sectionId)
    .order("position", { ascending: false }).limit(1);
  if (positionResult.error) throw new Error(positionResult.error.message);
  const result = await supabase.from("template_tasks").insert({
    template_section_id: sectionId,
    title,
    is_required: required,
    position: (positionResult.data?.[0]?.position ?? -1) + 1
  }).select().single();
  return unwrap(result as any);
}

export async function updateTemplateTask(id: string, values: Record<string, unknown>) {
  const result = await supabase.from("template_tasks").update(values).eq("id", id).select().single();
  return unwrap(result as any);
}

export async function deleteTemplateTask(id: string) {
  const result = await supabase.from("template_tasks").delete().eq("id", id);
  if (result.error) throw new Error(result.error.message);
}

export async function addTemplateSection(versionId: string, title: string) {
  const positionResult = await supabase.from("template_sections")
    .select("position").eq("template_version_id", versionId)
    .order("position", { ascending: false }).limit(1);
  if (positionResult.error) throw new Error(positionResult.error.message);
  const result = await supabase.from("template_sections").insert({
    template_version_id: versionId, title, position: (positionResult.data?.[0]?.position ?? -1) + 1
  }).select().single();
  return unwrap(result as any);
}

export async function deleteTemplateSection(id: string) {
  const result = await supabase.from("template_sections").delete().eq("id", id);
  if (result.error) throw new Error(result.error.message);
}

export async function swapTemplateSectionPositions(
  first: { id: string; position: number },
  second: { id: string; position: number }
) {
  const results = await Promise.all([
    supabase.from("template_sections").update({ position: second.position }).eq("id", first.id),
    supabase.from("template_sections").update({ position: first.position }).eq("id", second.id)
  ]);
  const error = results.find(result => result.error)?.error;
  if (error) throw new Error(error.message);
}

export async function swapTemplateTaskPositions(
  first: { id: string; position: number },
  second: { id: string; position: number }
) {
  const results = await Promise.all([
    supabase.from("template_tasks").update({ position: second.position }).eq("id", first.id),
    supabase.from("template_tasks").update({ position: first.position }).eq("id", second.id)
  ]);
  const error = results.find(result => result.error)?.error;
  if (error) throw new Error(error.message);
}

export async function listSuggestions(): Promise<LearningSuggestion[]> {
  const result = await supabase.from("learning_suggestions")
    .select("*, formats(name)").eq("status", "open").order("created_at", { ascending: false });
  return unwrap(result as any);
}

export async function refreshSuggestions() {
  const result = await supabase.rpc("refresh_learning_suggestions");
  return unwrap(result as any);
}

export async function resolveSuggestion(id: string, resolution: "accepted" | "rejected" | "ignored") {
  const result = await supabase.rpc("resolve_learning_suggestion", {
    p_suggestion_id: id, p_resolution: resolution
  });
  return unwrap(result as any);
}

export async function seedWorkspace() {
  const result = await supabase.rpc("seed_my_workspace");
  return unwrap(result as any);
}
