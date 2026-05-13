import ModernModuleDashboard from "@/components/modules/ModernModuleDashboard";
import { erpList, erpMethod } from "@/lib/server/erpnext";

type Row = Record<string, unknown>;
async function safeList(doctype: string, fields: string[]): Promise<Row[]> { try { return await erpList<Row>(doctype, { fields, limit: 100, orderBy: "modified desc" }); } catch { return []; } }

export default async function HRPage() {
  // Fetch base rows for employees, attendance and leave. These provide
  // individual record lists for the table view within the dashboard.
  const [employees, attendance, leave] = await Promise.all([
    safeList("Employee", ["name", "employee_name", "status", "department", "designation", "modified"]),
    safeList("Attendance", ["name", "employee", "employee_name", "status", "attendance_date", "modified"]),
    safeList("Leave Application", ["name", "employee", "employee_name", "status", "from_date", "to_date", "modified"]),
  ]);
  const rows = [...employees, ...attendance, ...leave];

  // Load aggregated HR dashboard metrics from the backend. If the call
  // fails for any reason, fall back to undefined so that metrics and
  // tab labels can still be derived from the raw row counts below.
  let dash: any = {};
  try {
    const res = await erpMethod<Record<string, unknown>>("hr.get_dashboard", {});
    dash = res || {};
  } catch {
    dash = {};
  }
  const cards: Record<string, any> = (dash as any)?.cards || {};
  const tabsRaw: any[] = Array.isArray((dash as any)?.tabs) ? ((dash as any)?.tabs as any[]) : [];

  // Build metrics. Prefer the backend card counts if present, otherwise
  // derive values from the lists fetched above. Hints describe what each
  // metric represents.
  const metrics = [
    { label: "Employees", value: cards.active_employees ?? employees.length, hint: "Active staff records" },
    { label: "Attendance", value: cards.present_today ?? attendance.length, hint: "Present today" },
    { label: "Leave", value: cards.pending_leave ?? leave.length, hint: "Pending leave requests" },
    { label: "Recruitment", value: cards.open_positions ?? 0, hint: "Open job positions" },
  ];

  // Convert tabs from the backend into labelled strings. If the backend
  // did not provide tabs (e.g. due to missing API update), use a
  // sensible default set. Counts are appended to the tab name when
  // available.
  let tabLabels: string[];
  if (tabsRaw.length) {
    tabLabels = tabsRaw.map((tab) => {
      const count = tab.count ?? tab.value ?? 0;
      return count ? `${tab.name} (${count})` : tab.name;
    });
  } else {
    tabLabels = [
      `Employees (${employees.length})`,
      `Attendance (${attendance.length})`,
      `Leave (${leave.length})`,
      `Payroll`,
    ];
  }
  const tabs = ["HR Dashboard", ...tabLabels];

  const actions = [
    { label: "Add Employee", href: "/portal/employees", description: "Create staff profile" },
    { label: "View Attendance", href: "/portal/attendance", description: "Track daily attendance" },
    { label: "Approve Leave", href: "/portal/leave", description: "Manage leave requests" },
    { label: "Payroll", href: "/portal/payroll", description: "Open payroll records" },
  ];

  return (
    <ModernModuleDashboard
      title="HR & Payroll"
      eyebrow="People Workspace"
      description="Manage employees, attendance, leave, assignments and payroll records without exposing ERPNext complexity."
      rows={rows}
      tabs={tabs}
      metrics={metrics}
      actions={actions}
      primaryField="employee_name"
      secondaryField="department"
      statusField="status"
      mode="hr"
    />
  );
}
