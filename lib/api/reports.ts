import { apiGet, apiPost } from "@/lib/api/client";

export const reportsApi = {
  dashboard: () => apiGet("/api/portal/reports"),
  exportPdf: (body: Record<string, unknown>) => apiPost("/api/reports/export/pdf", body),
  exportExcel: (body: Record<string, unknown>) => apiPost("/api/reports/export/excel", body),
};
