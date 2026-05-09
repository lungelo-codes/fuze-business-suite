import { getCrudConfig } from "@/lib/crudConfig";
import { erpList } from "@/lib/server/erpnext";
import { getModuleMeta } from "@/lib/server/doctypeMeta";
const UNSAFE_LIST_FIELDS = new Set(["source", "sales_stage", "probability", "expected_closing"]);
async function safeList(doctype: string, fields: string[]) {
  const attempts = [fields, fields.filter((field) => !UNSAFE_LIST_FIELDS.has(field)), ["name", "status", "modified"], ["name", "modified"], ["name"]].map((items) => Array.from(new Set(items.filter(Boolean))));
  for (const attempt of attempts) { try { return await erpList<Record<string, unknown>>(doctype, { fields: attempt, limit: 200, orderBy: "modified desc" }); } catch {} }
  return [];
}
export async function getCrudRows(moduleId: string): Promise<Record<string, unknown>[]> {
  const config = getCrudConfig(moduleId); if (!config) return [];
  try { const meta = await getModuleMeta(config); const allowed = new Set(meta.allowedFieldnames || []); const fields = (meta.listFields?.length ? meta.listFields : config.listFields).filter((field) => field === "name" || allowed.has(field)); return await safeList(config.doctype, fields.length ? fields : ["name", "modified"]); } catch { return []; }
}
