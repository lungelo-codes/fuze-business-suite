import { apiGet, apiPost } from "@/lib/api/client";

export const complianceApi = {
  workspace: () => apiGet("/api/workspaces/compliance"),
  overview: () => apiGet("/api/workspaces/compliance"),
  reminders: () => apiGet("/api/crud/compliance-reminders"),
  addReminder: (body: Record<string, unknown>) => apiPost("/api/crud/compliance-reminders", body),
};
