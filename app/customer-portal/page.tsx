export default function CustomerPortalPage({ searchParams }: { searchParams?: Record<string, string> }) {
  const site = searchParams?.site || "";
  const customer = searchParams?.customer || "";
  return <main className="public-page"><section className="hero"><p className="eyebrow">Customer Portal</p><h1>View your documents and payment status</h1><p>This portal handoff is ready for tenant customer access. Site: {site || "your business"}{customer ? ` · Customer: ${customer}` : ""}</p></section></main>;
}
