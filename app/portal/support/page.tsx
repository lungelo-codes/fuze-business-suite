import ModernModuleDashboard from "@/components/modules/ModernModuleDashboard";
import { erpList } from "@/lib/server/erpnext";

type Row = Record<string, unknown>;
async function safeList(doctype: string, fields: string[]): Promise<Row[]> { try { return await erpList<Row>(doctype, { fields, limit: 100, orderBy: "modified desc" }); } catch { return []; } }

export default async function SupportPage() {
  // Try Frappe Helpdesk HD Ticket first, fall back to ERPNext Issue
  const [hdTickets, issues, comms] = await Promise.all([
    safeList("HD Ticket", ["name", "subject", "status", "priority", "customer", "raised_by", "agent_assigned", "sla", "response_by", "resolution_by", "creation", "modified"]),
    safeList("Issue", ["name", "subject", "customer", "status", "priority", "raised_by", "modified"]),
    safeList("Communication", ["name", "subject", "sender", "communication_type", "status", "modified"]),
  ]);

  // Use HD Tickets if Frappe Helpdesk is installed, otherwise fall back to Issues
  const tickets = hdTickets.length ? hdTickets : issues;
  const rows = [...tickets, ...comms];
  const urgent = tickets.filter((r) => ["Urgent", "High"].includes(String(r.priority || "")));
  const resolved = tickets.filter((r) => ["Resolved", "Closed"].includes(String(r.status || "")));

  return (
    <ModernModuleDashboard
      title="Support Desk"
      eyebrow="Service Workspace"
      description={hdTickets.length
        ? "Frappe Helpdesk is active — tickets, SLAs and agent assignments are live."
        : "Manage customer issues via ERPNext. Install Frappe Helpdesk for SLA tracking and agent assignment."}
      rows={rows}
      tabs={["Support Dashboard", "Tickets", "SLA", "Knowledge Base", "Customer Issues"]}
      metrics={[
        { label: "Tickets", value: tickets.length, hint: hdTickets.length ? "Frappe Helpdesk" : "Issue records" },
        { label: "Messages", value: comms.length, hint: "Communication logs" },
        { label: "Urgent", value: urgent.length, hint: "Priority cases" },
        { label: "Resolved", value: resolved.length, hint: "Completed tickets" },
      ]}
      actions={[
        { label: "New Ticket", href: "/portal/helpdesk", description: "Log a customer issue" },
        { label: "Open Chat", href: "/portal/chat", description: "Discuss with team" },
        { label: "Create Task", href: "/portal/tasks", description: "Assign support work" },
      ]}
      primaryField="subject"
      secondaryField="customer"
      statusField="status"
      mode="support"
    />
  );
}

