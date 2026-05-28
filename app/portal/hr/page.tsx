import ERPModuleWorkspace from "@/components/modules/ERPModuleWorkspace";
import { safeList } from "@/lib/server/coreBusinessData";

export default async function HRPage() {
  const [employees, leave, attendance, payroll] = await Promise.all([
    safeList("Employee", ["name", "employee_name", "department", "designation", "status", "modified"], 100),
    safeList("Leave Application", ["name", "employee_name", "leave_type", "status", "from_date", "to_date", "modified"], 100),
    safeList("Attendance", ["name", "employee_name", "department", "status", "attendance_date", "modified"], 100),
    safeList("Salary Slip", ["name", "employee_name", "status", "gross_pay", "net_pay", "modified"], 50),
  ]);
  const rows = [...employees, ...leave, ...attendance, ...payroll];
  return <ERPModuleWorkspace
    moduleName="hr"
    eyebrow="Frappe HR"
    title="HR Workspace"
    description="Manage employees, leave, attendance, payroll readiness and people performance in one SaaS workspace. Built to follow Frappe HR flows without inventing separate HR logic."
    rows={rows}
    tabs={["Overview", "Employees", "Leave", "Attendance", "Payroll", "Performance"]}
    metrics={[
      { label: "Employees", value: employees.length, hint: "Active staff records", tone: "blue" },
      { label: "Leave Requests", value: leave.length, hint: "Leave applications", tone: "purple" },
      { label: "Attendance", value: attendance.length, hint: "Recent attendance", tone: "green" },
      { label: "Payroll", value: payroll.length, hint: "Salary slips", tone: "orange" },
    ]}
    flow={[
      { label: "Employee", count: employees.length, tone: "blue" },
      { label: "Attendance", count: attendance.length, tone: "green" },
      { label: "Leave", count: leave.length, tone: "purple" },
      { label: "Payroll", count: payroll.length, tone: "orange" },
      { label: "Performance", hint: "Reviews", tone: "pink" },
    ]}
    actions={[
      { label: "Add Employee", href: "/portal/employees", description: "Create or update employee profiles" },
      { label: "Review Leave", href: "/portal/leave", description: "Approve pending leave requests" },
      { label: "Attendance", href: "/portal/attendance", description: "Check daily attendance" },
      { label: "Payroll", href: "/portal/payroll", description: "Review salary slip workflow" },
    ]}
    insights={[
      { title: "Keep payroll clean", detail: "Resolve missing attendance and leave approvals before payroll is processed.", tone: "warn" },
      { title: "Improve team visibility", detail: "Use department filters to see which teams are under-capacitated.", tone: "ok" },
      { title: "Reduce manual HR work", detail: "Push employees, leave and attendance into one owner-level dashboard.", tone: "ok" },
    ]}
    primaryField="employee_name"
    secondaryField="department"
    statusField="status"
    valueField="net_pay"
    aiTitle="HR AI Analyst"
    ownerQuestion="Which employees, departments or payroll items need attention this week?"
  />;
}
