export function normalizeTimecode(value: string): string | null {
  const raw = value.trim();
  if (!/^(?:\d{1,3}:)?\d{1,2}:\d{2}$/.test(raw)) return null;
  const parts = raw.split(":").map(Number);
  if (parts.some(Number.isNaN)) return null;
  const seconds = parts.at(-1)!;
  const minutes = parts.at(-2)!;
  if (seconds > 59 || minutes > 59) return null;
  if (parts.length === 2) return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  return `${String(parts[0]).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
