import ModernModuleDashboard from "@/components/modules/ModernModuleDashboard";
import { erpList } from "@/lib/server/erpnext";

type Row = Record<string, unknown>;
async function safeList(doctype: string, fields: string[]): Promise<Row[]> {
  try { return await erpList<Row>(doctype, { fields, limit: 100, orderBy: "modified desc" }); } catch { return []; }
}

export default async function RecruitmentPage() {
  const [jobOpenings, jobApplicants, jobOffers, interviews] = await Promise.all([
    safeList("Job Opening", ["name", "job_title", "department", "designation", "status", "no_of_positions", "modified"]),
    safeList("Job Applicant", ["name", "applicant_name", "job_title", "status", "email_id", "source", "modified"]),
    safeList("Job Offer", ["name", "applicant_name", "designation", "offer_date", "status", "modified"]),
    safeList("Interview", ["name", "job_applicant", "status", "scheduled_on", "interviewer", "modified"]),
  ]);

  const openJobs = jobOpenings.filter((j) => j.status === "Open");
  const accepted = jobApplicants.filter((a) => a.status === "Accepted");
  const rows = [...jobOpenings, ...jobApplicants];

  return (
    <ModernModuleDashboard
      title="Recruitment"
      eyebrow="People Workspace"
      description="Plan vacancies, publish job openings, manage applicants through the interview pipeline and extend offers — powered by Frappe HR."
      rows={rows}
      tabs={["Recruitment Dashboard", "Job Openings", "Applicants", "Interviews", "Offers"]}
      metrics={[
        { label: "Open Positions", value: openJobs.length, hint: `${jobOpenings.length} total openings` },
        { label: "Applicants", value: jobApplicants.length, hint: "In pipeline" },
        { label: "Interviews", value: interviews.length, hint: "Scheduled / completed" },
        { label: "Offers Extended", value: jobOffers.length, hint: `${accepted.length} accepted` },
      ]}
      actions={[
        { label: "Post Job Opening", href: "/portal/job-openings", description: "Create a new vacancy" },
        { label: "View Applicants", href: "/portal/job-applicants", description: "Review the applicant pipeline" },
        { label: "Schedule Interview", href: "/portal/appointments", description: "Book candidate interviews" },
        { label: "All Employees", href: "/portal/employees", description: "View current team" },
      ]}
      primaryField="job_title"
      secondaryField="department"
      statusField="status"
      mode="standard"
    />
  );
}
