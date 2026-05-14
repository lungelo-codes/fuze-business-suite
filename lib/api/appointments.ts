import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api/client";

export const appointmentsApi = {
  workspace: () => apiGet("/api/workspaces/appointments"),
  list: () => apiGet("/api/crud/appointments"),
  create: (body: Record<string, unknown>) => apiPost("/api/crud/appointments", body),
  update: (id: string, body: Record<string, unknown>) => apiPut(`/api/crud/appointments/${encodeURIComponent(id)}`, body),
  remove: (id: string) => apiDelete(`/api/crud/appointments/${encodeURIComponent(id)}`),
};
