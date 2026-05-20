
import { NextResponse } from "next/server";
import { erpList, erpMethod } from "@/lib/server/erpnext";
import { requireSaaSUser, safeJsonError, tenantArgs } from "@/lib/server/apiGuard";

type Row = Record<string, unknown>;
function group(rows: Row[], key: string) { const m = new Map<string, number>(); for (const r of rows) { const k = String(r[key] || "Unspecified"); m.set(k, (m.get(k) || 0) + 1); } return Array.from(m, ([label, value]) => ({ label, value })).sort((a,b)=>b.value-a.value); }
function sum(rows: Row[], key: string) { return rows.reduce((a, r) => a + Number(r[key] || 0), 0); }
async function list(doctype: string, fields: string[], limit = 300) { return erpList<Row>(doctype, { fields, limit, orderBy: "modified desc" }).catch(() => []); }

export async function GET() {
  try {
    const session = requireSaaSUser();
    const args = tenantArgs({}, session);
    try {
      const live = await erpMethod("hr.get_reports", args) as any;
      if (live?.data || live?.message) return NextResponse.json(live);
    } catch {}
    const [employees, attendance, leave, salary, expenses, jobs, appraisals, checkins] = await Promise.all([
      list("Employee", ["name","employee_name","department","designation","status","date_of_joining"], 300),
      list("Attendance", ["name","employee","employee_name","attendance_date","status","working_hours","shift"], 300),
      list("Leave Application", ["name","employee","employee_name","leave_type","status","total_leave_days","from_date","to_date"], 300),
      list("Salary Slip", ["name","employee","employee_name","gross_pay","net_pay","total_deduction","start_date","end_date","status"], 300),
      list("Expense Claim", ["name","employee","employee_name","total_claimed_amount","total_sanctioned_amount","approval_status","posting_date"], 300),
      list("Job Opening", ["name","job_title","department","status"], 100),
      list("Appraisal", ["name","employee","employee_name","status","appraisal_template"], 100),
      list("Employee Checkin", ["name","employee","employee_name","log_type","time","shift"], 300),
    ]);
    return NextResponse.json({ ok: true, data: {
      kpis: {
        employees: employees.length,
        active: employees.filter((r)=>String(r.status).toLowerCase()==="active").length,
        payroll_total: sum(salary, "net_pay"),
        expense_claimed: sum(expenses, "total_claimed_amount"),
        open_jobs: jobs.filter((r)=>!String(r.status).toLowerCase().includes("closed")).length,
        appraisals: appraisals.length,
      },
      employees_by_department: group(employees, "department"),
      attendance_by_status: group(attendance, "status"),
      leave_by_type: group(leave, "leave_type"),
      leave_by_status: group(leave, "status"),
      payroll_by_employee: salary.slice(0, 20).map((r)=>({ label: r.employee_name || r.employee || r.name, gross: Number(r.gross_pay||0), net: Number(r.net_pay||0) })),
      expenses_by_status: group(expenses, "approval_status"),
      jobs_by_status: group(jobs, "status"),
      checkins_by_type: group(checkins, "log_type"),
    }});
  } catch (error: unknown) { return safeJsonError(error, "Could not load HR reports."); }
}
