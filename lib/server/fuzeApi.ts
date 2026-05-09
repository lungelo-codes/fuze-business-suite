import { erpMethod } from "@/lib/server/erpnext";

export type FuzeResponse<T = Record<string, unknown>> = {
  success?: boolean;
  message?: string;
  data?: T;
  meta?: Record<string, unknown>;
  error?: string;
};

type AnyRow = Record<string, unknown>;

export async function fuzeMethod<T = AnyRow>(method: string, args: AnyRow = {}): Promise<FuzeResponse<T>> {
  const response = await erpMethod<FuzeResponse<T>>(method, args);
  if (!response) return { success: false, message: "No response from Business Suite API", data: {} as T };
  return response;
}

export async function fuzeData<T = AnyRow>(method: string, args: AnyRow = {}, fallback: T): Promise<T> {
  try {
    const response = await fuzeMethod<T>(method, args);
    return (response.data ?? fallback) as T;
  } catch {
    return fallback;
  }
}

export function rowsFrom(data: unknown, keys: string[]): AnyRow[] {
  if (Array.isArray(data)) return data as AnyRow[];
  if (!data || typeof data !== "object") return [];
  const obj = data as Record<string, unknown>;
  for (const key of keys) {
    const value = obj[key];
    if (Array.isArray(value)) return value as AnyRow[];
  }
  return [];
}

export function cardsFrom(data: unknown): Record<string, number> {
  if (!data || typeof data !== "object") return {};
  const cards = (data as Record<string, unknown>).cards;
  if (!cards || typeof cards !== "object") return {};
  return cards as Record<string, number>;
}

export function money(value: unknown): string {
  const n = Number(value || 0);
  return `R${n.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}`;
}
