export default function InvoicePortalPage({ searchParams }: { searchParams?: Record<string, string> }) {
  const invoice = searchParams?.invoice || "";
  return <main className="public-page"><section className="hero"><p className="eyebrow">Invoice</p><h1>{invoice || "Invoice"}</h1><p>Customer invoice view handoff is ready for the SaaS portal.</p></section></main>;
}
