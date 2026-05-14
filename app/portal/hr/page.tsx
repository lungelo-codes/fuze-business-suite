import ModernModuleDashboard from "@/components/modules/ModernModuleDashboard";
import { getHrWorkspace } from "@/lib/server/businessApi";

export default async function HRPage() {
  const data = await getHrWorkspace();
  return <ModernModuleDashboard
    title="HR & Payroll"
    eyebrow="People Workspace"
    description="Manage employees, attendance, leave, recruitment and payroll records from one HR dashboard without exposing ERPNext complexity."
    rows={data.rows}
    tabs={["HR Dashboard", "Employees", "Attendance", "Leave", "Payroll", "Recruitment", "Performance"]}
    metrics={[
      { label: "Employees", value: data.metrics.employees, hint: "Staff records" },
      { label: "Attendance", value: data.metrics.attendance, hint: "Attendance logs" },
      { label: "Leave", value: data.metrics.leave, hint: "Leave applications" },
      { label: "Payroll", value: data.metrics.payroll, hint: "Salary slips" },
    ]}
    actions={[
      { label: "Add Employee", href: "/portal/employees", description: "Create staff profile" },
      { label: "View Attendance", href: "/portal/attendance", description: "Track daily attendance" },
      { label: "Approve Leave", href: "/portal/leave", description: "Manage leave requests" },
      { label: "Run Payroll", href: "/portal/payroll", description: "Open payroll records" },
    ]}
    primaryField="employee_name"
    secondaryField="department"
    statusField="status"
    mode="hr"
  />;
}
