import { getCrudConfig } from "@/lib/crudConfig";
import { listModuleRows } from "@/lib/server/moduleApi";

export async function getCrudRows(moduleId: string): Promise<Record<string, unknown>[]> {
  const config = getCrudConfig(moduleId);
  if (!config) return [];
  try {
    return await listModuleRows(moduleId);
  } catch {
    return [];
  }
}
