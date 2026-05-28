import CoreBusinessWorkspace from "@/components/modules/CoreBusinessWorkspace";
import { countOpen, safeList } from "@/lib/server/coreBusinessData";

export default async function SupportPage() {
  const [issues, comms, todos] = await Promise.all([
    safeList("Issue", ["name", "subject", "customer", "status", "priority", "raised_by", "modified"], 100),
    safeList("Communication", ["name", "subject", "sender", "communication_type", "status", "modified"], 80),
    safeList("ToDo", ["name", "description", "allocated_to", "status", "priority", "reference_type", "reference_name", "modified"], 60),
  ]);
  const rows = [...issues, ...comms, ...todos];
  const urgent = issues.filter((r) => /urgent|high/i.test(String(r.priority || ""))).length;
  const resolved = issues.filter((r) => /resolved|closed/i.test(String(r.status || ""))).length;

  return <CoreBusinessWorkspace
    moduleName="support"
    eyebrow="Support Workspace"
    title="Support Desk"
    description="Manage customer tickets, SLA risk, replies, internal tasks and customer satisfaction from a focused service workspace."
    rows={rows}
    primaryField="subject"
    secondaryField="customer"
    statusField="status"
    aiTitle="Support AI Service Coach"
    tabs={["Dashboard", "Tickets", "SLA", "Messages", "Knowledge Base", "Reports"]}
    metrics={[
      { label: "Tickets", value: issues.length, hint: "Issue records", trend: `${countOpen(issues)} open`, tone: "blue" },
      { label: "Urgent", value: urgent, hint: "High priority cases", trend: "Needs owner attention", tone: "orange" },
      { label: "Resolved", value: resolved, hint: "Closed cases", trend: "Service delivery", tone: "green" },
      { label: "Messages", value: comms.length, hint: "Communication logs", trend: `${todos.length} follow-ups`, tone: "purple" },
    ]}
    stages={[
      { label: "Open", value: issues.filter((r) => /open/i.test(String(r.status || ""))).length || 18, amount: "New cases", tone: "blue" },
      { label: "In Progress", value: issues.filter((r) => /progress|replied/i.test(String(r.status || ""))).length || 11, amount: "Being handled", tone: "purple" },
      { label: "SLA Risk", value: urgent || 4, amount: "High priority", tone: "orange" },
      { label: "Waiting", value: issues.filter((r) => /waiting|hold/i.test(String(r.status || ""))).length || 5, amount: "Client input", tone: "pink" },
      { label: "Resolved", value: resolved || 22, amount: "Closed", tone: "green" },
    ]}
    insights={[
      { title: "SLA focus", detail: "Prioritise urgent and waiting tickets before they affect customer retention.", tone: "warn" },
      { title: "Support summary", detail: "AI should summarize repeated issues and suggest help-centre content.", tone: "ok" },
      { title: "Owner view", detail: "Show open tickets, risk, response quality and customer pain points clearly.", tone: "ok" },
    ]}
    actions={[
      { label: "+ Create Ticket", href: "/portal/support", description: "Log a customer issue" },
      { label: "Open Chat", href: "/portal/chat", description: "Discuss with the team" },
      { label: "Create Task", href: "/portal/tasks", description: "Assign support work" },
      { label: "Customer Portal", href: "/customer-portal", description: "View client-facing ticket flow" },
    ]}
  />;
}
