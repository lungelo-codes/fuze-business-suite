import { erpList, erpCreate, erpPatch } from "@/lib/server/erpnext";

export async function GET() {
  try {
    const [appraisals, appraisalTemplates, goals, kras] = await Promise.all([
      erpList<Record<string, unknown>>("Appraisal", {
        fields: [
          "name", "employee", "employee_name", "appraisal_template",
          "status", "start_date", "end_date", "total_score", "modified",
        ],
        limit: 200,
        orderBy: "modified desc",
      }).catch(() => []),
      erpList<Record<string, unknown>>("Appraisal Template", {
        fields: ["name", "introduction", "modified"],
        limit: 50,
        orderBy: "modified desc",
      }).catch(() => []),
      // Frappe HR v15+ uses Employee Performance Feedback
      erpList<Record<string, unknown>>("Employee Performance Feedback", {
        fields: ["name", "employee", "employee_name", "reviewer", "feedback_date", "total_score", "modified"],
        limit: 100,
        orderBy: "feedback_date desc",
      }).catch(() => []),
      erpList<Record<string, unknown>>("Appraisal KRA", {
        fields: ["name", "parent", "kra", "per_weightage", "score", "modified"],
        limit: 200,
        orderBy: "modified desc",
      }).catch(() => []),
    ]);

    const avgScore = appraisals.length
      ? appraisals.reduce((s, a) => s + Number(a.total_score || 0), 0) / appraisals.length
      : 0;

    const byStatus = {
      Draft: appraisals.filter((a) => a.status === "Draft").length,
      Submitted: appraisals.filter((a) => a.status === "Submitted").length,
      Completed: appraisals.filter((a) => a.status === "Completed").length,
    };

    return Response.json({
      success: true,
      data: { appraisals, appraisalTemplates, goals, kras },
      summary: {
        totalAppraisals: appraisals.length,
        avgScore: Math.round(avgScore * 10) / 10,
        byStatus,
        templatesAvailable: appraisalTemplates.length,
      },
    });
  } catch (error) {
    return Response.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch performance data" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const { doctype, ...fields } = body;

    const allowed = ["Appraisal", "Appraisal Template", "Employee Performance Feedback"];
    if (!doctype || !allowed.includes(String(doctype))) {
      return Response.json({ success: false, error: `doctype must be one of: ${allowed.join(", ")}` }, { status: 400 });
    }

    const created = await erpCreate(String(doctype), fields as Record<string, unknown>);
    return Response.json({ success: true, data: created });
  } catch (error) {
    return Response.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to create performance record" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const { name, doctype = "Appraisal", ...updates } = await request.json() as Record<string, unknown>;
    if (!name) return Response.json({ success: false, error: "name is required" }, { status: 400 });

    await erpPatch(String(doctype), String(name), updates as Record<string, unknown>);
    return Response.json({ success: true, message: "Appraisal updated" });
  } catch (error) {
    return Response.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to update appraisal" },
      { status: 500 }
    );
  }
}
