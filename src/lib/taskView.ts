import type { Section, Task, TaskStatus } from "../types/domain";

export type TaskFilter =
  | "focus" | "all" | "open" | "in_progress" | "done"
  | "skipped" | "blocked" | "required" | "custom";

export const taskStatusPresentation: Record<TaskStatus, {
  label: string;
  tone: "neutral" | "green" | "amber" | "red" | "blue";
  rowClass: string;
  titleClass: string;
}> = {
  open: {
    label: "Offen",
    tone: "neutral",
    rowClass: "bg-white",
    titleClass: "text-ink"
  },
  in_progress: {
    label: "In Arbeit",
    tone: "blue",
    rowClass: "bg-blue-50/70",
    titleClass: "text-blue-950"
  },
  done: {
    label: "Erledigt",
    tone: "green",
    rowClass: "bg-emerald-50/50",
    titleClass: "text-black/35 line-through"
  },
  skipped: {
    label: "Übersprungen",
    tone: "neutral",
    rowClass: "bg-black/[0.035] opacity-65",
    titleClass: "text-black/40 line-through"
  },
  blocked: {
    label: "Blockiert",
    tone: "red",
    rowClass: "bg-red-50/80",
    titleClass: "text-red-950"
  }
};

function focusRank(task: Task) {
  if (task.status === "blocked") return 0;
  if (task.status === "in_progress") return 1;
  if (task.status === "open" && task.is_required) return 2;
  if (task.status === "open") return 3;
  return 4;
}

export function findFocusSection(sections: Section[]): Section | undefined {
  return sections.find((section) => section.production_tasks.some((task) => task.status === "blocked"))
    ?? sections.find((section) => section.production_tasks.some((task) => task.status === "in_progress"))
    ?? sections.find((section) => section.production_tasks.some((task) => task.status === "open" && task.is_required))
    ?? sections.find((section) => section.production_tasks.some((task) => task.status === "open"));
}

export function getVisibleSections(
  sections: Section[],
  filter: TaskFilter,
  search: string,
  focusLimit = 12
): Section[] {
  const normalizedSearch = search.trim().toLowerCase();

  if (filter === "focus" && !normalizedSearch) {
    const focusSection = findFocusSection(sections);
    if (!focusSection) return [];
    const tasks = focusSection.production_tasks
      .filter((task) => ["open", "in_progress", "blocked"].includes(task.status))
      .sort((a, b) => focusRank(a) - focusRank(b) || a.position - b.position)
      .slice(0, focusLimit);
    return [{ ...focusSection, production_tasks: tasks }];
  }

  return sections.map((section) => ({
    ...section,
    production_tasks: section.production_tasks.filter((task) => {
      const haystack = [
        task.title,
        task.hint,
        ...task.production_subtasks.flatMap((subtask) => [subtask.title, subtask.timecode ?? ""])
      ].join(" ").toLowerCase();
      const statusMatches = normalizedSearch || filter === "all" || filter === "focus"
        ? true
        : filter === "required"
          ? task.is_required
          : filter === "custom"
            ? task.origin === "custom"
            : task.status === filter;
      return statusMatches && haystack.includes(normalizedSearch);
    })
  })).filter((section) => section.production_tasks.length > 0 || (!normalizedSearch && filter === "all"));
}
