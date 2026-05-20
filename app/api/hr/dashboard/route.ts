import { NextResponse } from "next/server";
import { erpList, erpMethod } from "@/lib/server/erpnext";
import { requireSaaSUser, safeJsonError, tenantArgs } from "@/lib/server/apiGuard";

type Row = Record<string, unknown>;

async function list(doctype: string, fields: string[], limit = 100) {
  return erpList<Row>(doctype, { fields, limit, orderBy: "modified desc" }).catch(() => []);
}

function countStatus(rows: Row[], value: string) {
  const needle = value.toLowerCase();
  return rows.filter((r) => String(r.status || r.approval_status || "").toLowerCase().includes(needle)).length;
}

function sum(rows: Row[], field: string) {
  return rows.reduce((total, row) => total + Number(row[field] || 0), 0);
}

export async function GET() {
  try {
    const session = requireSaaSUser();
    const args = tenantArgs({}, session);
    try {
      const live = await erpMethod<Record<string, unknown>>("hr.get_dashboard", args);
      if (live) return NextResponse.json(live);
    } catch {
      // Fall back to safe Business Suite CRUD wrapper below.
    }

    const [employees, attendance, leave, payroll, expenses, recruitment, appraisals, shifts] = await Promise.all([
      list("Employee", ["name", "employee_name", "department", "designation", "status", "date_of_joining", "company_email", "modified"], 200),
      list("Attendance", ["name", "employee", "employee_name", "attendance_date", "status", "working_hours", "shift", "modified"], 200),
      list("Leave Application", ["name", "employee", "employee_name", "leave_type", "from_date", "to_date", "total_leave_days", "status", "modified"], 100),
      list("Salary Slip", ["name", "employee", "employee_name", "start_date", "end_date", "gross_pay", "net_pay", "total_deduction", "status", "docstatus", "modified"], 100),
      list("Expense Claim", ["name", "employee", "employee_name", "posting_date", "total_claimed_amount", "total_sanctioned_amount", "approval_status", "status", "docstatus", "modified"], 100),
      list("Job Opening", ["name", "job_title", "department", "designation", "status", "modified"], 100),
      list("Appraisal", ["name", "employee", "employee_name", "appraisal_template", "status", "docstatus", "modified"], 100),
      list("Shift Type", ["name", "start_time", "end_time", "modified"], 50),
    ]);

    const departmentMap = new Map<string, number>();
    for (const employee of employees) {
      const department = String(employee.department || "No Department");
      departmentMap.set(department, (departmentMap.get(department) || 0) + 1);
    }

    return NextResponse.json({
      ok: true,
      source: "metadata-fallback",
      cards: {
        active_employees: countStatus(employees, "active"),
        present_today: countStatus(attendance, "present"),
        pending_leave: countStatus(leave, "open") + countStatus(leave, "pending"),
        payroll_total: sum(payroll, "net_pay"),
        pending_expenses: expenses.filter((e) => !String(e.approval_status || e.status || "").toLowerCase().includes("approved")).length,
        open_jobs: recruitment.filter((j) => !String(j.status || "").toLowerCase().includes("closed")).length,
        appraisals: appraisals.length,
        shifts: shifts.length,
      },
      modules: {
        employees: employees.length,
        attendance: attendance.length,
        leave: leave.length,
        payroll: payroll.length,
        expenses: expenses.length,
        recruitment: recruitment.length,
        performance: appraisals.length,
        shifts: shifts.length,
      },
      departments: Array.from(departmentMap.entries()).map(([department, count]) => ({ department, count })).sort((a, b) => b.count - a.count),
      employees,
      attendance,
      leave,
      payroll,
      expenses,
      recruitment,
      appraisals,
      shifts,
    });
  } catch (error: unknown) {
    return safeJsonError(error, "Could not load HR dashboard.");
  }
}
