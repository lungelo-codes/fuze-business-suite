import { erpList, erpCreate } from "@/lib/server/erpnext";

export async function GET() {
  try {
    const [onboarding, transfers, separations, exitInterviews, promotions] = await Promise.all([
      erpList<Record<string, unknown>>("Employee Onboarding", {
        fields: ["name", "employee", "employee_name", "status", "onboarding_date", "completion_date", "modified"],
        limit: 100,
        orderBy: "modified desc",
      }).catch(() => []),
      erpList<Record<string, unknown>>("Employee Transfer", {
        fields: ["name", "employee", "employee_name", "transfer_date", "new_department", "new_designation", "modified"],
        limit: 100,
        orderBy: "transfer_date desc",
      }).catch(() => []),
      erpList<Record<string, unknown>>("Employee Separation", {
        fields: ["name", "employee", "employee_name", "status", "separation_date", "relieving_date", "modified"],
        limit: 50,
        orderBy: "modified desc",
      }).catch(() => []),
      erpList<Record<string, unknown>>("Exit Interview", {
        fields: ["name", "employee", "employee_name", "date", "reason", "relieving_date", "status", "modified"],
        limit: 50,
        orderBy: "date desc",
      }).catch(() => []),
      erpList<Record<string, unknown>>("Employee Promotion", {
        fields: ["name", "employee", "employee_name", "promotion_date", "modified"],
        limit: 50,
        orderBy: "promotion_date desc",
      }).catch(() => []),
    ]);

    const pendingOnboarding = onboarding.filter((o) =>
      ["Pending", "In Progress"].includes(String(o.status || ""))
    ).length;

    return Response.json({
      success: true,
      data: { onboarding, transfers, separations, exitInterviews, promotions },
      summary: {
        pendingOnboarding,
        totalTransfers: transfers.length,
        pendingSeparations: separations.filter((s) => s.status !== "Completed").length,
        pendingExitInterviews: exitInterviews.filter((e) => e.status !== "Completed").length,
      },
    });
  } catch (error) {
    return Response.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch lifecycle data" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const { doctype, ...fields } = body;

    const allowed = [
      "Employee Onboarding",
      "Employee Transfer",
      "Employee Separation",
      "Exit Interview",
      "Employee Promotion",
    ];
    if (!doctype || !allowed.includes(String(doctype))) {
      return Response.json({ success: false, error: `doctype must be one of: ${allowed.join(", ")}` }, { status: 400 });
    }

    const created = await erpCreate(String(doctype), fields as Record<string, unknown>);
    return Response.json({ success: true, data: created });
  } catch (error) {
    return Response.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to create lifecycle record" },
      { status: 500 }
    );
  }
}
