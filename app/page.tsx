import Link from "next/link";
import PublicHeader from "@/components/PublicHeader";
import { ALL_MODULES, PLANS } from "@/lib/modules";

const storyStats = [
  ["1 workspace", "CRM, finance, documents, HR, support and projects"],
  ["14-day trial", "Customers can test the system before paying"],
  ["SA-ready", "VAT, PAYE, UIF, SDL and CIPC workflows"],
  ["Business Suite engine", "Hidden behind a simple SaaS experience"],
];

const moduleSuites = [
  {
    id: "finance",
    name: "Finance & Compliance",
    eyebrow: "Invoices, VAT, PAYE, UIF, CIPC",
    image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1200&q=85",
    gradient: "from-blue-500 to-cyan-500",
    story: "For business owners who want to know exactly what is owed, what is overdue and what must be submitted before deadlines arrive.",
    copy: "Create branded invoices and quotes, track payments, monitor VAT and compliance deadlines, and keep every financial record connected to your customer data.",
    bullets: ["Send professional invoices", "Track payments and overdue accounts", "Monitor VAT, PAYE, UIF and CIPC", "View business cashflow in one place"],
    modules: ["invoices", "quotes", "payments", "compliance", "customers"],
  },
  {
    id: "crm",
    name: "CRM & Sales",
    eyebrow: "Pipeline, leads, opportunities, contacts",
    image: "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=85",
    gradient: "from-violet-500 to-indigo-500",
    story: "For teams that need every lead, quote, call, file and follow-up to move together instead of getting lost in chats and notebooks.",
    copy: "Move leads through a modern pipeline, manage opportunities, schedule follow-ups, add contacts and turn quotes into real business without confusing backend screens.",
    bullets: ["Visual sales pipeline", "Lead and opportunity tracking", "Customer 360 timeline", "Quotes and sales activities"],
    modules: ["crm", "leads", "opportunities", "quotes", "customers"],
  },
  {
    id: "operations",
    name: "Operations & Documents",
    eyebrow: "Projects, tasks, stock, cloud files",
    image: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=85",
    gradient: "from-purple-500 to-fuchsia-500",
    story: "For daily work that needs structure: staff know what to do, managers see progress, and files are attached to the correct business record.",
    copy: "Plan daily work, manage tasks, track suppliers and products, and connect Google Drive or Dropbox documents to invoices, customers, projects and support tickets.",
    bullets: ["Project and task dashboards", "Supplier and inventory records", "Google Drive and Dropbox links", "Attach files to business records"],
    modules: ["projects", "tasks", "suppliers", "items", "documents"],
  },
  {
    id: "people",
    name: "People & Support",
    eyebrow: "HR, payroll, attendance, tickets",
    image: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=85",
    gradient: "from-emerald-500 to-teal-500",
    story: "For service businesses where staff, tickets, leave, payroll and communication need to stay connected to real customer work.",
    copy: "Keep your team organized with employee records, leave, attendance and payroll, while customer support tickets and team chat stay connected to your workflow.",
    bullets: ["Employee and HR records", "Leave, attendance and payroll", "Support ticket tracking", "Team communication workspace"],
    modules: ["employees", "payroll", "leave", "attendance", "support", "chat"],
  },
];

const testimonials = [
  {
    name: "N. Mkhize",
    company: "Retail & Services",
    quote: "The dashboard makes it easy to see invoices, customers and tasks without opening complicated backend screens.",
    result: "Invoices and follow-ups became easier to manage every morning.",
  },
  {
    name: "L. Dlamini",
    company: "Construction Business",
    quote: "We can track quotes, jobs, files and payments from one system. It feels like software built for how we work.",
    result: "Job progress, documents and payments finally live together.",
  },
  {
    name: "A. Ndlovu",
    company: "Professional Services",
    quote: "The compliance reminders and customer records help us stay organized every day.",
    result: "Compliance and client work stopped being separate spreadsheets.",
  },
];

const journey = [
  {
    title: "Start with a guided workspace",
    body: "The client lands on a dashboard that explains what needs attention today, not a complicated ERP menu.",
  },
  {
    title: "Work inside the right module",
    body: "CRM, finance, documents, HR, support and projects each have their own dashboard and workflow.",
  },
  {
    title: "Attach every file and conversation",
    body: "Documents, messages, invoices and support records stay connected to the right customer or job.",
  },
  {
    title: "Grow by enabling more modules",
    body: "The system starts simple, then unlocks more power as the client’s business grows.",
  },
];

const businessOutcomes = [
  "Know what needs attention today",
  "Send invoices and quotes faster",
  "Track customers, contacts and documents",
  "Manage staff, tasks and support tickets",
  "Keep compliance deadlines visible",
  "Add modules only when your business needs them",
];

function ModulePill({ id }: { id: string }) {
  const mod = ALL_MODULES.find((m) => m.id === id);
  if (!mod) return null;
  return <span className="modern-module-pill">{mod.icon} {mod.label}</span>;
}

