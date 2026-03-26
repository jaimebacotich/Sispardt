import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { es } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formatea fecha ISO a "DD/MM/YYYY HH:mm" */
export function formatDateTime(iso: string): string {
  return format(parseISO(iso), "dd/MM/yyyy HH:mm", { locale: es });
}

/** Formatea fecha ISO a "DD/MM/YYYY" */
export function formatDate(iso: string): string {
  return format(parseISO(iso), "dd/MM/yyyy", { locale: es });
}

/** Tiempo relativo: "hace 5 minutos" */
export function timeAgo(iso: string): string {
  return formatDistanceToNow(parseISO(iso), { addSuffix: true, locale: es });
}

/** Trunca texto a maxLen caracteres */
export function truncate(text: string, maxLen = 50): string {
  return text.length > maxLen ? text.slice(0, maxLen) + "…" : text;
}

/** Capitaliza primera letra */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/** Formatea un número con separadores de miles */
export function formatNumber(n: number): string {
  return n.toLocaleString("es-BO");
}

/** Formatea un porcentaje */
export function formatPercent(n: number, decimals = 1): string {
  return `${n.toFixed(decimals)}%`;
}
