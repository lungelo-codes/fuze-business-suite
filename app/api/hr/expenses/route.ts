import { erpList, erpCreate, erpPatch } from "@/lib/server/erpnext";

export async function GET() {
  try {
    const [expenseClaims, travelRequests, employeeAdvances, loans] = await Promise.all([
      erpList<Record<string, unknown>>("Expense Claim", {
        fields: [
          "name", "employee", "employee_name", "expense_approver",
          "posting_date", "total_claimed_amount", "total_sanctioned_amount",
          "status", "approval_status", "docstatus", "modified",
        ],
        limit: 200,
        orderBy: "posting_date desc",
      }).catch(() => []),
      erpList<Record<string, unknown>>("Travel Request", {
        fields: ["name", "employee", "employee_name", "travel_type", "departure_date", "arrival_date", "purpose_of_travel", "status", "modified"],
        limit: 100,
        orderBy: "departure_date desc",
      }).catch(() => []),
      erpList<Record<string, unknown>>("Employee Advance", {
        fields: ["name", "employee", "employee_name", "purpose", "advance_amount", "paid_amount", "return_amount", "status", "docstatus", "modified"],
        limit: 100,
        orderBy: "modified desc",
      }).catch(() => []),
      erpList<Record<string, unknown>>("Employee Loan", {
        fields: ["name", "employee", "employee_name", "loan_type", "loan_amount", "total_payment", "total_principal_paid", "status", "modified"],
        limit: 50,
        orderBy: "modified desc",
      }).catch(() => []),
    ]);

    const totalClaimed = expenseClaims.reduce((s, e) => s + Number(e.total_claimed_amount || 0), 0);
    const totalApproved = expenseClaims.reduce((s, e) => s + Number(e.total_sanctioned_amount || 0), 0);
    const pendingApproval = expenseClaims.filter((e) =>
      ["Draft", "Submitted"].includes(String(e.approval_status || e.status || ""))
    ).length;

    return Response.json({
      success: true,
      data: { expenseClaims, travelRequests, employeeAdvances, loans },
      summary: {
        totalClaimed,
        totalApproved,
        pendingApproval,
        openAdvances: employeeAdvances.filter((a) => a.status !== "Claimed").length,
        activeLoans: loans.filter((l) => l.status === "Open").length,
      },
    });
  } catch (error) {
    return Response.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch expense data" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const { doctype, ...fields } = body;

    const allowed = ["Expense Claim", "Travel Request", "Employee Advance", "Employee Loan"];
    if (!doctype || !allowed.includes(String(doctype))) {
      return Response.json({ success: false, error: `doctype must be one of: ${allowed.join(", ")}` }, { status: 400 });
    }

    const created = await erpCreate(String(doctype), fields as Record<string, unknown>);
    return Response.json({ success: true, data: created });
  } catch (error) {
    return Response.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to create expense record" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const { name, doctype = "Expense Claim", ...updates } = await request.json() as Record<string, unknown>;
    if (!name) return Response.json({ success: false, error: "name is required" }, { status: 400 });

    await erpPatch(String(doctype), String(name), updates as Record<string, unknown>);
    return Response.json({ success: true, message: "Record updated" });
  } catch (error) {
    return Response.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to update record" },
      { status: 500 }
    );
  }
}
