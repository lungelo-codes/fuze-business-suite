import { erpList } from "@/lib/server/erpnext";

interface HRData {
  employees: Record<string, unknown>[];
  attendance: Record<string, unknown>[];
  leaves: Record<string, unknown>[];
  onboarding: Record<string, unknown>[];
  shifts: Record<string, unknown>[];
  salarySlips: Record<string, unknown>[];
}

export async function GET(): Promise<Response> {
  try {
    const [employees, attendance, leaves, onboarding, shifts, salarySlips] = await Promise.all([
      erpList("Employee", {
        fields: ["name", "employee_name", "department", "designation", "status", "company_email", "date_of_joining", "modified"],
        limit: 50,
        orderBy: "modified desc"
      }).catch(() => []),
      erpList("Attendance", {
        fields: ["name", "employee", "employee_name", "attendance_date", "status", "working_hours", "modified"],
        limit: 50,
        orderBy: "attendance_date desc"
      }).catch(() => []),
      erpList("Leave Application", {
        fields: ["name", "employee", "employee_name", "leave_type", "from_date", "to_date", "total_leave_days", "status", "modified"],
        limit: 50,
        orderBy: "from_date desc"
      }).catch(() => []),
      erpList("Employee Onboarding", {
        fields: ["name", "employee", "employee_name", "status", "onboarding_date", "completion_date", "modified"],
        limit: 50,
        orderBy: "modified desc"
      }).catch(() => []),
      erpList("Shift Assignment", {
        fields: ["name", "employee", "employee_name", "shift", "start_date", "end_date", "status", "modified"],
        limit: 50,
        orderBy: "start_date desc"
      }).catch(() => []),
      erpList("Salary Slip", {
        fields: ["name", "employee", "employee_name", "start_date", "end_date", "gross_pay", "net_pay", "status", "modified"],
        limit: 50,
        orderBy: "modified desc"
      }).catch(() => [])
    ]);

    const data: HRData = {
      employees,
      attendance,
      leaves,
      onboarding,
      shifts,
      salarySlips
    };

    return Response.json({ success: true, data });
  } catch (error) {
    return Response.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch HR data" },
      { status: 500 }
    );
  }
}
