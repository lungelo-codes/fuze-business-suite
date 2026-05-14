import { apiGet, apiPost } from "@/lib/api/client";

export const hrApi = {
  workspace: () => apiGet("/api/workspaces/hr"),
  employees: () => apiGet("/api/crud/employees"),
  attendance: () => apiGet("/api/crud/attendance"),
  leave: () => apiGet("/api/crud/leave"),
  payroll: () => apiGet("/api/crud/payroll"),
  addEmployee: (body: Record<string, unknown>) => apiPost("/api/crud/employees", body),
};
