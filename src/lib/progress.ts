import type { Production, Task } from "../types/domain";

export interface ProgressSummary {
  total: number;
  required: number;
  open: number;
  openRequired: number;
  openEditPoints: number;
  qualityDone: number;
  qualityTotal: number;
}

export function isTaskComplete(task: Task): boolean {
  if (task.status === "done") return true;
  const relevant = task.production_subtasks.filter((item) => item.status !== "skipped");
  return relevant.length > 0 && relevant.every((item) => item.status === "done");
}

export function calculateProgress(production: Pick<Production, "production_sections">): ProgressSummary {
  const tasks = production.production_sections?.flatMap((section) => section.production_tasks) ?? [];
  const counted = tasks.filter((task) => !(task.status === "skipped" && !task.is_required));
  const required = tasks.filter((task) => task.is_required);
  const completed = counted.filter(isTaskComplete);
  const requiredCompleted = required.filter(isTaskComplete);
  const checks = tasks.flatMap((task) => task.production_quality_checks);
  return {
    total: counted.length ? Math.round((completed.length / counted.length) * 100) : 0,
    required: required.length ? Math.round((requiredCompleted.length / required.length) * 100) : 0,
    open: counted.filter((task) => !isTaskComplete(task)).length,
    openRequired: required.filter((task) => !isTaskComplete(task)).length,
    openEditPoints: tasks
      .filter((task) => task.task_type === "edit_point")
      .flatMap((task) => task.production_subtasks)
      .filter((item) => item.status !== "done" && item.status !== "skipped").length,
    qualityDone: checks.filter((check) => check.is_completed).length,
    qualityTotal: checks.length
  };
}
