import { erpList } from "@/lib/server/erpnext";

export type Row = Record<string, unknown>;

export async function safeList(doctype: string, fields: string[], limit = 100): Promise<Row[]> {
  try {
    return await erpList<Row>(doctype, { fields, limit, orderBy: "modified desc" });
  } catch {
    return [];
  }
}

export function countOpen(rows: Row[]) {
  return rows.filter((row) => {
    const s = String(row.status || row.priority || "").toLowerCase();
    return s.includes("open") || s.includes("progress") || s.includes("pending") || s.includes("draft") || s.includes("to ");
  }).length;
}

export function sumField(rows: Row[], field: string) {
  return rows.reduce((sum, row) => sum + Number(row[field] || 0), 0);
}

export function money(value: unknown) {
  return `R${Number(value || 0).toLocaleString("en-ZA", { maximumFractionDigits: 0 })}`;
}
