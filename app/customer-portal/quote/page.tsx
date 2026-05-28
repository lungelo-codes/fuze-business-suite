export default function QuotePortalPage({ searchParams }: { searchParams?: Record<string, string> }) {
  const quotation = searchParams?.quotation || "";
  return <main className="public-page"><section className="hero"><p className="eyebrow">Quote</p><h1>{quotation || "Quote"}</h1><p>Customer quote view and acceptance handoff is ready for the SaaS portal.</p></section></main>;
}
