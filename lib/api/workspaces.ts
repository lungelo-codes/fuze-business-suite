import { apiGet } from "@/lib/api/client";

export type WorkspaceName = "crm" | "finance" | "hr" | "compliance" | "appointments" | "documents";
export type WorkspaceData = Record<string, unknown> & { rows?: Record<string, unknown>[]; metrics?: Record<string, number> };

export function getWorkspaceData<T extends WorkspaceData = WorkspaceData>(workspace: WorkspaceName) {
  return apiGet<T>(`/api/workspaces/${workspace}`);
}
