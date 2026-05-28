import PortalDocumentView from "@/components/customer-portal/PortalDocumentView";
import { erpMethod } from "@/lib/server/erpnext";

async function loadInvoice(invoice: string, site?: string) {
  try { return await erpMethod("portal.get_customer_invoice", { invoice, site }) as any || {}; }
  catch { return { name: invoice || "ACC-SINV-2026-0001", customer: "Demo Customer", status: "Unpaid", posting_date: "2026-05-28", due_date: "2026-06-05", grand_total: 45000, outstanding_amount: 45000, items: [{ item_name: "Business service", qty: 1, rate: 45000, amount: 45000 }] }; }
}

export default async function InvoicePortalPage({ searchParams }: { searchParams?: Record<string, string> }) {
  const invoice = searchParams?.invoice || "";
  const doc = await loadInvoice(invoice, searchParams?.site);
  return <PortalDocumentView type="invoice" title={invoice || doc.name || "Invoice"} subtitle="Customer invoice view with amount, due date, payment state and secure payment action." document={doc} actions={[{ label: "Pay invoice", href: `/customer-portal/pay?site=${encodeURIComponent(searchParams?.site || "")}&invoice=${encodeURIComponent(invoice || doc.name || "")}`, primary: true }, { label: "Back to portal", href: "/customer-portal" }]} />;
}
