import PortalDocumentView from "@/components/customer-portal/PortalDocumentView";
import { erpMethod } from "@/lib/server/erpnext";

async function loadQuote(quotation: string, site?: string) {
  try { return await erpMethod("portal.get_customer_quotation", { quotation, site }) as any || {}; }
  catch { return { name: quotation || "SAL-QTN-2026-0001", customer: "Demo Customer", status: "Open", transaction_date: "2026-05-26", grand_total: 120000, items: [{ item_name: "SaaS implementation", qty: 1, rate: 120000, amount: 120000 }] }; }
}

export default async function QuotePortalPage({ searchParams }: { searchParams?: Record<string, string> }) {
  const quotation = searchParams?.quotation || "";
  const doc = await loadQuote(quotation, searchParams?.site);
  const quoteName = quotation || doc.name || "";
  return <PortalDocumentView type="quote" title={quoteName || "Quotation"} subtitle="Customer quotation view with approval and request-change workflow ready for ERPNext." document={doc} actions={[{ label: "Accept quote", href: `/customer-portal/quote?accepted=1&quotation=${encodeURIComponent(quoteName)}`, primary: true }, { label: "Request changes", href: "/customer-portal/tickets" }, { label: "Back to portal", href: "/customer-portal" }]} />;
}
