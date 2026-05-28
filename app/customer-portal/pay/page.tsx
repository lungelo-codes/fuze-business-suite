export default function PayPage({ searchParams }: { searchParams?: Record<string, string> }) {
  const invoice = searchParams?.invoice || "";
  return <main className="public-page"><section className="hero"><p className="eyebrow">Secure Payment</p><h1>Pay invoice {invoice || ""}</h1><p>PayFast payment adapter is wired. Final redirect will use the PayFast DocType mapping when connected.</p></section></main>;
}
