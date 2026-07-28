import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function humanizeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("invalid_date_order")) return "Das Produktionsdatum muss vor der Veröffentlichung liegen.";
  if (message.includes("template_not_available")) return "Diese Vorlage ist nicht mehr verfügbar.";
  if (message.includes("Failed to fetch")) return "Keine Verbindung. Bitte prüfe dein Netzwerk und versuche es erneut.";
  if (message.includes("Invalid login credentials")) return "E-Mail oder Passwort stimmen nicht.";
  return "Das hat leider nicht funktioniert. Bitte versuche es erneut.";
}

export function formatDate(value: string, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("de-AT", options ?? {
    day: "2-digit", month: "short", year: "numeric"
  }).format(new Date(`${value}T12:00:00`));
}
