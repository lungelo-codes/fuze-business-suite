import PortalDocumentView from "@/components/customer-portal/PortalDocumentView";
import { erpMethod } from "@/lib/server/erpnext";

async function loadTicket(ticket: string) {
  if (!ticket) return { name: "New ticket", subject: "Open support ticket", status: "Open", priority: "Medium" };
  try { return await erpMethod("portal.get_customer_ticket", { ticket }) as any || {}; }
  catch { return { name: ticket, subject: "Support ticket", status: "Open", priority: "Medium", creation: "2026-05-28" }; }
}

export default async function TicketsPage({ searchParams }: { searchParams?: Record<string, string> }) {
  const doc = await loadTicket(searchParams?.ticket || "");
  return <PortalDocumentView type="ticket" title={doc.subject || doc.name || "Support Ticket"} subtitle="Customer support ticket with status, priority and response tracking." document={doc} actions={[{ label: "Create another ticket", href: "/customer-portal", primary: true }, { label: "Back to portal", href: "/customer-portal" }]} />;
}
