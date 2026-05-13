import Link from "next/link";
import PublicHeader from "@/components/SiteHeader";

const resources = [
  ["Implementation guide", "How to move from spreadsheets into Business Suite."],
  ["Compliance checklist", "VAT, PAYE, UIF, SDL and CIPC readiness for SMEs."],
  ["CRM playbook", "How to manage leads, opportunities, quotes and follow-ups."],
  ["Document management", "How to connect cloud files to customers and invoices."],
  ["Invoice workflow", "How to create, send and track professional invoices."],
  ["Team operations", "How HR, projects and support work together."],
];

export default function ResourcesPage() {
  return <div className="public-root premium-website"><PublicHeader/><section className="site-hero narrow"><span className="suite-kicker">Resources</span><h1>Guides that help customers understand the whole system.</h1><p>Use these resources to explain modules, workflows and setup before customers sign up.</p></section><section className="site-section resource-grid">{resources.map(([title,body])=><article key={title}><span>Guide</span><h3>{title}</h3><p>{body}</p><Link href="/signup">Use this in my business →</Link></article>)}</section></div>;
}
