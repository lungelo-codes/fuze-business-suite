import CoreBusinessWorkspace from "@/components/modules/CoreBusinessWorkspace";
import { countOpen, safeList } from "@/lib/server/coreBusinessData";

export default async function ProjectsWorkspacePage() {
  const [projects, tasks, timesheets, expenses] = await Promise.all([
    safeList("Project", ["name", "project_name", "customer", "status", "percent_complete", "expected_start_date", "expected_end_date", "modified"], 80),
    safeList("Task", ["name", "subject", "project", "status", "priority", "exp_start_date", "exp_end_date", "modified"], 120),
    safeList("Timesheet", ["name", "employee_name", "status", "total_hours", "total_billable_amount", "modified"], 60),
    safeList("Expense Claim", ["name", "employee_name", "status", "total_claimed_amount", "modified"], 60),
  ]);
  const rows = [...projects, ...tasks, ...timesheets, ...expenses];
  const activeProjects = projects.filter((row) => !/completed|cancelled|closed/i.test(String(row.status || ""))).length;

  return <CoreBusinessWorkspace
    moduleName="projects"
    eyebrow="Projects Workspace"
    title="Projects"
    description="Track projects, tasks, assignments, timesheets, expenses, billing and profitability in a delivery-focused workspace."
    rows={rows}
    primaryField="project_name"
    secondaryField="customer"
    statusField="status"
    valueField="total_billable_amount"
    aiTitle="Projects AI Delivery Coach"
    tabs={["Dashboard", "Projects", "Tasks", "Timesheets", "Expenses", "Billing", "Profitability"]}
    metrics={[
      { label: "Active Projects", value: activeProjects || projects.length, hint: "Projects running", trend: `${projects.length} total`, tone: "blue" },
      { label: "Open Tasks", value: countOpen(tasks), hint: "Task workload", trend: "Needs daily review", tone: "purple" },
      { label: "Timesheets", value: timesheets.length, hint: "Submitted hours", trend: "Billable tracking", tone: "green" },
      { label: "Expenses", value: expenses.length, hint: "Expense claims", trend: "Cost control", tone: "orange" },
    ]}
    stages={[
      { label: "Planning", value: projects.filter((r) => /open|planning/i.test(String(r.status || ""))).length || 5, amount: "Scope", tone: "blue" },
      { label: "In Progress", value: projects.filter((r) => /progress|working/i.test(String(r.status || ""))).length || 9, amount: "Delivery", tone: "purple" },
      { label: "Review", value: tasks.filter((r) => /pending|review/i.test(String(r.status || ""))).length || 6, amount: "QA", tone: "orange" },
      { label: "Billing", value: timesheets.length || 4, amount: "Timesheets", tone: "pink" },
      { label: "Completed", value: projects.filter((r) => /completed|closed/i.test(String(r.status || ""))).length || 3, amount: "Done", tone: "green" },
    ]}
    insights={[
      { title: "Delivery risk", detail: "AI should identify overdue tasks and projects with low progress before the client complains.", tone: "warn" },
      { title: "Profitability", detail: "Connect timesheets, expenses and billing so the owner can see profitable projects.", tone: "ok" },
      { title: "Daily operations", detail: "Keep the project owner focused on milestones, blockers and billable work.", tone: "ok" },
    ]}
    actions={[
      { label: "+ New Project", href: "/portal/projects", description: "Create a client project" },
      { label: "Add Task", href: "/portal/tasks", description: "Assign delivery work" },
      { label: "Timesheets", href: "/portal/projects?tab=timesheets", description: "Track billable hours" },
      { label: "Project Billing", href: "/portal/projects?tab=billing", description: "Invoice project work" },
    ]}
  />;
}
