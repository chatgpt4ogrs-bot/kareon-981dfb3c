import { differenceInYears, format, type FormatOptions } from "date-fns";

/** Extrai yyyy-MM-dd de DATE/ISO/string; vazio se inválido. */
export function toDateOnly(value: unknown): string {
  if (value == null || value === "") return "";
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return "";
    const y = value.getUTCFullYear();
    const m = String(value.getUTCMonth() + 1).padStart(2, "0");
    const d = String(value.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const s = String(value).trim();
  const iso = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "";
  return toDateOnly(d);
}

/** Date local ao meio-dia para exibir DATE sem virar o dia anterior. */
export function parseDateOnly(value: unknown): Date | null {
  const day = toDateOnly(value);
  if (!day) return null;
  const d = new Date(`${day}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function parseInstant(value: unknown): Date | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function safeFormat(
  value: unknown,
  pattern: string,
  options?: FormatOptions,
  fallback = "—"
): string {
  const d = parseInstant(value) || parseDateOnly(value);
  if (!d) return fallback;
  try {
    return format(d, pattern, options);
  } catch {
    return fallback;
  }
}

export function safeFormatDateOnly(
  value: unknown,
  pattern = "dd/MM/yyyy",
  options?: FormatOptions,
  fallback = "—"
): string {
  const d = parseDateOnly(value);
  if (!d) return fallback;
  try {
    return format(d, pattern, options);
  } catch {
    return fallback;
  }
}

export function safeAgeYears(value: unknown): number | null {
  const d = parseDateOnly(value) || parseInstant(value);
  if (!d) return null;
  try {
    const age = differenceInYears(new Date(), d);
    return Number.isFinite(age) && age >= 0 && age < 150 ? age : null;
  } catch {
    return null;
  }
}
