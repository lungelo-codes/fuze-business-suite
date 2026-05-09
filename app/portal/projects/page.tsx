import ModernModuleDashboard from "@/components/modules/ModernModuleDashboard";
import { erpList } from "@/lib/server/erpnext";

type Row = Record<string, unknown>;
async function safeList(doctype: string, fields: string[]): Promise<Row[]> {
  try { return await erpList<Row>(doctype, { fields, limit: 100, orderBy: "modified desc" }); } catch { return []; }
}

export default async function ProjectsPage() {
  const [projects, tasks, timesheets] = await Promise.all([
    safeList("Project", ["name", "project_name", "status", "customer", "percent_complete", "expected_start_date", "expected_end_date", "priority", "total_billable_amount", "modified"]),
    safeList("Task", ["name", "subject", "project", "status", "priority", "exp_start_date", "exp_end_date", "progress", "modified"]),
    safeList("Timesheet", ["name", "employee", "employee_name", "total_hours", "total_billable_amount", "status", "modified"]),
  ]);

  const totalBillable = projects.reduce((sum, p) => sum + Number(p.total_billable_amount || 0), 0);
  const openTasks = tasks.filter((t) => ["Open", "Working", "Overdue"].includes(String(t.status || "")));
  const rows = [...projects, ...tasks];

  return (
    <ModernModuleDashboard
      title="Projects & Tasks"
      eyebrow="Operations Workspace"
      description="Track projects, tasks, timesheets and milestones. Billable hours feed directly into ERPNext Sales Invoices."
      rows={rows}
      tabs={["Project Dashboard", "Projects", "Tasks", "Timesheets", "Calendar"]}
      metrics={[
        { label: "Projects", value: projects.length, hint: "Project records" },
        { label: "Open Tasks", value: openTasks.length, hint: "Tasks needing action" },
        { label: "Billable", value: `R${totalBillable.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}`, hint: "Uninvoiced project value" },
        { label: "Timesheets", value: timesheets.length, hint: "Hours logged" },
      ]}
      actions={[
        { label: "Create Project", href: "/portal/projects", description: "New customer project" },
        { label: "Create Task", href: "/portal/tasks", description: "Assign work to a project" },
        { label: "Log Time", href: "/portal/tasks", description: "Record timesheet hours" },
        { label: "Invoice Project", href: "/portal/invoices", description: "Bill for completed work" },
      ]}
      primaryField="project_name"
      secondaryField="customer"
      statusField="status"
      valueField="total_billable_amount"
      mode="projects"
    />
  );
}

