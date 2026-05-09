import ModernModuleDashboard from "@/components/modules/ModernModuleDashboard";
import { fuzeData, rowsFrom } from "@/lib/server/fuzeApi";

type Row = Record<string, unknown>;

export default async function HRPage() {
  const [dashboard, employeesData, leaveData, attendanceData] = await Promise.all([
    fuzeData<Row>("fuze_suite.api.hr.get_dashboard", {}, {}),
    fuzeData<Row>("fuze_suite.api.hr.get_employees", {}, {}),
    fuzeData<Row>("fuze_suite.api.hr.get_leave_requests", {}, {}),
    fuzeData<Row>("fuze_suite.api.hr.get_attendance", {}, {}),
  ]);

  const cards = (dashboard.cards || {}) as Row;
  const employees = rowsFrom(employeesData, ["employees", "rows", "data"]);
  const leave = rowsFrom(leaveData, ["leave_requests", "leaves", "rows", "data"]);
  const attendance = rowsFrom(attendanceData, ["attendance", "rows", "data"]);

  return (
    <ModernModuleDashboard
      title="HR & Payroll"
      eyebrow="People Workspace"
      description="Employees, departments, attendance and leave are loaded through the controlled Fuze HR API."
      rows={[...employees, ...leave, ...attendance]}
      tabs={["HR Dashboard", "Employees", "Attendance", "Leave", "Payroll"]}
      metrics={[
        { label: "Active Employees", value: Number(cards.active_employees || employees.length), hint: "Current staff" },
        { label: "Present Today", value: Number(cards.present_today || 0), hint: "Attendance today" },
        { label: "Pending Leave", value: Number(cards.pending_leave || leave.length), hint: "Awaiting approval" },
        { label: "Departments", value: Number(cards.departments || 0), hint: "Company structure" },
      ]}
      actions={[
        { label: "Add Employee", href: "/portal/employees", description: "Create a staff profile" },
        { label: "Attendance", href: "/portal/attendance", description: "Track daily attendance" },
        { label: "Leave", href: "/portal/leave", description: "Approve leave requests" },
        { label: "Payroll", href: "/portal/payroll", description: "Process payroll" },
      ]}
      primaryField="employee_name"
      secondaryField="department"
      statusField="status"
      mode="hr"
    />
  );
}
