import ModernModuleDashboard from "@/components/modules/ModernModuleDashboard";
import { erpList } from "@/lib/server/erpnext";

type Row = Record<string, unknown>;
async function safeList(doctype: string, fields: string[]): Promise<Row[]> { try { return await erpList<Row>(doctype, { fields, limit: 100, orderBy: "modified desc" }); } catch { return []; } }

export default async function ProjectsPage() {
  const [projects, tasks] = await Promise.all([
    safeList("Project", ["name", "project_name", "status", "customer", "percent_complete", "expected_end_date", "modified"]),
    safeList("Task", ["name", "subject", "project", "status", "priority", "exp_end_date", "modified"]),
  ]);
  const rows = [...projects, ...tasks];
  return <ModernModuleDashboard
    title="Projects & Tasks"
    eyebrow="Operations Workspace"
    description="Track projects, tasks, appointments and delivery work in one modern operations board."
    rows={rows}
    tabs={["Project Dashboard", "Projects", "Tasks", "Appointments", "Calendar"]}
    metrics={[{ label: "Projects", value: projects.length, hint: "Project records" }, { label: "Tasks", value: tasks.length, hint: "Task records" }, { label: "Open Work", value: rows.filter((r) => String(r.status || '').toLowerCase().includes('open')).length, hint: "Needs action" }, { label: "Progress", value: "Live", hint: "Tracked from ERPNext" }]}
    actions={[{ label: "Create Project", href: "/portal/projects", description: "Open project records" }, { label: "Create Task", href: "/portal/tasks", description: "Assign work" }, { label: "Book Appointment", href: "/portal/appointments", description: "Schedule customer work" }]}
    primaryField="project_name"
    secondaryField="customer"
    statusField="status"
    valueField="percent_complete"
    mode="projects"
  />;
}
