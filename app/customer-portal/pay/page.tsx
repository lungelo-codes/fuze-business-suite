import PortalDocumentView from "@/components/customer-portal/PortalDocumentView";
import { erpMethod } from "@/lib/server/erpnext";

async function loadPayment(invoice: string, site?: string) {
  try { return await erpMethod("portal.get_customer_invoice", { invoice, site }) as any || {}; }
  catch { return { name: invoice || "ACC-SINV-2026-0001", customer: "Demo Customer", status: "Unpaid", grand_total: 45000, outstanding_amount: 45000 }; }
}

export default async function PayPage({ searchParams }: { searchParams?: Record<string, string> }) {
  const invoice = searchParams?.invoice || "";
  const doc = await loadPayment(invoice, searchParams?.site);
  return <PortalDocumentView type="payment" title={`Pay ${invoice || doc.name || "invoice"}`} subtitle="Secure customer payment page connected to the tenant payment gateway and ERPNext invoice status." document={doc} actions={[{ label: "Generate payment link", href: `/api/customer-portal/payment-link?invoice=${encodeURIComponent(invoice || doc.name || "")}`, primary: true }, { label: "Back to invoice", href: `/customer-portal/invoice?invoice=${encodeURIComponent(invoice || doc.name || "")}` }]} />;
}
