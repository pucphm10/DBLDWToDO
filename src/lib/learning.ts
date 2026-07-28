export function normalizeLearningText(value: string): string {
  return value
    .toLocaleLowerCase("de")
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export interface RepeatedSignal {
  normalizedKey: string;
  sample: string;
  productionIds: string[];
}

export function findRepeatedTasks(
  events: { title: string; productionId: string }[],
  threshold = 3
): RepeatedSignal[] {
  const groups = new Map<string, RepeatedSignal>();
  for (const event of events) {
    const key = normalizeLearningText(event.title);
    const group = groups.get(key) ?? { normalizedKey: key, sample: event.title, productionIds: [] };
    if (!group.productionIds.includes(event.productionId)) group.productionIds.push(event.productionId);
    groups.set(key, group);
  }
  return [...groups.values()].filter((group) => group.productionIds.length >= threshold);
}
