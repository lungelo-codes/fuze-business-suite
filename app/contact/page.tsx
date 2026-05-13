import Link from "next/link";
import PublicHeader from "@/components/SiteHeader";

const contactOptions = [
  ["Sales", "Choose a plan, understand modules and book a walkthrough."],
  ["Support", "Get help with onboarding, documents, billing or portal access."],
  ["Partnerships", "Discuss white-label, reseller or vertical SaaS opportunities."],
];

export default function ContactPage() {
  return (
    <div className="public-root premium-website">
      <PublicHeader />
      <section className="site-hero narrow"><span className="suite-kicker">Contact</span><h1>Talk to Fuze Digital about your business suite.</h1><p>Whether you need a demo, onboarding help or a custom SaaS module, this is where the conversation starts.</p></section>
      <section className="site-section contact-grid">
        <div className="contact-card-main"><h2>Tell us what you want to build.</h2><p>We will help you choose modules, understand setup, and connect the system to your business process.</p><div className="contact-lines"><a href="mailto:updates@fuzedigital.co.za">updates@fuzedigital.co.za</a><a href="tel:+27747894145">074 789 4145</a></div></div>
        <form className="contact-form-card"><label>Name<input placeholder="Your name" /></label><label>Email<input placeholder="you@company.co.za" /></label><label>Business need<textarea placeholder="Tell us what modules you need" /></label><button className="modern-primary" type="button">Send message</button></form>
      </section>
      <section className="site-section value-grid">{contactOptions.map(([title,body])=><div key={title}><h3>{title}</h3><p>{body}</p><Link href="/signup">Start here →</Link></div>)}</section>
    </div>
  );
}
