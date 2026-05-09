import ModernModuleDashboard from "@/components/modules/ModernModuleDashboard";
import { fuzeData, rowsFrom } from "@/lib/server/fuzeApi";

type Row = Record<string, unknown>;

export default async function SupportPage() {
  const [dashboard, ticketsData] = await Promise.all([
    fuzeData<Row>("fuze_suite.api.helpdesk.get_dashboard", {}, {}),
    fuzeData<Row>("fuze_suite.api.helpdesk.get_tickets", {}, {}),
  ]);
  const cards = (dashboard.cards || {}) as Row;
  const tickets = rowsFrom(ticketsData, ["tickets", "issues", "rows", "data"]);
  return (
    <ModernModuleDashboard
      title="Support Desk"
      eyebrow="Service Workspace"
      description="Support is now driven by the Fuze Helpdesk API so customers only see clean ticket fields."
      rows={tickets}
      tabs={["Support Dashboard", "Tickets", "SLA", "Knowledge Base", "Customer Issues"]}
      metrics={[
        { label: "Open", value: Number(cards.open || 0), hint: "Needs attention" },
        { label: "Closed", value: Number(cards.closed || 0), hint: "Resolved" },
        { label: "High Priority", value: Number(cards.high_priority || 0), hint: "Urgent" },
        { label: "Tickets", value: tickets.length, hint: "Loaded records" },
      ]}
      actions={[{ label: "New Ticket", href: "/portal/helpdesk", description: "Log a customer issue" }, { label: "Open Chat", href: "/portal/chat", description: "Discuss with team" }, { label: "Create Task", href: "/portal/tasks", description: "Assign support work" }]}
      primaryField="subject"
      secondaryField="customer"
      statusField="status"
      mode="support"
    />
  );
}
