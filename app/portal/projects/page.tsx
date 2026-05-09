import ModernModuleDashboard from "@/components/modules/ModernModuleDashboard";
import { fuzeData, rowsFrom } from "@/lib/server/fuzeApi";

type Row = Record<string, unknown>;

export default async function ProjectsPage() {
  const [dashboard, projectsData, tasksData] = await Promise.all([
    fuzeData<Row>("fuze_suite.api.projects.get_dashboard", {}, {}),
    fuzeData<Row>("fuze_suite.api.projects.get_projects", {}, {}),
    fuzeData<Row>("fuze_suite.api.projects.get_tasks", {}, {}),
  ]);

  const cards = (dashboard.cards || {}) as Row;
  const projects = rowsFrom(projectsData, ["projects", "rows", "data"]);
  const tasks = rowsFrom(tasksData, ["tasks", "rows", "data"]);

  return (
    <ModernModuleDashboard
      title="Projects & Tasks"
      eyebrow="Operations Workspace"
      description="Projects and tasks are now controlled by the Fuze project API, giving the SaaS UI only the fields it needs."
      rows={[...projects, ...tasks]}
      tabs={["Project Dashboard", "Projects", "Tasks", "Milestones", "Calendar"]}
      metrics={[
        { label: "Projects", value: Number(cards.projects || projects.length), hint: "Active projects" },
        { label: "Open Tasks", value: Number(cards.open_tasks || 0), hint: "Needs action" },
        { label: "Completed", value: Number(cards.completed_tasks || 0), hint: "Done work" },
        { label: "Overdue", value: Number(cards.overdue_tasks || 0), hint: "Past due" },
      ]}
      actions={[
        { label: "Create Project", href: "/portal/projects", description: "Start a new project" },
        { label: "Create Task", href: "/portal/tasks", description: "Assign work" },
        { label: "View Tasks", href: "/portal/tasks", description: "Track delivery" },
        { label: "Invoice Work", href: "/portal/invoices", description: "Bill completed work" },
      ]}
      primaryField="project_name"
      secondaryField="customer"
      statusField="status"
      valueField="percent_complete"
      mode="projects"
    />
  );
}
