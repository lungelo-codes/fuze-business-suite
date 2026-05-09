import { fuzeData } from "@/lib/server/fuzeApi";

type Row = Record<string, unknown>;

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const project = url.searchParams.get("project") || undefined;
  const [dashboard, projects, tasks] = await Promise.all([
    fuzeData<Row>("fuze_suite.api.projects.get_dashboard", {}, {}),
    fuzeData<Row>("fuze_suite.api.projects.get_projects", {}, {}),
    fuzeData<Row>("fuze_suite.api.projects.get_tasks", project ? { project } : {}, {}),
  ]);
  return Response.json({ success: true, data: { dashboard, projects, tasks } });
}
