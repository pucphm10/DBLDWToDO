import { describe, expect, it } from "vitest";
import { findRepeatedTasks, normalizeLearningText } from "./learning";

describe("learning signals", () => {
  it("normalizes punctuation, case and whitespace", () => {
    expect(normalizeLearningText("  Spielernamen – GEGENPRÜFEN!  ")).toBe("spielernamen gegenprüfen");
  });

  it("requires distinct productions", () => {
    const signals = findRepeatedTasks([
      { title: "Tabelle prüfen", productionId: "a" },
      { title: "Tabelle prüfen!", productionId: "a" },
      { title: "Tabelle prüfen", productionId: "b" },
      { title: "Tabelle prüfen", productionId: "c" }
    ]);
    expect(signals).toHaveLength(1);
    expect(signals[0].productionIds).toHaveLength(3);
  });
});
