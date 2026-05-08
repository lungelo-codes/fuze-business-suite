import { cookies } from "next/headers";
import { getDashboardData } from "@/lib/server/data";
import { MODULE_COOKIE, PLAN_COOKIE, COMPANY_COOKIE, getModulesForPlan } from "@/lib/modules";
import { money } from "@/lib/mappers";

function isOpenStatus(status?: string): boolean {
  const value = (status || "").toLowerCase();
  return value.includes("open") || value.includes("progress") || value.includes("waiting") || value.includes("overdue") || value.includes("pending");
}

function dateOnly(value?: string): string {
  if (!value) return "-";
  return value.split(" ")[0]?.split("T")[0] || value;
}

function moduleAllowed(active: Set<string>, id: string) {
  return active.has(id);
}

function initials(value?: string): string {
  const text = value || "BS";
  return text.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() || "").join("") || "BS";
}

function StatusPill({ status }: { status?: string }) {
  const s = status || "Active";
  const key = s.toLowerCase();
  const cls = key.includes("overdue") || key.includes("urgent") ? "chip danger" : key.includes("pending") || key.includes("waiting") ? "chip warn" : "chip ok";
  return <span className={cls}>{s}</span>;
}

function StatCard({ label, value, hint, href }: { label: string; value: string | number; hint: string; href: string }) {
  return (
    <a href={href} className="demo-stat-card">
      <div className="demo-stat-top">
        <div>
          <div className="demo-stat-label">{label}</div>
          <div className="demo-stat-value">{value}</div>
          <div className="demo-stat-hint">{hint}</div>
        </div>
        <div className="demo-stat-icon">↗</div>
      </div>
    </a>
  );
}

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const plan = cookieStore.get(PLAN_COOKIE)?.value || "Starter";
  const companyName = cookieStore.get(COMPANY_COOKIE)?.value ? decodeURIComponent(cookieStore.get(COMPANY_COOKIE)?.value || "") : "your business";
  let activeModules: string[] = [];
  try { activeModules = JSON.parse(decodeURIComponent(cookieStore.get(MODULE_COOKIE)?.value || "[]")); } catch { activeModules = []; }
  if (!activeModules.length) activeModules = getModulesForPlan(plan);
  const active = new Set(activeModules);
  const data = await getDashboardData();

  const totalRevenue = data.invoices.reduce((sum, invoice) => sum + (invoice.grand_total ?? 0), 0);
  const outstanding = data.invoices.reduce((sum, invoice) => sum + (invoice.outstanding_amount ?? 0), 0);
  const openSupport = data.support.filter((ticket) => isOpenStatus(ticket.status)).length;
  const openWork = data.tasks.filter((task) => isOpenStatus(task.status)).length + data.support.filter((ticket) => isOpenStatus(ticket.status)).length;

  const records = [
    ...data.invoices.slice(0, 2).map((row) => ({ module: "Finance", title: `${row.name} awaiting ${money(row.outstanding_amount || row.grand_total || 0)}`, status: row.status || "Invoice", owner: row.customer || "Customer", value: money(row.grand_total || 0), href: "/portal/invoices" })),
    ...data.tasks.slice(0, 2).map((row) => ({ module: "Projects", title: row.subject || row.name, status: row.status || row.priority || "Open", owner: row.project || "Task", value: dateOnly(row.exp_end_date || row.modified), href: "/portal/tasks" })),
    ...data.support.slice(0, 2).map((row) => ({ module: "Support", title: row.subject || row.name, status: row.status || row.priority || "Open", owner: row.customer || row.raised_by || "Customer", value: row.priority || "Normal", href: "/portal/support" })),
    ...data.compliance.slice(0, 2).map((row) => ({ module: "Compliance", title: `${row.kind} • ${row.name}`, status: row.status || "Open", owner: row.company || "Company", value: dateOnly(row.due_date), href: "/portal/compliance" })),
  ].slice(0, 7);

  const alerts = [
    { title: `${data.compliance.length} compliance records available`, module: "Finance & Compliance", href: "/portal/compliance", show: moduleAllowed(active, "compliance") },
    { title: `${data.quotes.length} quotations in the sales workspace`, module: "CRM & Sales", href: "/portal/quotes", show: moduleAllowed(active, "quotes") },
    { title: `${openWork} open tasks, tickets or support items`, module: "Operations", href: moduleAllowed(active, "tasks") ? "/portal/tasks" : "/portal/support", show: moduleAllowed(active, "tasks") || moduleAllowed(active, "support") },
    { title: `${data.payments.length} payments captured`, module: "Finance", href: "/portal/payments", show: moduleAllowed(active, "payments") },
  ].filter((a) => a.show);

  return (
    <div>
      <section className="demo-hero">
        <div className="demo-hero-grid">
          <div>
            <div className="demo-eyebrow">Welcome back</div>
            <h1 className="demo-hero-title">Run {companyName} from one clean workspace.</h1>
            <p className="demo-hero-copy">This executive dashboard gives you a live view of revenue, customers, open work, alerts, subscriptions and important records across every module you selected.</p>
            <div className="demo-hero-actions">
              {moduleAllowed(active, "crm") ? <a className="btn btn-teal" href="/portal/crm">Open CRM</a> : null}
              {moduleAllowed(active, "invoices") ? <a className="btn btn-primary" href="/portal/invoices">Create Invoice</a> : null}
              <a className="btn" href="/portal/reports">View Reports</a>
            </div>
          </div>
          <div className="demo-hero-plan">
            <div className="demo-eyebrow">Subscription plan</div>
            <h3>{plan}</h3>
            <p className="demo-hero-copy">{activeModules.length} modules enabled for this tenant.</p>
            <div className="demo-pill-row">
              <div className="demo-pill-box"><span>Modules</span><b>{activeModules.length} active</b></div>
              <div className="demo-pill-box"><span>Status</span><b>Active</b></div>
            </div>
          </div>
        </div>
      </section>

      <section className="demo-stat-grid">
        {moduleAllowed(active, "invoices") ? <StatCard label="Total Revenue" value={money(totalRevenue)} hint="Sales invoices" href="/portal/invoices" /> : null}
        {moduleAllowed(active, "invoices") ? <StatCard label="Outstanding" value={money(outstanding)} hint="Unpaid balance" href="/portal/invoices" /> : null}
        {moduleAllowed(active, "customers") ? <StatCard label="Customers" value={data.customers.length} hint="Customer records" href="/portal/customers" /> : null}
        {(moduleAllowed(active, "support") || moduleAllowed(active, "tasks")) ? <StatCard label="Open Work" value={openWork} hint="Tasks and tickets" href={moduleAllowed(active, "tasks") ? "/portal/tasks" : "/portal/support"} /> : null}
      </section>

      <section className="demo-grid">
        <div className="demo-panel">
          <div className="demo-panel-head"><div><h3>Live Business Records</h3><p>Important records from your enabled modules.</p></div><a className="btn btn-sm" href="/portal/reports">View All</a></div>
          <div className="overflow-auto">
            <table className="demo-table">
              <thead><tr><th>Module</th><th>Record</th><th>Status</th><th>Owner</th><th>Value</th></tr></thead>
              <tbody>
                {records.length ? records.map((record) => (
                  <tr key={`${record.module}-${record.title}`} onClick={() => {}}>
                    <td><a href={record.href} className="text-[#28a486] font-black">{record.module}</a></td>
                    <td><a href={record.href}><b>{record.title}</b><div className="demo-record-sub">Click to open {record.module}</div></a></td>
                    <td><StatusPill status={record.status} /></td>
                    <td>{record.owner}</td>
                    <td><b>{record.value}</b></td>
                  </tr>
                )) : <tr><td colSpan={5}>No records yet. Start by creating your first customer, invoice or task.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
        <div className="demo-panel">
          <div className="demo-panel-head"><div><h3>Action Required</h3><p>Click an item to open its module.</p></div></div>
          <div className="demo-alert-list">
            {alerts.length ? alerts.map((alert) => <a key={alert.title} href={alert.href} className="demo-alert">{alert.title}<span>{alert.module}</span></a>) : <div className="demo-alert">No urgent alerts<span>Your workspace is clear.</span></div>}
          </div>
        </div>
      </section>

      <section className="demo-section-grid">
        <div className="demo-panel">
          <div className="demo-panel-head"><div><h3>Recent Activity</h3><p>Latest business movement across your system.</p></div></div>
          <div className="p-3 grid gap-2">
            {[...data.chat.slice(0, 3).map((row) => ({ title: row.subject || row.communication_type || row.name, sub: row.sender || "System", href: "/portal/chat" })), ...data.appointments.slice(0, 2).map((row) => ({ title: row.subject || row.name, sub: dateOnly(row.starts_on), href: "/portal/appointments" }))].slice(0, 5).map((item) => <a key={`${item.href}-${item.title}`} href={item.href} className="demo-record-card"><span className="demo-record-avatar">{initials(item.title)}</span><span><span className="demo-record-title">{item.title}</span><span className="demo-record-sub">{item.sub}</span></span></a>)}
          </div>
        </div>
        <div className="demo-panel">
          <div className="demo-panel-head"><div><h3>Quick Actions</h3><p>Daily business shortcuts.</p></div></div>
          <div className="p-4 demo-quick-actions">
            {moduleAllowed(active, "customers") ? <a href="/portal/customers">Add Customer<span className="demo-record-sub">Open customer module</span></a> : null}
            {moduleAllowed(active, "quotes") ? <a href="/portal/quotes">Create Quote<span className="demo-record-sub">Prepare proposal</span></a> : null}
            {moduleAllowed(active, "invoices") ? <a href="/portal/invoices">Create Invoice<span className="demo-record-sub">Bill your client</span></a> : null}
            {moduleAllowed(active, "documents") ? <a href="/portal/documents">Upload Document<span className="demo-record-sub">Attach files</span></a> : null}
          </div>
        </div>
      </section>
    </div>
  );
}
