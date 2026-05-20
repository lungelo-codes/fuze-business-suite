import { NextResponse } from "next/server";
import { erpList, erpMethod } from "@/lib/server/erpnext";
import { requireSaaSUser, safeJsonError, tenantArgs } from "@/lib/server/apiGuard";

type Row = Record<string, unknown>;
type Any = Record<string, any>;

async function safeMethod<T = Any>(method: string, args: Any = {}, fallback: T): Promise<T> {
  try {
    const res = await erpMethod<any>(method, args);
    return ((res as any)?.data ?? res ?? fallback) as T;
  } catch {
    return fallback;
  }
}

async function list(doctype: string, fields: string[], limit = 25) {
  return erpList<Row>(doctype, { fields, limit, orderBy: "modified desc" }).catch(() => []);
}

async function listAny(doctype: string, fieldSets: string[][], limit = 25) {
  for (const fields of fieldSets) {
    const rows = await list(doctype, fields, limit);
    if (rows.length || fields.length <= 3) return rows;
  }
  return [];
}

function moneyTotal(rows: Row[], field: string) {
  return rows.reduce((sum, row) => sum + Number(row[field] || 0), 0);
}

export async function GET() {
  try {
    const session = requireSaaSUser();
    const base = tenantArgs({}, session);

    const [
      procurementDashboard,
      projectsDashboard,
      qualityDashboard,
      dataDashboard,
      financeDashboard,
      suppliers,
      materialRequests,
      rfqs,
      supplierQuotes,
      purchaseOrders,
      receipts,
      purchaseInvoices,
      supplierPayments,
      projectRows,
      taskRows,
      timesheets,
      expenses,
      qualityGoals,
      inspections,
      nonConformances,
      supplierQuality,
      qualityMeetings,
      qualityReviews,
      qualityActions,
      dataImports,
      files,
    ] = await Promise.all([
      safeMethod("procurement.get_dashboard", base, {}),
      safeMethod("projects.get_dashboard", base, {}),
      safeMethod("quality.get_dashboard", base, {}),
      safeMethod("data_management.get_dashboard", base, {}),
      safeMethod("accounting.get_dashboard", base, {}),
      list("Supplier", ["name", "supplier_name", "supplier_group", "country", "disabled", "modified"]),
      list("Material Request", ["name", "material_request_type", "schedule_date", "status", "docstatus", "modified"]),
      list("Request for Quotation", ["name", "transaction_date", "status", "docstatus", "modified"]),
      list("Supplier Quotation", ["name", "supplier", "supplier_name", "transaction_date", "grand_total", "status", "docstatus", "modified"]),
      list("Purchase Order", ["name", "supplier", "supplier_name", "transaction_date", "schedule_date", "grand_total", "status", "docstatus", "modified"]),
      list("Purchase Receipt", ["name", "supplier", "supplier_name", "posting_date", "status", "docstatus", "modified"]),
      list("Purchase Invoice", ["name", "supplier", "supplier_name", "posting_date", "grand_total", "outstanding_amount", "status", "docstatus", "modified"]),
      list("Payment Entry", ["name", "party_type", "party", "posting_date", "paid_amount", "payment_type", "status", "docstatus", "modified"]),
      list("Project", ["name", "project_name", "customer", "status", "percent_complete", "expected_end_date", "total_costing_amount", "total_billable_amount", "total_billed_amount", "modified"]),
      list("Task", ["name", "subject", "project", "status", "priority", "exp_start_date", "exp_end_date", "progress", "modified"]),
      list("Timesheet", ["name", "employee", "employee_name", "start_date", "end_date", "total_hours", "total_billable_amount", "total_costing_amount", "status", "docstatus", "modified"]),
      list("Expense Claim", ["name", "employee", "employee_name", "posting_date", "total_claimed_amount", "total_sanctioned_amount", "approval_status", "status", "docstatus", "modified"]),
      list("Quality Goal", ["name", "goal", "status", "modified"]),
      list("Quality Inspection", ["name", "inspection_type", "reference_type", "reference_name", "item_code", "sample_size", "status", "docstatus", "modified"]),
      listAny("Non Conformance", [["name", "subject", "procedure", "supplier", "status", "modified"], ["name", "subject", "status", "modified"]]),
      listAny("Supplier Scorecard", [["name", "supplier", "status", "modified"], ["name", "supplier", "modified"]]),
      listAny("Quality Meeting", [["name", "meeting_date", "status", "modified"], ["name", "modified"]]),
      listAny("Quality Review", [["name", "reviewed_by", "status", "modified"], ["name", "modified"]]),
      listAny("Quality Action", [["name", "subject", "action", "type", "status", "modified"], ["name", "subject", "status", "modified"], ["name", "status", "modified"]]),
      listAny("Data Import", [["name", "reference_doctype", "import_type", "status", "percent_complete", "modified"], ["name", "reference_doctype", "import_type", "modified"]]),
      listAny("File", [["name", "file_name", "file_url", "attached_to_doctype", "attached_to_name", "is_private", "modified"], ["name", "file_name", "file_url", "modified"]]),
    ]);

    const procurement = {
      suppliers,
      material_requests: materialRequests,
      rfqs,
      supplier_quotations: supplierQuotes,
      purchase_orders: purchaseOrders,
      receipts,
      purchase_invoices: purchaseInvoices,
      supplier_payments: supplierPayments,
    };
    const projects = {
      projects: projectRows,
      tasks: taskRows,
      timesheets,
      expenses,
      profitability: {
        projects: projectRows.map((p) => ({
          project: p.project_name || p.name,
          customer: p.customer,
          billed: Number(p.total_billed_amount || 0),
          billable: Number(p.total_billable_amount || 0),
          cost: Number(p.total_costing_amount || 0),
          profit: Number(p.total_billed_amount || 0) - Number(p.total_costing_amount || 0),
        })),
        totals: {
          billable: moneyTotal(projectRows, "total_billable_amount") || moneyTotal(timesheets, "total_billable_amount"),
          costing: moneyTotal(projectRows, "total_costing_amount") || moneyTotal(timesheets, "total_costing_amount") + moneyTotal(expenses, "total_sanctioned_amount"),
          billed: moneyTotal(projectRows, "total_billed_amount"),
        },
      },
    };
    const quality = {
      goals: qualityGoals,
      inspections,
      non_conformances: nonConformances,
      supplier_quality: supplierQuality,
      meetings: qualityMeetings,
      reviews: qualityReviews,
      actions: qualityActions,
    };

    return NextResponse.json({
      success: true,
      data: {
        dashboards: {
          procurement: Object.keys(procurementDashboard as Any).length ? procurementDashboard : { cards: { suppliers: suppliers.length, material_requests: materialRequests.length, purchase_orders: purchaseOrders.length, purchase_invoices: purchaseInvoices.length } },
          projects: Object.keys(projectsDashboard as Any).length ? projectsDashboard : { cards: { active_projects: projectRows.length, open_tasks: taskRows.length, timesheets: timesheets.length, expenses: expenses.length } },
          quality: Object.keys(qualityDashboard as Any).length ? qualityDashboard : { cards: { inspections: inspections.length, non_conformances: nonConformances.length, actions: qualityActions.length, supplier_quality: supplierQuality.length } },
          data: Object.keys(dataDashboard as Any).length ? dataDashboard : { cards: { imports: dataImports.length, files: files.length } },
          finance: financeDashboard,
        },
        procurement,
        projects,
        quality,
        data_management: { imports: dataImports, files },
      },
    });
  } catch (error: unknown) {
    return safeJsonError(error, "Could not load operations workspace.");
  }
}
