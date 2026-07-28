import { describe, expect, it } from "vitest";
import { sortProductions } from "./dates";

describe("production sorting", () => {
  it("orders overdue, today, future, then finished", () => {
    const values = [
      { planned_publish_date: "2026-07-30", status: "planned" as const },
      { planned_publish_date: "2026-07-20", status: "published" as const },
      { planned_publish_date: "2026-07-27", status: "planned" as const },
      { planned_publish_date: "2026-07-28", status: "planned" as const }
    ];
    expect(sortProductions(values, "2026-07-28").map(v => v.planned_publish_date))
      .toEqual(["2026-07-27", "2026-07-28", "2026-07-30", "2026-07-20"]);
  });
});
