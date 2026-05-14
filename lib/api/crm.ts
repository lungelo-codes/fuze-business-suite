import { apiGet, apiPost } from "@/lib/api/client";

export const crmApi = {
  workspace: () => apiGet("/api/workspaces/crm"),
  leads: () => apiGet("/api/crud/leads"),
  opportunities: () => apiGet("/api/crud/opportunities"),
  quotes: () => apiGet("/api/crud/quotes"),
  customers: () => apiGet("/api/crud/customers"),
  createLead: (body: Record<string, unknown>) => apiPost("/api/crud/leads", body),
  convertLead: (id: string) => apiPost(`/api/crm/leads/${encodeURIComponent(id)}/convert`),
  sendQuote: (id: string) => apiPost(`/api/crm/quotes/${encodeURIComponent(id)}/send`),
};
