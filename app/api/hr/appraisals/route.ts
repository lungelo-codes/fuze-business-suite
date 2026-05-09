import { erpList, erpCreate, erpPatch } from "@/lib/server/erpnext";

export async function GET() {
  try {
    const [appraisals, jobOpenings, jobApplicants, expenseClaims, shiftAssignments] = await Promise.all([
      erpList<Record<string, unknown>>("Appraisal", {
        fields: ["name", "employee_name", "appraisal_template", "status", "start_date", "end_date", "total_score", "modified"],
        limit: 100,
        orderBy: "modified desc",
      }).catch(() => []),
      erpList<Record<string, unknown>>("Job Opening", {
        fields: ["name", "job_title", "department", "designation", "status", "no_of_positions", "modified"],
        limit: 50,
        orderBy: "modified desc",
      }).catch(() => []),
      erpList<Record<string, unknown>>("Job Applicant", {
        fields: ["name", "applicant_name", "job_title", "status", "email_id", "modified"],
        limit: 100,
        orderBy: "modified desc",
      }).catch(() => []),
      erpList<Record<string, unknown>>("Expense Claim", {
        fields: ["name", "employee_name", "total_claimed_amount", "total_sanctioned_amount", "status", "posting_date", "modified"],
        limit: 100,
        orderBy: "modified desc",
      }).catch(() => []),
      erpList<Record<string, unknown>>("Shift Assignment", {
        fields: ["name", "employee", "employee_name", "shift_type", "start_date", "end_date", "status", "modified"],
        limit: 100,
        orderBy: "start_date desc",
      }).catch(() => []),
    ]);

    return Response.json({
      success: true,
      data: { appraisals, jobOpenings, jobApplicants, expenseClaims, shiftAssignments },
    });
  } catch (error) {
    return Response.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch HR data" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const { doctype } = body;

    const allowed = ["Job Opening", "Job Applicant", "Expense Claim", "Appraisal"];
    if (!doctype || !allowed.includes(String(doctype))) {
      return Response.json({ success: false, error: `doctype must be one of: ${allowed.join(", ")}` }, { status: 400 });
    }

    const { doctype: _dt, ...fields } = body;
    const created = await erpCreate(String(doctype), fields as Record<string, unknown>);
    return Response.json({ success: true, data: created });
  } catch (error) {
    return Response.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to create HR record" },
      { status: 500 }
    );
  }
}
