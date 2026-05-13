import Link from "next/link";
import PublicHeader from "@/components/PublicHeader";

const legal = ["Terms of service", "Privacy policy", "Data processing", "Acceptable use", "Service availability", "Subscription terms"];
export default function LegalPage(){return <div className="public-root premium-website"><PublicHeader/><section className="site-hero narrow"><span className="suite-kicker">Legal</span><h1>Clear terms for a modern business platform.</h1><p>Business Suite keeps legal and trust information easy to find for customers before they sign up.</p></section><section className="site-section legal-list">{legal.map((x)=><article key={x}><h3>{x}</h3><p>Placeholder policy content for {x.toLowerCase()}. Replace with your approved legal wording before launch.</p></article>)}</section><section className="final-public-cta"><h2>Need a data or privacy question answered?</h2><Link href="/contact" className="modern-primary">Contact us</Link></section></div>}
