import type { Production } from "../types/domain";

export function productionSortScore(production: Pick<Production, "planned_publish_date" | "status">, today: string) {
  if (production.status === "published" || production.status === "archived") return 4;
  if (production.planned_publish_date < today) return 0;
  if (production.planned_publish_date === today) return 1;
  return 2;
}

export function sortProductions<T extends Pick<Production, "planned_publish_date" | "status">>(
  productions: T[],
  today = new Date().toISOString().slice(0, 10)
) {
  return [...productions].sort((a, b) => {
    const bucket = productionSortScore(a, today) - productionSortScore(b, today);
    return bucket || a.planned_publish_date.localeCompare(b.planned_publish_date);
  });
}
