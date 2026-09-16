import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getLocalISOString(d = new Date()) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// Format date to dd-MM-yyyy HH:mm
export function parseDateHelper(input?: string | number | Date): Date {
  if (!input) return new Date("");
  if (typeof input === 'string') {
    let isoString = input;
    if (isoString.includes(" ") && !isoString.includes("T")) {
      isoString = isoString.replace(" ", "T");
    }
    // Remove any trailing Z or +HH:mm or -HH:mm so the browser always treats it as local time
    isoString = isoString.replace(/(Z|[+-]\d{2}:?\d{2})$/i, "");
    return new Date(isoString);
  }
  return new Date(input);
}

export function formatDateTime(input?: string | number | Date): string {
  if (!input) return "";
  const date = parseDateHelper(input);
  if (isNaN(date.getTime())) return "";
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  const HH = String(date.getHours()).padStart(2, "0");
  const MM = String(date.getMinutes()).padStart(2, "0");
  return `${dd}-${mm}-${yyyy} ${HH}:${MM}`;
}

// Format date to dd-MM-yyyy (no time)
export function formatDate(input?: string | number | Date): string {
  if (!input) return "";
  const date = parseDateHelper(input);
  if (isNaN(date.getTime())) return "";
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

export function displayValue(val: any, fallback = "Chưa xác định"): string {
  if (val === undefined || val === null || val === "undefined" || val === "null" || val === "") {
    return fallback;
  }
  return String(val);
}
