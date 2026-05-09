import ModernModuleDashboard from "@/components/modules/ModernModuleDashboard";
import { erpList } from "@/lib/server/erpnext";

type Row = Record<string, unknown>;
async function safeList(doctype: string, fields: string[]): Promise<Row[]> {
  try { return await erpList<Row>(doctype, { fields, limit: 100, orderBy: "modified desc" }); } catch { return []; }
}

export default async function HelpdeskPage() {
  const [tickets, teams, sla] = await Promise.all([
    safeList("HD Ticket", ["name", "subject", "status", "priority", "customer", "raised_by", "agent_assigned", "sla", "response_by", "resolution_by", "creation", "modified"]),
    safeList("HD Team", ["name", "team_name", "modified"]),
    safeList("HD Service Level Agreement", ["name", "sla_name", "modified"]),
  ]);

  const open = tickets.filter((t) => ["Open", "Replied"].includes(String(t.status || "")));
  const resolved = tickets.filter((t) => ["Resolved", "Closed"].includes(String(t.status || "")));
  const overdue = tickets.filter((t) => {
    if (!t.resolution_by) return false;
    return new Date(String(t.resolution_by)) < new Date();
  });

  return (
    <ModernModuleDashboard
      title="Helpdesk"
      eyebrow="Service Workspace"
      description="Manage customer support tickets with SLA tracking, agent assignment, and escalation — powered by Frappe Helpdesk. No per-agent pricing."
      rows={tickets}
      tabs={["Helpdesk Dashboard", "All Tickets", "Open", "Resolved", "SLA", "Teams"]}
      metrics={[
        { label: "Total Tickets", value: tickets.length, hint: "HD Ticket records" },
        { label: "Open", value: open.length, hint: "Awaiting resolution" },
        { label: "Resolved", value: resolved.length, hint: "Closed tickets" },
        { label: "Overdue", value: overdue.length, hint: "Past SLA deadline" },
      ]}
      actions={[
        { label: "New Ticket", href: "/portal/support", description: "Log a customer issue" },
        { label: "View Open Tickets", href: "/portal/support", description: "Review and action open tickets" },
        { label: "SLA Rules", href: "/portal/helpdesk", description: "Review service level agreements" },
        { label: "Team Chat", href: "/portal/chat", description: "Discuss with your team" },
      ]}
      primaryField="subject"
      secondaryField="customer"
      statusField="status"
      mode="support"
    />
  );
}
