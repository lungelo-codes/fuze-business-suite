import Link from "next/link";
import PublicHeader from "@/components/PublicHeader";
import { ALL_MODULES, PLANS } from "@/lib/modules";

const featureCards = [
  { title: "CRM", body: "Manage leads, deals, accounts and follow-ups with a Salesforce-inspired workspace.", icon: "👥" },
  { title: "Sales", body: "Create quotes, sales orders, invoices and payment links from one flow.", icon: "💼" },
  { title: "Finance", body: "Track cash flow, receivables, payables, expenses and owner-level reports.", icon: "💳" },
  { title: "Projects", body: "Plan tasks, timesheets, expenses, billing and project profitability.", icon: "📁" },
  { title: "Support", body: "Handle support tickets, SLA pressure, responses and customer communication.", icon: "🎧" },
  { title: "Insights", body: "Give the owner AI summaries, risks, recommendations and growth actions.", icon: "✨" },
];

const workflow = [
  ["Capture", "Lead, customer, ticket, task or invoice enters the business."],
  ["Act", "Your team follows up, sends quotes, assigns work and updates records."],
  ["Report", "The owner sees revenue, risks, pipeline, support pressure and next actions."],
];

const aiPrompts = ["Pipeline summary", "Cash flow risks", "Overdue invoices", "Support pressure", "Project profitability"];

