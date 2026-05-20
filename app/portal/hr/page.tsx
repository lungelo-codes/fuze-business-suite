import { erpList, erpMethod } from "@/lib/server/erpnext";
import HRWorkspaceClient from "@/components/hr/HRWorkspaceClient";

type Row = Record<string, unknown>;

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try { return await fn(); } catch { return fallback; }
}

export default async function HRPage({ searchParams }: { searchParams?: { tab?: string } }) {
  const [employees, attendance, leave, payroll, expenses, recruitment, appraisals, dashRaw] = await Promise.all([
    safe(() => erpList<Row>("Employee", {
      fields: ["name","employee_name","first_name","last_name","department","designation",
               "status","company_email","cell_number","date_of_joining","modified"],
      limit: 200, orderBy: "modified desc",
    }), []),
    safe(() => erpList<Row>("Attendance", {
      fields: ["name","employee","employee_name","attendance_date","status",
               "working_hours","in_time","out_time","modified"],
      limit: 200, orderBy: "attendance_date desc",
    }), []),
    safe(() => erpList<Row>("Leave Application", {
      fields: ["name","employee","employee_name","leave_type","from_date","to_date",
               "total_leave_days","status","description","modified"],
      limit: 100, orderBy: "from_date desc",
    }), []),
    safe(() => erpList<Row>("Salary Slip", {
      fields: ["name","employee","employee_name","start_date","end_date","gross_pay",
               "net_pay","total_deduction","status","docstatus","payroll_frequency","modified"],
      limit: 100, orderBy: "modified desc",
    }), []),
    safe(() => erpList<Row>("Expense Claim", {
      fields: ["name","employee","employee_name","posting_date","total_claimed_amount",
               "total_sanctioned_amount","approval_status","status","docstatus","modified"],
      limit: 100, orderBy: "modified desc",
    }), []),
    safe(() => erpList<Row>("Job Opening", {
      fields: ["name","job_title","department","designation","status","modified"],
      limit: 100, orderBy: "modified desc",
    }), []),
    safe(() => erpList<Row>("Appraisal", {
      fields: ["name","employee","employee_name","appraisal_template","status","docstatus","modified"],
      limit: 100, orderBy: "modified desc",
    }), []),
    safe(() => erpMethod<Record<string, unknown>>("hr.get_dashboard", {}), null),
  ]);

  const dash = (dashRaw && typeof dashRaw === "object") ? dashRaw : {};
  const cards = (dash.cards && typeof dash.cards === "object")
    ? dash.cards as Record<string, unknown>
    : {};
  const depts = Array.isArray(dash.departments)
    ? (dash.departments as { department: string; count: number }[])
    : [];

  // payroll_total: compute from actual salary slips (gross_pay numbers)
  // because hr.get_dashboard returns monthly_payroll as a money string like "R 12,500"
  const payrollArr = Array.isArray(payroll) ? payroll : [];
  const expensesArr = Array.isArray(expenses) ? expenses : [];
  const recruitmentArr = Array.isArray(recruitment) ? recruitment : [];
  const appraisalsArr = Array.isArray(appraisals) ? appraisals : [];
  const payrollTotal = payrollArr.reduce((s: number, p: Row) => s + Number(p.net_pay || 0), 0);

  const dashMetrics = {
    active_employees: typeof cards.active_employees === "number"
      ? cards.active_employees
      : (Array.isArray(employees) ? employees : []).filter((e: Row) => String(e.status || "").toLowerCase() === "active").length,
    present_today: typeof cards.present_today === "number" ? cards.present_today : undefined,
    pending_leave: typeof cards.pending_leave === "number" ? cards.pending_leave : undefined,
    payroll_total: payrollTotal,
    departments: depts,
    pending_expenses: expensesArr.filter((e: Row) => !String(e.approval_status || e.status || "").toLowerCase().includes("approved")).length,
    open_jobs: recruitmentArr.filter((j: Row) => !String(j.status || "").toLowerCase().includes("closed")).length,
    appraisals: appraisalsArr.length,
  };

  return (
    <HRWorkspaceClient
      initialTab={searchParams?.tab}
      initialEmployees={Array.isArray(employees) ? employees : []}
      initialAttendance={Array.isArray(attendance) ? attendance : []}
      initialLeave={Array.isArray(leave) ? leave : []}
      initialPayroll={payrollArr}
      initialExpenses={expensesArr}
      initialRecruitment={recruitmentArr}
      initialAppraisals={appraisalsArr}
      dashMetrics={dashMetrics}
    />
  );
}
