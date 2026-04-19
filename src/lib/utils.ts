import { clsx, type ClassValue } from "clsx";
export function cn(...inputs: ClassValue[]) { return clsx(inputs); }

export const fmtEur = (n?: number | null) =>
  (n ?? 0).toLocaleString("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2 });

export const fmtEurSans = (n?: number | null) =>
  (n ?? 0).toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

export const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export const fmtTime = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "—";

export const fmtDuree = (minutes?: number | null) => {
  if (!minutes) return "—";
  return `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, "0")}`;
};

export const todayISO = () => new Date().toISOString().slice(0, 10);

export const addDays = (n: number) => {
  const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10);
};

export const initiales = (nom: string) =>
  nom.split(" ").map((n) => n[0]?.toUpperCase() ?? "").join("").slice(0, 2);
