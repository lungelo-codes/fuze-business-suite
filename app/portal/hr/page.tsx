import ModernModuleDashboard from "@/components/modules/ModernModuleDashboard";
import { erpList } from "@/lib/server/erpnext";

type Row = Record<string, unknown>;
async function safeList(doctype: string, fields: string[]): Promise<Row[]> {
  try { return await erpList<Row>(doctype, { fields, limit: 100, orderBy: "modified desc" }); } catch { return []; }
}

export default async function HRPage() {
  const [
    employees, attendance, shiftAssignments,
    leaveApplications, expenseClaims, travelRequests,
    salarySlips, employeeLoans,
    jobOpenings, jobApplicants,
    onboarding, transfers, separations, exitInterviews,
    appraisals,
  ] = await Promise.all([
    safeList("Employee", ["name", "employee_name", "status", "department", "designation", "company_email", "date_of_joining", "modified"]),
    safeList("Attendance", ["name", "employee", "employee_name", "status", "attendance_date", "working_hours", "modified"]),
    safeList("Shift Assignment", ["name", "employee", "employee_name", "shift_type", "start_date", "end_date", "status", "modified"]),
    safeList("Leave Application", ["name", "employee", "employee_name", "leave_type", "from_date", "to_date", "total_leave_days", "status", "modified"]),
    safeList("Expense Claim", ["name", "employee_name", "total_claimed_amount", "total_sanctioned_amount", "status", "posting_date", "modified"]),
    safeList("Travel Request", ["name", "employee_name", "travel_type", "departure_date", "status", "modified"]),
    safeList("Salary Slip", ["name", "employee", "employee_name", "gross_pay", "net_pay", "status", "start_date", "end_date", "docstatus", "modified"]),
    safeList("Employee Loan", ["name", "employee_name", "loan_type", "loan_amount", "status", "modified"]),
    safeList("Job Opening", ["name", "job_title", "department", "status", "no_of_positions", "modified"]),
    safeList("Job Applicant", ["name", "applicant_name", "job_title", "status", "modified"]),
    safeList("Employee Onboarding", ["name", "employee_name", "status", "onboarding_date", "modified"]),
    safeList("Employee Transfer", ["name", "employee_name", "transfer_date", "new_department", "modified"]),
    safeList("Employee Separation", ["name", "employee_name", "status", "separation_date", "modified"]),
    safeList("Exit Interview", ["name", "employee_name", "reason", "status", "date", "modified"]),
    safeList("Appraisal", ["name", "employee_name", "status", "start_date", "end_date", "total_score", "modified"]),
  ]);

  const activeEmployees = employees.filter((e) => String(e.status || "").toLowerCase() === "active");
  const pendingLeave = leaveApplications.filter((l) => ["Open", "Submitted"].includes(String(l.status || "")));
  const presentToday = attendance.filter((a) => a.status === "Present");
  const pendingExpenses = expenseClaims.filter((e) => ["Draft", "Submitted"].includes(String(e.status || "")));
  const totalExpenseClaimed = expenseClaims.reduce((s, e) => s + Number(e.total_claimed_amount || 0), 0);
  const totalNetPay = salarySlips
    .filter((s) => Number(s.docstatus) === 1)
    .reduce((s, slip) => s + Number(slip.net_pay || 0), 0);
  const openJobs = jobOpenings.filter((j) => j.status === "Open");
  const pendingOnboarding = onboarding.filter((o) => ["Pending", "In Progress"].includes(String(o.status || "")));
  const pendingAppraisals = appraisals.filter((a) => ["Draft", "Submitted"].includes(String(a.status || "")));

  return (
    <ModernModuleDashboard
      title="HR & Payroll"
      eyebrow="People Workspace — Frappe HR"
      description="End-to-end HR: recruitment, onboarding, shifts & attendance, leave, expense claims, performance appraisals and payroll — all integrated with ERPNext accounting. Powered by Frappe HR open source."
      rows={employees}
      tabs={[
        "HR Overview",
        "Employees",
        "Recruitment",
        "Lifecycle",
        "Attendance & Shifts",
        "Leave",
        "Expenses",
        "Performance",
        "Payroll",
      ]}
      metrics={[
        { label: "Active Employees", value: activeEmployees.length, hint: `${employees.length} total on record` },
        { label: "Leave Pending", value: pendingLeave.length, hint: "Awaiting approval" },
        { label: "Open Positions", value: openJobs.length, hint: `${jobApplicants.length} applicants in pipeline` },
        { label: "Net Payroll", value: `R${totalNetPay.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}`, hint: "Submitted salary slips" },
        { label: "Present Today", value: presentToday.length, hint: `${attendance.length} attendance records` },
        { label: "Expense Claims", value: pendingExpenses.length, hint: `R${totalExpenseClaimed.toLocaleString("en-ZA", { maximumFractionDigits: 0 })} total claimed` },
        { label: "Appraisals Due", value: pendingAppraisals.length, hint: `${appraisals.length} total appraisals` },
        { label: "Onboarding", value: pendingOnboarding.length, hint: `${separations.length} separations recorded` },
      ]}
      actions={[
        { label: "Post Job Opening", href: "/portal/job-openings", description: "Create a new vacancy" },
        { label: "View Applicants", href: "/portal/job-applicants", description: "Review recruitment pipeline" },
        { label: "Add Employee", href: "/portal/employees", description: "Create a staff profile" },
        { label: "Onboarding", href: "/portal/hr-onboarding", description: "Employee onboarding checklist" },
        { label: "Transfers", href: "/portal/hr-transfers", description: "Internal department transfers" },
        { label: "Mark Attendance", href: "/portal/attendance", description: "Daily attendance records" },
        { label: "Shift Assignments", href: "/portal/hr-shifts", description: "Roster and shift management" },
        { label: "Leave Requests", href: "/portal/leave", description: "Approve or reject leave" },
        { label: "Expense Claims", href: "/portal/expense-claims", description: "Employee reimbursement claims" },
        { label: "Run Appraisal", href: "/portal/appraisals", description: "Performance review cycle" },
        { label: "Run Payroll", href: "/portal/payroll", description: "Process monthly salary slips" },
        { label: "Salary Structures", href: "/portal/salary-structure", description: "Pay structure templates" },
        { label: "Employee Loans", href: "/portal/hr-loans", description: "Loan and advance tracking" },
        { label: "Exit Interviews", href: "/portal/exit-interviews", description: "Offboarding and separation" },
      ]}
      primaryField="employee_name"
      secondaryField="department"
      statusField="status"
      mode="hr"
    />
  );
}
