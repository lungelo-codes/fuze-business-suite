import ModernModuleDashboard from "@/components/modules/ModernModuleDashboard";
import { erpList } from "@/lib/server/erpnext";

type Row = Record<string, unknown>;
async function safeList(doctype: string, fields: string[]): Promise<Row[]> { try { return await erpList<Row>(doctype, { fields, limit: 100, orderBy: "modified desc" }); } catch { return []; } }

export default async function SupportPage() {
  const [issues, comms] = await Promise.all([
    safeList("Issue", ["name", "subject", "customer", "status", "priority", "raised_by", "modified"]),
    safeList("Communication", ["name", "subject", "sender", "communication_type", "status", "modified"]),
  ]);
  const rows = [...issues, ...comms];
  return <ModernModuleDashboard
    title="Support Desk"
    eyebrow="Service Workspace"
    description="Manage customer issues, communication, SLA risk and knowledge base tasks from a clear support dashboard."
    rows={rows}
    tabs={["Support Dashboard", "Tickets", "SLA", "Knowledge Base", "Customer Issues"]}
    metrics={[{ label: "Tickets", value: issues.length, hint: "Issue records" }, { label: "Messages", value: comms.length, hint: "Communication logs" }, { label: "Urgent", value: issues.filter((r) => String(r.priority || '').toLowerCase().includes('urgent')).length, hint: "Priority cases" }, { label: "Resolved", value: issues.filter((r) => String(r.status || '').toLowerCase().includes('resolved')).length, hint: "Completed tickets" }]}
    actions={[{ label: "Create Ticket", href: "/portal/support", description: "Log a customer issue" }, { label: "Open Chat", href: "/portal/chat", description: "Discuss with team" }, { label: "Create Task", href: "/portal/tasks", description: "Assign support work" }]}
    primaryField="subject"
    secondaryField="customer"
    statusField="status"
    mode="support"
  />;
}
