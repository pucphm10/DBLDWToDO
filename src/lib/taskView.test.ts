import { describe, expect, it } from "vitest";
import type { Section, Task, TaskStatus } from "../types/domain";
import { findFocusSection, getVisibleSections, taskStatusPresentation } from "./taskView";

function task(id: string, status: TaskStatus, required = true, position = 0): Task {
  return {
    id,
    title: id,
    description: "",
    hint: "",
    is_required: required,
    status,
    position,
    origin: "template",
    task_type: "standard",
    production_subtasks: [],
    production_quality_checks: []
  };
}

function section(id: string, tasks: Task[]): Section {
  return {
    id,
    title: id,
    description: "",
    position: 0,
    is_collapsed: false,
    production_tasks: tasks
  };
}

describe("task focus view", () => {
  it("prioritizes the section containing a blocked task", () => {
    const sections = [
      section("first", [task("open", "open")]),
      section("second", [task("blocked", "blocked")])
    ];

    expect(findFocusSection(sections)?.id).toBe("second");
  });

  it("shows a bounded, priority-sorted set in focus mode", () => {
    const sections = [section("work", [
      task("open-optional", "open", false, 0),
      task("active", "in_progress", true, 1),
      task("blocked", "blocked", true, 2),
      task("done", "done", true, 3)
    ])];

    const visible = getVisibleSections(sections, "focus", "", 3);

    expect(visible[0].production_tasks.map((item) => item.id)).toEqual([
      "blocked", "active", "open-optional"
    ]);
  });

  it("gives every task status a distinct presentation", () => {
    expect(new Set(Object.values(taskStatusPresentation).map((item) => item.rowClass)).size).toBe(5);
  });
});
