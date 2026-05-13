import Link from "next/link";
import PublicHeader from "@/components/SiteHeader";
import { ALL_MODULES } from "@/lib/modules";

const groups = ["Finance", "CRM", "Operations", "People", "Service"] as const;
const detail: Record<string,string> = {
  Finance: "Invoices, payments, quotes, VAT and compliance records that help businesses understand money in and money out.",
  CRM: "Pipeline, leads, opportunities, contacts and customer activity to help teams close more work.",
  Operations: "Projects, tasks, documents, suppliers and inventory records connected to real business work.",
  People: "Employees, attendance, leave and payroll views for businesses that manage a growing team.",
  Service: "Support tickets, appointments and messages that keep customer service organized."
};

export default function FeaturesPage() {
  return (
    <div className="public-root premium-website">
      <PublicHeader />
      <section className="site-hero"><span className="suite-kicker">Features</span><h1>Every module has a clear job in the business.</h1><p>Business Suite is not a random menu of ERP screens. Each module is presented as a workflow your client can understand from the website.</p></section>
      {groups.map((group)=><section className="feature-band" id={group.toLowerCase()} key={group}><div className="feature-band-head"><span className="suite-kicker">{group}</span><h2>{group} modules</h2><p>{detail[group]}</p></div><div className="feature-card-grid">{ALL_MODULES.filter((m)=>m.group===group).map((m)=><Link href={`/features/${m.id}`} className="feature-detail-card" key={m.id}><span>{m.icon}</span><h3>{m.label}</h3><p>{m.description}</p><small>See how it works →</small></Link>)}</div></section>)}
    </div>
  );
}
