import Link from "next/link";
import PublicHeader from "@/components/SiteHeader";

const support = ["Getting started", "Billing and subscriptions", "Google Drive / Dropbox linking", "ERPNext data sync", "Invoices and email", "Module access" ];
export default function SupportPage(){return <div className="public-root premium-website"><PublicHeader/><section className="site-hero narrow"><span className="suite-kicker">Support</span><h1>Help customers get value from every module.</h1><p>Support content is structured around the daily workflows customers use inside Business Suite.</p></section><section className="site-section support-grid">{support.map((x)=><div key={x}><h3>{x}</h3><p>Step-by-step help for this area, written in business language and connected to the portal workflow.</p><Link href="/contact">Get help →</Link></div>)}</section></div>}
