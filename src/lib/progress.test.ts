import { describe, expect, it } from "vitest";
import { calculateProgress, isTaskComplete } from "./progress";
import type { Task } from "../types/domain";

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: crypto.randomUUID(), title: "Test", description: "", hint: "",
    is_required: true, status: "open", position: 0, origin: "template",
    task_type: "standard", production_subtasks: [], production_quality_checks: [],
    ...overrides
  };
}

describe("progress calculation", () => {
  it("counts a manually completed task", () => {
    const summary = calculateProgress({ production_sections: [{
      id: "s", title: "S", description: "", position: 0, is_collapsed: false,
      production_tasks: [task({ status: "done" }), task()]
    }] });
    expect(summary.total).toBe(50);
    expect(summary.openRequired).toBe(1);
  });

  it("completes a task when all relevant subtasks are done", () => {
    const value = task({ production_subtasks: [
      { id: "1", title: "A", description: "", timecode: null, status: "done", position: 0, origin: "template" },
      { id: "2", title: "B", description: "", timecode: null, status: "skipped", position: 1, origin: "template" }
    ] });
    expect(isTaskComplete(value)).toBe(true);
  });

  it("removes skipped optional tasks from the denominator", () => {
    const summary = calculateProgress({ production_sections: [{
      id: "s", title: "S", description: "", position: 0, is_collapsed: false,
      production_tasks: [task({ status: "done" }), task({ status: "skipped", is_required: false })]
    }] });
    expect(summary.total).toBe(100);
  });
});
