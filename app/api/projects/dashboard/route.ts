import { NextResponse } from "next/server";
import { erpList, erpMethod } from "@/lib/server/erpnext";
import { requireSaaSUser, safeJsonError, tenantArgs } from "@/lib/server/apiGuard";

type Row = Record<string, unknown>;

async function list(doctype: string, fields: string[], limit = 100) {
  return erpList<Row>(doctype, { fields, limit, orderBy: "modified desc" }).catch(() => []);
}

function sum(rows: Row[], field: string) {
  return rows.reduce((total, row) => total + Number(row[field] || 0), 0);
}

export async function GET() {
  try {
    const session = requireSaaSUser();
    const args = tenantArgs({}, session);
    try {
      const live = await erpMethod<Record<string, unknown>>("projects.get_dashboard", args);
      if (live) return NextResponse.json(live);
    } catch {
      // Fall back to safe Business Suite CRUD wrapper below.
    }

    const [projects, tasks, timesheets, expenses, invoices] = await Promise.all([
      list("Project", ["name", "project_name", "customer", "status", "percent_complete", "expected_end_date", "total_costing_amount", "total_billable_amount", "total_billed_amount", "modified"]),
      list("Task", ["name", "subject", "project", "status", "priority", "exp_start_date", "exp_end_date", "progress", "modified"]),
      list("Timesheet", ["name", "employee", "employee_name", "start_date", "end_date", "total_hours", "total_billable_amount", "total_costing_amount", "status", "docstatus", "modified"]),
      list("Expense Claim", ["name", "employee", "employee_name", "posting_date", "total_claimed_amount", "total_sanctioned_amount", "approval_status", "status", "docstatus", "modified"]),
      list("Sales Invoice", ["name", "customer", "posting_date", "project", "grand_total", "outstanding_amount", "status", "docstatus", "modified"]),
    ]);

    const totalBillable = sum(projects, "total_billable_amount") || sum(timesheets, "total_billable_amount");
    const totalCosting = sum(projects, "total_costing_amount") || sum(timesheets, "total_costing_amount") + sum(expenses, "total_sanctioned_amount");
    const totalBilled = sum(projects, "total_billed_amount") || sum(invoices, "grand_total");

    return NextResponse.json({
      ok: true,
      source: "metadata-fallback",
      cards: {
        active_projects: projects.filter((p) => !String(p.status || "").toLowerCase().includes("complete")).length,
        open_tasks: tasks.filter((t) => !String(t.status || "").toLowerCase().includes("complete")).length,
        timesheets: timesheets.length,
        expense_claims: expenses.length,
        total_billable: totalBillable,
        total_costing: totalCosting,
        total_billed: totalBilled,
        profitability: totalBilled - totalCosting,
      },
      workflow: [
        { key: "projects", label: "Projects", count: projects.length, doctype: "Project" },
        { key: "tasks", label: "Tasks", count: tasks.length, doctype: "Task" },
        { key: "timesheets", label: "Timesheets", count: timesheets.length, doctype: "Timesheet" },
        { key: "expenses", label: "Expense Claims", count: expenses.length, doctype: "Expense Claim" },
        { key: "invoices", label: "Billing", count: invoices.length, doctype: "Sales Invoice" },
      ],
      projects,
      tasks,
      timesheets,
      expenses,
      invoices,
      profitability: projects.map((p) => ({
        project: p.project_name || p.name,
        customer: p.customer,
        billed: Number(p.total_billed_amount || 0),
        billable: Number(p.total_billable_amount || 0),
        cost: Number(p.total_costing_amount || 0),
        profit: Number(p.total_billed_amount || 0) - Number(p.total_costing_amount || 0),
      })),
    });
  } catch (error: unknown) {
    return safeJsonError(error, "Could not load projects dashboard.");
  }
}
