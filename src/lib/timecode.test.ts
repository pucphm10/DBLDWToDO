import { describe, expect, it } from "vitest";
import { normalizeTimecode } from "./timecode";

describe("timecode validation", () => {
  it.each([
    ["12:43", "12:43"],
    ["1:12:43", "01:12:43"],
    ["00:12:43", "00:12:43"]
  ])("normalizes %s", (input, expected) => expect(normalizeTimecode(input)).toBe(expected));

  it.each(["12:99", "abc", "12:3", "1:70:12"])("rejects %s", (input) => {
    expect(normalizeTimecode(input)).toBeNull();
  });
});
