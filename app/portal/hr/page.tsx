import { erpMethod, erpList } from "@/lib/server/erpnext";
import HRWorkspaceClient from "@/components/hr/HRWorkspaceClient";

type Row = Record<string, unknown>;

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try { return await fn(); } catch { return fallback; }
}

function unwrapRows(v: unknown): Row[] {
  const val = v as Record<string, unknown>;
  if (Array.isArray(v)) return v as Row[];
  if (Array.isArray(val?.data)) return val.data as Row[];
  if (Array.isArray(val?.message)) return val.message as Row[];
  for (const k of ["employees", "rows", "items", "records", "slips", "attendance", "leaves"]) {
    if (Array.isArray(val?.[k])) return val[k] as Row[];
  }
  return [];
}

export default async function HRPage() {
  const [employees, attendance, leave, payroll, dashRaw] = await Promise.all([
    safe(() => erpList<Row>("Employee", { fields: ["name","employee_name","first_name","last_name","department","designation","status","company_email","cell_number","date_of_joining","modified"], limit:200, orderBy:"modified desc" }), []),
    safe(() => erpList<Row>("Attendance", { fields: ["name","employee","employee_name","attendance_date","status","working_hours","in_time","out_time","modified"], limit:200, orderBy:"attendance_date desc" }), []),
    safe(() => erpList<Row>("Leave Application", { fields: ["name","employee","employee_name","leave_type","from_date","to_date","total_leave_days","status","description","modified"], limit:100, orderBy:"from_date desc" }), []),
    safe(() => erpList<Row>("Salary Slip", { fields: ["name","employee","employee_name","start_date","end_date","gross_pay","net_pay","status","docstatus","payroll_frequency","modified"], limit:100, orderBy:"modified desc" }), []),
    safe(() => erpMethod<unknown>("hr.get_dashboard", {}), {}),
  ]);

  const dash = (dashRaw && typeof dashRaw === "object") ? dashRaw as Record<string, unknown> : {};
  const cards = (dash.cards && typeof dash.cards === "object") ? dash.cards as Record<string, unknown> : {};
  const depts = Array.isArray(dash.departments) ? dash.departments as { department: string; count: number }[] : [];

  const dashMetrics = {
    active_employees: typeof cards.active_employees === "number" ? cards.active_employees : employees.filter((e) => String(e.status || "").toLowerCase() === "active").length,
    present_today: typeof cards.present_today === "number" ? cards.present_today : undefined,
    pending_leave: typeof cards.pending_leave === "number" ? cards.pending_leave : undefined,
    payroll_total: cards.payroll_total ?? undefined,
    departments: depts,
  };

  return (
    <HRWorkspaceClient
      initialEmployees={Array.isArray(employees) ? employees : unwrapRows(employees)}
      initialAttendance={Array.isArray(attendance) ? attendance : unwrapRows(attendance)}
      initialLeave={Array.isArray(leave) ? leave : unwrapRows(leave)}
      initialPayroll={Array.isArray(payroll) ? payroll : unwrapRows(payroll)}
      dashMetrics={dashMetrics}
    />
  );
}
