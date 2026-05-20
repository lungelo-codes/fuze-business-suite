import Link from "next/link";
import { notFound } from "next/navigation";
import PublicHeader from "@/components/PublicHeader";
import { ALL_MODULES } from "@/lib/modules";

export function generateStaticParams() { return ALL_MODULES.map((m) => ({ module: m.id })); }

export default function ModuleLandingPage({ params }: { params: { module: string } }) {
  const mod = ALL_MODULES.find((m) => m.id === params.module);
  if (!mod) notFound();
  const flows = [
    `Create and manage ${mod.label.toLowerCase()} records`,
    "Link activity back to customers and business documents",
    "Use dashboards and tables instead of raw backend screens",
    "Keep staff focused on what needs attention today",
  ];
  return (
    <div className="public-root premium-website">
      <PublicHeader />
      <section className="site-hero module-landing"><span className="module-icon-large">{mod.icon}</span><span className="suite-kicker">{mod.group} module</span><h1>{mod.label}</h1><p>{mod.description}. Built into a modern Business Suite workspace so clients can use it without learning ERP terminology.</p><div className="modern-hero-actions"><Link href="/signup" className="modern-primary">Start free trial</Link><Link href="/features" className="modern-secondary">View all modules</Link></div></section>
      <section className="site-section module-flow-grid">{flows.map((flow,i)=><div key={flow}><b>{`0${i+1}`}</b><h3>{flow}</h3><p>This workflow appears inside the customer portal with clean cards, filters, actions and connected records.</p></div>)}</section>
      <section className="site-section preview-split"><div><h2>How it helps the business</h2><p>{mod.label} gives customers a clear process, accurate records and better visibility. It is connected to the rest of the suite so work does not live in isolation.</p></div><div className="product-visual-card"><b>{mod.label} Dashboard</b><span>Cards · records · actions · reports</span><i>{mod.path}</i></div></section>
    </div>
  );
}
