import Link from "next/link";
import PublicHeader from "@/components/PublicHeader";
import { ALL_MODULES } from "@/lib/modules";

const outcomes = [
  "Understand daily business priorities before opening a module",
  "Connect customers, invoices, documents, tasks and support records",
  "Run on ERPNext power without exposing confusing ERP screens",
  "Start small, then unlock more modules as the company grows",
];

export default function AboutPage() {
  return (
    <div className="public-root premium-website">
      <PublicHeader />
      <section className="site-hero narrow">
        <span className="suite-kicker">About Business Suite</span>
        <h1>We are turning powerful ERP into software ordinary businesses can actually enjoy using.</h1>
        <p>Business Suite by Fuze Digital gives South African SMEs a modern operating system for finance, CRM, HR, projects, documents and support.</p>
      </section>
      <section className="site-section story-split">
        <div><h2>Built for how local businesses work.</h2><p>Many SMEs run their businesses across WhatsApp, spreadsheets, emails and paper files. Business Suite brings those daily workflows into one clean tenant workspace with selected modules only.</p><div className="story-proof">{outcomes.map((x)=><span key={x}>✓ {x}</span>)}</div></div>
        <div className="product-visual-card"><b>ERPNext backbone</b><span>Hidden behind a modern SaaS portal.</span><i>CRM → Quote → Invoice → Payment → Support</i></div>
      </section>
      <section className="site-section value-grid">{["Simple for customers", "Powerful for admins", "Ready for subscriptions"].map((x,i)=><div key={x}><b>0{i+1}</b><h3>{x}</h3><p>{["Customers see only the tools they selected.","Fuze can manage tenants, plans and modules from one platform.","Plan and module control supports your SaaS business model."][i]}</p></div>)}</section>
      <section className="final-public-cta"><h2>Ready to give your business a proper operating system?</h2><Link href="/signup" className="modern-primary">Start free trial</Link></section>
    </div>
  );
}