function MiniDashboard() {
  return (
    <div className="fg-product-card" aria-label="Fuze Business Suite product preview">
      <div className="fg-product-shell">
        <aside className="fg-product-side">
          <div className="fg-logo-mark"><span /></div>
          {['Dashboard', 'CRM', 'Sales', 'Projects', 'Support', 'Finance', 'Insights'].map((item, index) => (
            <div className={index === 1 ? 'active' : ''} key={item}>{item}</div>
          ))}
          <div className="fg-plan-box"><small>Current Plan</small><b>Professional</b><span>Green + Gold</span></div>
        </aside>
        <main className="fg-product-main">
          <div className="fg-product-top"><span>CRM Workspace</span><button>+ New</button></div>
          <div className="fg-kpi-grid">
            <div><small>Total Leads</small><b>428</b><span>↑ 12.5%</span></div>
            <div><small>Open Deals</small><b>156</b><span>↑ 8.3%</span></div>
            <div><small>Pipeline Value</small><b>R785k</b><span>↑ 15.7%</span></div>
          </div>
          <div className="fg-pipeline">
            {['New Lead', 'Qualified', 'Proposal', 'Negotiation', 'Won'].map((stage, index) => (
              <div key={stage}><small>{stage}</small><b>{[92, 48, 28, 16, 12][index]}</b></div>
            ))}
          </div>
          <div className="fg-preview-grid">
            <div className="fg-table-card">
              <b>Recent Leads</b>
              {[1, 2, 3, 4].map((row) => <span key={row} />)}
            </div>
            <div className="fg-ai-card">
              <small>AI Business Assistant</small>
              <b>Pipeline health is good.</b>
              <p>Focus on negotiation stage and follow up 12 older leads this week.</p>
              <button>Ask AI</button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function HomePage() {
  const pricingPlans = PLANS.slice(0, 4);

  return (
    <div className="fg-landing">
      <PublicHeader />

      <section className="fg-hero">
        <div className="fg-hero-bg" />
        <div className="container fg-hero-grid">
          <div className="fg-hero-copy">
            <div className="fg-badge">Green & Gold SaaS for growing South African businesses</div>
            <h1>Run your business with one smart AI-powered platform.</h1>
            <p>
              Fuze Business Suite brings CRM, sales, projects, finance, HR, support, client portal and AI reporting together in a premium workspace made for business owners.
            </p>
            <div className="fg-hero-actions">
              <Link href="/signup" className="fg-primary">Get Started Free</Link>
              <Link href="/contact" className="fg-secondary">Book Demo</Link>
            </div>
            <div className="fg-trust-row">
              <span>✓ 14-day free trial</span>
              <span>✓ No credit card required</span>
              <span>✓ Cancel anytime</span>
            </div>
          </div>
          <MiniDashboard />
        </div>
      </section>

      <section className="fg-logo-strip">
        <div className="container fg-logo-inner">
          {['CRM', 'Sales', 'Finance', 'Projects', 'Support', 'Client Portal', 'AI Insights'].map((item) => <span key={item}>{item}</span>)}
        </div>
      </section>

      <section className="fg-section">
        <div className="container">
          <div className="fg-section-head">
            <span>Everything in one place</span>
            <h2>One platform. Connected teams. Better business control.</h2>
            <p>Every module follows the same clean interface so SaaS users can move from CRM to finance, projects, support and reports without feeling lost.</p>
          </div>
          <div className="fg-feature-grid">
            {featureCards.map((feature) => (
              <article className="fg-feature-card" key={feature.title}>
                <div>{feature.icon}</div>
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
                <Link href={`/features#${feature.title.toLowerCase()}`}>Learn more →</Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="fg-ai-section">
        <div className="container fg-ai-grid">
          <div>
            <span className="fg-kicker">AI owner assistant</span>
            <h2>Your AI assistant should help the owner make better decisions.</h2>
            <p>
              The AI layer reviews CRM, finance, support, projects and client portal activity, then turns it into simple recommendations the company owner can act on.
            </p>
            <ul className="fg-check-list">
              <li>Summarise each module in plain language</li>
              <li>Highlight risks like overdue invoices or weak pipeline stages</li>
              <li>Recommend actions for follow-ups, payments and support pressure</li>
              <li>Prepare owner-ready reports without opening ERP screens</li>
            </ul>
          </div>
          <div className="fg-ai-panel">
            <div className="fg-ai-orb">✦</div>
            <h3>Ask Fuze AI</h3>
            <p>“What should I focus on this week?”</p>
            <div className="fg-ai-answer">
              <b>Recommended actions</b>
              <span>Follow up 12 CRM leads</span>
              <span>Collect R48,500 overdue invoices</span>
              <span>Review 3 delayed project tasks</span>
            </div>
            <div className="fg-prompt-row">
              {aiPrompts.map((prompt) => <button key={prompt}>{prompt}</button>)}
            </div>
          </div>
        </div>
      </section>

      <section className="fg-section fg-workflow-section">
        <div className="container">
          <div className="fg-section-head">
            <span>Built to simplify work</span>
            <h2>From lead to payment, the system keeps the flow connected.</h2>
          </div>
          <div className="fg-workflow-grid">
            {workflow.map(([title, body], index) => (
              <article className="fg-work-card" key={title}>
                <strong>{String(index + 1).padStart(2, '0')}</strong>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="fg-section fg-pricing-section" id="pricing">
        <div className="container">
          <div className="fg-section-head">
            <span>Simple pricing</span>
            <h2>Plans that unlock the right modules as the business grows.</h2>
          </div>
          <div className="fg-pricing-grid">
            {pricingPlans.map((plan) => (
              <article className={`fg-price-card ${plan.highlight ? 'featured' : ''}`} key={plan.id}>
                {plan.badge && <em>{plan.badge}</em>}
                <h3>{plan.label}</h3>
                <div className="fg-price">{plan.price ? `R${plan.price.toLocaleString()}` : plan.id === 'Starter' ? 'Free' : 'Custom'}</div>
                <small>{plan.period}</small>
                <p>{plan.description}</p>
                <ul>
                  {plan.modules.slice(0, 5).map((id) => {
                    const mod = ALL_MODULES.find((m) => m.id === id);
                    return mod ? <li key={id}>✓ {mod.label}</li> : null;
                  })}
                </ul>
                <Link href={`/signup?plan=${encodeURIComponent(plan.id)}`}>{plan.id === 'Enterprise' ? 'Book Demo' : 'Start Free Trial'}</Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="fg-client-section">
        <div className="container fg-client-grid">
          <div>
            <span className="fg-kicker">Client portal</span>
            <h2>A better experience for your clients too.</h2>
            <p>Clients can log in to view quotes, invoices, payment links, support tickets, appointments and project updates without contacting the office every time.</p>
            <Link href="/customer-portal" className="fg-green-button">See portal in action</Link>
          </div>
          <div className="fg-client-preview">
            <div className="fg-client-menu"><b>Client Portal</b><span>Dashboard</span><span>Invoices</span><span>Quotes</span><span>Tickets</span></div>
            <div className="fg-client-main"><h3>Welcome back, John 👋</h3><div><b>Open invoices</b><span>R20,500</span></div><div><b>Project progress</b><span>75%</span></div></div>
          </div>
        </div>
      </section>

      <section className="fg-final-cta">
        <div className="container fg-final-inner">
          <h2>Ready to run your business smarter?</h2>
          <p>Launch a premium SaaS workspace your clients can understand, trust and use every day.</p>
          <div className="fg-hero-actions">
            <Link href="/signup" className="fg-primary">Get Started Free</Link>
            <Link href="/contact" className="fg-secondary light">Book Demo</Link>
          </div>
        </div>
      </section>

      <footer className="fg-footer">
        <div className="container fg-footer-grid">
          <div><b>Fuze Business Suite</b><p>Green and gold AI-powered business platform.</p></div>
          <div><span>Platform</span><Link href="/features">Features</Link><Link href="/#pricing">Pricing</Link><Link href="/login">Login</Link></div>
          <div><span>Company</span><Link href="/about">About</Link><Link href="/contact">Contact</Link><Link href="/legal">Legal</Link></div>
          <div><span>Stay in the loop</span><input placeholder="Email address" /><button>Subscribe</button></div>
        </div>
      </footer>
    </div>
  );
}