function FloatingPreview() {
  return (
    <div className="saas-orbit-stage" aria-label="Business Suite animated product preview">
      <div className="orbit-glow one" />
      <div className="orbit-glow two" />
      <div className="orbit-card orbit-card-a">
        <span>CRM Pipeline</span>
        <b>R146k</b>
        <small>28 opportunities</small>
      </div>
      <div className="orbit-card orbit-card-b">
        <span>Compliance</span>
        <b>6 alerts</b>
        <small>VAT · PAYE · UIF</small>
      </div>
      <div className="orbit-card orbit-card-c">
        <span>Documents</span>
        <b>342 files</b>
        <small>Drive · Dropbox · Business records</small>
      </div>

      <div className="modern-dashboard-preview premium-preview">
        <div className="preview-topbar"><span></span><span></span><span></span></div>
        <div className="preview-layout">
          <div className="preview-sidebar">
            {['Dashboard','CRM','Finance','Documents','Projects','Support'].map((x, i) => <b key={x} className={i === 0 ? 'active' : ''}>{x}</b>)}
          </div>
          <div className="preview-main">
            <div className="preview-hero-card">
              <small>Business health</small>
              <strong>Everything important, in one view.</strong>
              <em>Revenue, customers, alerts and work queues.</em>
            </div>
            <div className="preview-kpis">
              <span><b>R128k</b><small>Revenue</small></span>
              <span><b>94</b><small>Leads</small></span>
              <span><b>21</b><small>Alerts</small></span>
            </div>
            <div className="mini-pipeline">
              <i style={{height:'62%'}}></i><i style={{height:'84%'}}></i><i style={{height:'48%'}}></i><i style={{height:'72%'}}></i>
            </div>
            <div className="preview-table">
              <i></i><i></i><i></i><i></i>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="public-root modern-public-root premium-website">
      <PublicHeader />

      <section className="modern-hero premium-hero">
        <div className="modern-hero-bg" />
        <div className="hero-mesh" />
        <div className="container modern-hero-grid premium-hero-grid">
          <div className="modern-hero-copy premium-copy">
            <div className="modern-badge">🇿🇦 Business software for South African SMEs</div>
            <h1>Give every growing business a premium operating system.</h1>
            <p>
              Business Suite turns powerful business workflows into a clean SaaS experience your clients can understand immediately — from sales and invoices to documents, HR, support and compliance.
            </p>
            <div className="modern-hero-actions">
              <Link className="modern-primary" href="/signup">Start Free Trial</Link>
              <Link className="modern-secondary" href="#story">See how it works</Link>
            </div>
            <div className="modern-trust-row">
              <span>14-day trial</span><span>No credit card</span><span>Private tenant workspace</span><span>Business Suite powered</span>
            </div>
            <div className="hero-proof-grid">
              {storyStats.map(([value, label]) => (
                <div key={value}><b>{value}</b><span>{label}</span></div>
              ))}
            </div>
          </div>

          <FloatingPreview />
        </div>
      </section>

      <section className="modern-section modern-logo-strip premium-strip">
        <div className="container logo-strip-inner">
          {businessOutcomes.map((item) => <span key={item}>✓ {item}</span>)}
        </div>
      </section>

      <section className="modern-section story-section" id="story">
        <div className="container story-grid">
          <div className="story-copy">
            <span className="suite-kicker">The story</span>
            <h2>Most business systems are powerful, but difficult. Business Suite makes the power feel simple.</h2>
            <p>
              Your clients should not need to understand ERP terminology to run their business. They need a dashboard that tells them what to do, modules that match their daily work, and records that stay connected from quote to payment.
            </p>
            <Link href="/features" className="modern-primary">Explore the platform →</Link>
          </div>
          <div className="story-board">
            {journey.map((item, index) => (
              <div className="story-step" key={item.title}>
                <strong>{String(index + 1).padStart(2, '0')}</strong>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="modern-section" id="modules">
        <div className="container">
          <div className="modern-section-head premium-head">
            <span>Modules explained</span>
            <h2>A website that teaches the client how the whole system runs their business.</h2>
            <p>Each suite is positioned around the customer’s daily outcomes: sell, invoice, collect, file, assign, support, report and grow.</p>
          </div>

          <div className="modern-suite-stack premium-suite-stack">
            {moduleSuites.map((suite, index) => (
              <article className={`modern-suite-card premium-suite-card ${index % 2 ? 'reverse' : ''}`} key={suite.id} id={suite.id}>
                <div className="suite-image-wrap premium-image-wrap">
                  <img src={suite.image} alt={`${suite.name} workspace`} />
                  <div className={`suite-floating-metric bg-gradient-to-br ${suite.gradient}`}>
                    <span>{suite.eyebrow}</span>
                    <b>{suite.name}</b>
                  </div>
                  <div className="suite-image-panel">
                    <span>Business outcome</span>
                    <b>{suite.story}</b>
                  </div>
                </div>
                <div className="suite-copy premium-suite-copy">
                  <span className="suite-kicker">{suite.eyebrow}</span>
                  <h3>{suite.name}</h3>
                  <p>{suite.copy}</p>
                  <ul>
                    {suite.bullets.map((b) => <li key={b}>✓ {b}</li>)}
                  </ul>
                  <div className="suite-pills">
                    {suite.modules.map((id) => <ModulePill id={id} key={id} />)}
                  </div>
                  <Link href={`/features#${suite.id}`} className="suite-link">Learn more about {suite.name} →</Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="modern-section modern-dark-section premium-dark-section">
        <div className="container modern-dark-grid">
          <div>
            <span className="suite-kicker">Daily workflow</span>
            <h2>From morning dashboard to completed work.</h2>
            <p>Business Suite is organized around the daily tasks a business owner actually needs: see what changed, follow up customers, send invoices, check compliance and assign work.</p>
          </div>
          <div className="daily-flow premium-flow">
            {[
              ["1", "Open dashboard", "See revenue, overdue work, tickets and compliance alerts."],
              ["2", "Act on records", "Open the right customer, lead, invoice or task from the dashboard."],
              ["3", "Complete workflow", "Send invoice, attach document, assign staff or update a ticket."],
              ["4", "Track results", "Reports update across finance, CRM, projects and support."],
            ].map(([n, t, b]) => (
              <div className="flow-step" key={n}><strong>{n}</strong><div><b>{t}</b><p>{b}</p></div></div>
            ))}
          </div>
        </div>
      </section>

      <section className="modern-section case-study-section">
        <div className="container case-study-grid">
          <div className="case-card-main">
            <span className="suite-kicker">Customer story</span>
            <h2>One owner, one dashboard, every department connected.</h2>
            <p>Imagine a service business receiving a new lead. The lead becomes a quote, the quote becomes an invoice, the invoice links to documents, staff receive tasks, and support can see the full history.</p>
            <div className="case-metrics">
              <div><b>42%</b><span>faster follow-up</span></div>
              <div><b>3x</b><span>clearer daily visibility</span></div>
              <div><b>1</b><span>connected workspace</span></div>
            </div>
          </div>
          <div className="case-timeline">
            {[
              "Website lead captured in CRM",
              "Quote generated and emailed",
              "Documents attached from cloud storage",
              "Invoice sent and payment tracked",
              "Reports update automatically",
            ].map((item, index) => <div key={item}><strong>{index + 1}</strong><span>{item}</span></div>)}
          </div>
        </div>
      </section>

      <section className="modern-section testimonials-premium">
        <div className="container">
          <div className="modern-section-head">
            <span>Testimonials</span>
            <h2>Built to feel simple, even when the backend is powerful.</h2>
          </div>
          <div className="modern-testimonial-grid premium-testimonial-grid">
            {testimonials.map((t) => (
              <div className="modern-testimonial premium-testimonial" key={t.name}>
                <p>“{t.quote}”</p>
                <div><b>{t.name}</b><span>{t.company}</span></div>
                <small>{t.result}</small>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="modern-section modern-pricing-section premium-pricing" id="pricing">
        <div className="container">
          <div className="modern-section-head">
            <span>Pricing</span>
            <h2>Choose a plan, then choose your modules.</h2>
            <p>Start with the basics and unlock CRM, operations, documents, HR and support as your business grows.</p>
          </div>
          <div className="modern-pricing-grid">
            {PLANS.map((plan) => (
              <div className={`modern-price-card premium-price-card ${plan.highlight ? 'featured' : ''}`} key={plan.id}>
                {plan.badge && <em>{plan.badge}</em>}
                <h3>{plan.label}</h3>
                <div className="modern-price">{plan.price ? `R${plan.price.toLocaleString()}` : plan.id === 'Starter' ? 'Free' : 'Custom'}</div>
                <small>{plan.period}</small>
                <p>{plan.description}</p>
                <ul>
                  {plan.modules.slice(0, 6).map((id) => {
                    const mod = ALL_MODULES.find((m) => m.id === id);
                    return mod ? <li key={id}>✓ {mod.label}</li> : null;
                  })}
                </ul>
                <Link href={`/signup?plan=${encodeURIComponent(plan.id)}`}>{plan.id === 'Enterprise' ? 'Contact Sales' : 'Start Trial'}</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="modern-final-cta premium-final-cta">
        <div className="container final-cta-inner">
          <span>Ready to launch?</span>
          <h2>Give your clients a website that sells the full platform before they even log in.</h2>
          <p>Modern storytelling, clear module education, premium graphics, trust-building testimonials and a direct path to signup.</p>
          <div className="modern-hero-actions cta-actions">
            <Link className="modern-primary" href="/signup">Start Free Trial →</Link>
            <Link className="modern-secondary" href="/contact">Talk to Fuze Digital</Link>
          </div>
        </div>
      </section>

      <footer className="footer modern-footer premium-footer">
        <div className="container footer-inner">
          <div className="footer-brand"><span className="brand-mark-sm">BS</span><span className="footer-name">Business Suite</span></div>
          <div className="footer-links"><Link href="/features">Features</Link><Link href="/#modules">Modules</Link><Link href="/#pricing">Pricing</Link><Link href="/about">About</Link><Link href="/contact">Contact</Link><Link href="/login">Login</Link></div>
          <div className="footer-copy">© {new Date().getFullYear()} Fuze Digital · updates@fuzedigital.co.za</div>
        </div>
      </footer>
    </div>
  );
}
