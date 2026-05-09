import ModernModuleDashboard from "@/components/modules/ModernModuleDashboard";
import { fuzeData, rowsFrom } from "@/lib/server/fuzeApi";

type Row = Record<string, unknown>;

export default async function HelpdeskPage() {
  const [dashboard, ticketsData] = await Promise.all([
    fuzeData<Row>("fuze_suite.api.helpdesk.get_dashboard", {}, {}),
    fuzeData<Row>("fuze_suite.api.helpdesk.get_tickets", {}, {}),
  ]);

  const cards = (dashboard.cards || {}) as Row;
  const tickets = rowsFrom(ticketsData, ["tickets", "issues", "rows", "data"]);

  return (
    <ModernModuleDashboard
      title="Helpdesk"
      eyebrow="Service Workspace"
      description="Customer support tickets are now returned through the simplified Fuze Helpdesk API."
      rows={tickets}
      tabs={["Helpdesk Dashboard", "Tickets", "Open", "Closed", "SLA"]}
      metrics={[
        { label: "Open", value: Number(cards.open || 0), hint: "Needs attention" },
        { label: "Closed", value: Number(cards.closed || 0), hint: "Resolved tickets" },
        { label: "High Priority", value: Number(cards.high_priority || 0), hint: "Urgent issues" },
        { label: "Tickets", value: tickets.length, hint: "Loaded records" },
      ]}
      actions={[
        { label: "New Ticket", href: "/portal/support", description: "Log a customer issue" },
        { label: "Open Tickets", href: "/portal/support", description: "Review open tickets" },
        { label: "Team Chat", href: "/portal/chat", description: "Discuss internally" },
      ]}
      primaryField="subject"
      secondaryField="customer"
      statusField="status"
      mode="support"
    />
  );
}
