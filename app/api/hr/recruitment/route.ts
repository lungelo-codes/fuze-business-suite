import { erpList, erpCreate, erpPatch } from "@/lib/server/erpnext";

export async function GET() {
  try {
    const [jobOpenings, jobApplicants, jobOffers, interviews] = await Promise.all([
      erpList<Record<string, unknown>>("Job Opening", {
        fields: ["name", "job_title", "department", "designation", "status", "no_of_positions", "publish", "expected_compensation", "modified"],
        limit: 100,
        orderBy: "modified desc",
      }).catch(() => []),
      erpList<Record<string, unknown>>("Job Applicant", {
        fields: ["name", "applicant_name", "job_title", "status", "email_id", "mobile_no", "source", "resume_attachment", "modified"],
        limit: 200,
        orderBy: "modified desc",
      }).catch(() => []),
      erpList<Record<string, unknown>>("Job Offer", {
        fields: ["name", "job_applicant", "applicant_name", "designation", "offer_date", "status", "modified"],
        limit: 50,
        orderBy: "modified desc",
      }).catch(() => []),
      erpList<Record<string, unknown>>("Interview", {
        fields: ["name", "job_applicant", "status", "interview_round", "scheduled_on", "interviewer", "modified"],
        limit: 100,
        orderBy: "scheduled_on desc",
      }).catch(() => []),
    ]);

    const openJobs = jobOpenings.filter((j) => j.status === "Open");
    const pipelineByStage = {
      Open: jobApplicants.filter((a) => a.status === "Open").length,
      Replied: jobApplicants.filter((a) => a.status === "Replied").length,
      Hold: jobApplicants.filter((a) => a.status === "Hold").length,
      Accepted: jobApplicants.filter((a) => a.status === "Accepted").length,
      Rejected: jobApplicants.filter((a) => a.status === "Rejected").length,
    };

    return Response.json({
      success: true,
      data: { jobOpenings, jobApplicants, jobOffers, interviews },
      summary: {
        openJobs: openJobs.length,
        totalApplicants: jobApplicants.length,
        offersExtended: jobOffers.length,
        pipelineByStage,
      },
    });
  } catch (error) {
    return Response.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch recruitment data" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const { doctype, ...fields } = body;

    const allowed = ["Job Opening", "Job Applicant", "Job Offer", "Interview"];
    if (!doctype || !allowed.includes(String(doctype))) {
      return Response.json({ success: false, error: `doctype must be one of: ${allowed.join(", ")}` }, { status: 400 });
    }

    const created = await erpCreate(String(doctype), fields as Record<string, unknown>);
    return Response.json({ success: true, data: created });
  } catch (error) {
    return Response.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to create recruitment record" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const { name, doctype = "Job Applicant", ...updates } = await request.json() as Record<string, unknown>;
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
