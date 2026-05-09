import { erpList } from "@/lib/server/erpnext";

interface ProjectsData {
  projects: Record<string, unknown>[];
  tasks: Record<string, unknown>[];
  timesheets: Record<string, unknown>[];
}

export async function GET(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const projectId = url.searchParams.get("project");

    const filters = projectId ? [["Task", "project", "=", projectId]] : [];

    const [projects, tasks, timesheets] = await Promise.all([
      erpList<Record<string, unknown>>("Project", {
        fields: ["name", "project_name", "customer", "status", "expected_start_date", "expected_end_date", "percent_complete", "modified"],
        limit: 50,
        orderBy: "modified desc"
      }).catch((): Record<string, unknown>[] => []),
      erpList<Record<string, unknown>>("Task", {
        fields: ["name", "subject", "project", "status", "priority", "exp_start_date", "exp_end_date", "modified"],
        filters,
        limit: 100,
        orderBy: "exp_start_date asc"
      }).catch((): Record<string, unknown>[] => []),
      erpList<Record<string, unknown>>("Timesheet", {
        fields: ["name", "employee", "employee_name", "project", "total_hours", "status", "modified"],
        limit: 50,
        orderBy: "modified desc"
      }).catch((): Record<string, unknown>[] => [])
    ]);

    const data: ProjectsData = {
      projects,
      tasks,
      timesheets
    };

    return Response.json({ success: true, data });
  } catch (error) {
    return Response.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch projects data" },
      { status: 500 }
    );
  }
}
