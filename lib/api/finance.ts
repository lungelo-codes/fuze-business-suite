import { apiGet, apiPost } from "@/lib/api/client";

export const financeApi = {
  workspace: () => apiGet("/api/workspaces/finance"),
  invoices: () => apiGet("/api/crud/invoices"),
  quotes: () => apiGet("/api/crud/quotes"),
  payments: () => apiGet("/api/crud/payments"),
  banking: () => apiGet("/api/finance/bank-reconciliation"),
  createInvoice: (body: Record<string, unknown>) => apiPost("/api/crud/invoices", body),
  sendInvoice: (id: string) => apiPost(`/api/finance/invoices/${encodeURIComponent(id)}/send`),
};
