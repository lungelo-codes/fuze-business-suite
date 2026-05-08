import ModernModuleDashboard from "@/components/modules/ModernModuleDashboard";
import { erpList } from "@/lib/server/erpnext";

type Row = Record<string, unknown>;
async function safeList(doctype: string, fields: string[]): Promise<Row[]> { try { return await erpList<Row>(doctype, { fields, limit: 100, orderBy: "modified desc" }); } catch { return []; } }

export default async function HRPage() {
  const [employees, attendance, leave] = await Promise.all([
    safeList("Employee", ["name", "employee_name", "status", "department", "designation", "modified"]),
    safeList("Attendance", ["name", "employee", "employee_name", "status", "attendance_date", "modified"]),
    safeList("Leave Application", ["name", "employee", "employee_name", "status", "from_date", "to_date", "modified"]),
  ]);
  const rows = [...employees, ...attendance, ...leave];
  return <ModernModuleDashboard
    title="HR & Payroll"
    eyebrow="People Workspace"
    description="Manage employees, attendance, leave, assignments and payroll records without exposing ERPNext complexity."
    rows={rows}
    tabs={["HR Dashboard", "Employees", "Attendance", "Leave", "Payroll", "Assignments"]}
    metrics={[{ label: "Employees", value: employees.length, hint: "Active staff records" }, { label: "Attendance", value: attendance.length, hint: "Attendance logs" }, { label: "Leave", value: leave.length, hint: "Leave applications" }, { label: "Payroll", value: "Ready", hint: "Salary slip workflow" }]}
    actions={[{ label: "Add Employee", href: "/portal/employees", description: "Create staff profile" }, { label: "View Attendance", href: "/portal/attendance", description: "Track daily attendance" }, { label: "Approve Leave", href: "/portal/leave", description: "Manage leave requests" }, { label: "Payroll", href: "/portal/payroll", description: "Open payroll records" }]}
    primaryField="employee_name"
    secondaryField="department"
    statusField="status"
    mode="hr"
  />;
}
