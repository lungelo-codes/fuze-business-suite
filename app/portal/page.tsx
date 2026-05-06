import type { ReactNode } from "react";
import KPI from "@/components/KPI";
import SimpleTable, { StatusCell } from "@/components/SimpleTable";
import { getDashboardData } from "@/lib/server/data";
import { money } from "@/lib/mappers";
import type {
  AppointmentRecord,
  CommunicationRecord,
  ComplianceRecord,
  DashboardData,
  InvoiceRecord,
  SupportTicket,
  TaskRecord
} from "@/lib/types";

function isOpenStatus(status?: string): boolean {
  const value = (status || "").toLowerCase();
  return value.includes("open") || value.includes("progress") || value.includes("waiting") || value.includes("overdue");
}

function dateOnly(value?: string): string {
  if (!value) return "-";
  return value.split(" ")[0]?.split("T")[0] || value;
}

function timeOnly(value?: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) return date.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" });
  const parts = value.split(" ");
  return parts.length > 1 ? parts[1].slice(0, 5) : "";
}

function initials(value?: string): string {
  const text = value || "FB";
  return text.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() || "").join("") || "FB";
}

function EmptyList({ label }: { label: string }) {
  return <div className="empty">{label}</div>;
}

function ListRow({ title, subtitle, status, href, avatar }: { title: string; subtitle?: string; status?: string; href?: string; avatar?: string }) {
  const body = (
    <div className="list-row">
      <div className="avi">{initials(avatar || title)}</div>
      <div>
        <div className="t">{title}</div>
        <div className="s">{subtitle || "-"}</div>
      </div>
      {status ? <div className="r"><StatusCell status={status} /></div> : null}
    </div>
  );
  return href ? <a href={href}>{body}</a> : body;
}

function SectionCard({ title, href, actionLabel = "View All", children }: { title: string; href?: string; actionLabel?: string; children: ReactNode }) {
  return (
    <div className="card">
      <div className="card-head">
        <h3>{title}</h3>
        {href ? <a className="btn btn-sm" href={href}>{actionLabel}</a> : null}
      </div>
      {children}
    </div>
  );
}

function DashboardQuickActions() {
  const actions = [
    { label: "Create Support Ticket", href: "/portal/support", icon: "🎧" },
    { label: "Book Appointment", href: "/portal/appointments", icon: "📅" },
    { label: "Send Message", href: "/portal/chat", icon: "✉️" },
    { label: "View Reports", href: "/portal/reports", icon: "📈" }
  ];
  return (
    <div className="card card-pad mb">
      <div className="toolbar" style={{ marginBottom: 0 }}>
        {actions.map((action) => (
          <a className="btn" href={action.href} key={action.href}><span>{action.icon}</span>{action.label}</a>
        ))}
      </div>
    </div>
  );
}

function ModuleOverview({ data }: { data: DashboardData }) {
  const modules = [
    { label: "Customers", value: data.customers.length, href: "/portal/customers", icon: "👥" },
    { label: "Invoices", value: data.invoices.length, href: "/portal/invoices", icon: "📄" },
    { label: "Quotes", value: data.quotes.length, href: "/portal/quotes", icon: "💬" },
    { label: "Payments", value: data.payments.length, href: "/portal/payments", icon: "💳" },
    { label: "Projects", value: data.projects.length, href: "/portal/projects", icon: "📊" },
    { label: "Tasks", value: data.tasks.length, href: "/portal/tasks", icon: "✅" },
    { label: "Support", value: data.support.length, href: "/portal/support", icon: "🎧" },
    { label: "Appointments", value: data.appointments.length, href: "/portal/appointments", icon: "📅" }
  ];
  return (
    <SectionCard title="Business Modules">
      <div className="card-body">
        <div className="module-cards">
          {modules.map((module) => (
            <a className="module-card" href={module.href} key={module.href}>
              <span className="module-icon">{module.icon}</span>
              <span><span className="module-name">{module.label}</span><span className="module-desc">{module.value} records</span></span>
            </a>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}

function SupportList({ support }: { support: SupportTicket[] }) {
  return <div className="list">{support.slice(0, 6).map((item) => <ListRow key={item.name} title={item.subject || item.name} subtitle={`${item.customer || item.raised_by || "Customer"} • ${item.priority || "Normal"} • ${dateOnly(item.opening_date || item.modified)}`} status={item.status} href="/portal/support" avatar={item.customer || item.raised_by || item.subject} />)}{support.length === 0 ? <EmptyList label="No support tickets." /> : null}</div>;
}

function AppointmentList({ appointments }: { appointments: AppointmentRecord[] }) {
  return <div className="list">{appointments.slice(0, 6).map((item) => <ListRow key={item.name} title={item.subject || item.name} subtitle={`${dateOnly(item.starts_on)} ${timeOnly(item.starts_on)}${item.event_type ? ` • ${item.event_type}` : ""}`} status={item.status} href="/portal/appointments" avatar={item.subject} />)}{appointments.length === 0 ? <EmptyList label="No appointments." /> : null}</div>;
}

function TaskList({ tasks }: { tasks: TaskRecord[] }) {
  return <div className="list">{tasks.slice(0, 6).map((item) => <ListRow key={item.name} title={item.subject || item.name} subtitle={`${item.project || "No project"} • Due ${dateOnly(item.exp_end_date || item.modified)}`} status={item.status || item.priority} href="/portal/tasks" avatar={item.subject} />)}{tasks.length === 0 ? <EmptyList label="No tasks." /> : null}</div>;
}

function CommunicationList({ chat }: { chat: CommunicationRecord[] }) {
  return <div className="list">{chat.slice(0, 6).map((item) => <ListRow key={item.name} title={item.subject || item.communication_type || item.name} subtitle={`${item.sender || "System"} • ${dateOnly(item.creation || item.modified)}`} href="/portal/chat" avatar={item.sender || item.subject} />)}{chat.length === 0 ? <EmptyList label="No messages." /> : null}</div>;
}

function ComplianceList({ compliance }: { compliance: ComplianceRecord[] }) {
  return <div className="list">{compliance.slice(0, 6).map((item) => <ListRow key={`${item.kind}-${item.name}`} title={`${item.kind} • ${item.name}`} subtitle={`${item.company || "Company"} • Due ${dateOnly(item.due_date)}`} status={item.status} href="/portal/compliance" avatar={item.kind} />)}{compliance.length === 0 ? <EmptyList label="No compliance records." /> : null}</div>;
}

function RecentInvoices({ invoices }: { invoices: InvoiceRecord[] }) {
  return (
    <SectionCard title="Recent Invoices" href="/portal/invoices">
      <div className="card-body">
        <SimpleTable
          data={invoices.slice(0, 8)}
          columns={[
            { key: "name", label: "Invoice" },
            { key: "customer", label: "Customer" },
            { key: "posting_date", label: "Date", render: (row) => dateOnly(row.posting_date) },
            { key: "grand_total", label: "Total", render: (row) => money(row.grand_total) },
            { key: "status", label: "Status", render: (row) => <StatusCell status={row.status} /> }
          ]}
        />
      </div>
    </SectionCard>
  );
}

export default async function DashboardPage() {
  const data = await getDashboardData();
  const totalRevenue = data.invoices.reduce((sum, invoice) => sum + (invoice.grand_total ?? 0), 0);
  const outstanding = data.invoices.reduce((sum, invoice) => sum + (invoice.outstanding_amount ?? 0), 0);
  const openSupport = data.support.filter((ticket) => isOpenStatus(ticket.status)).length;
  const upcomingAppointments = data.appointments.filter((item) => {
    if (!item.starts_on) return false;
    const startsOn = new Date(item.starts_on);
    return !Number.isNaN(startsOn.getTime()) && startsOn >= new Date();
  }).length;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Customer Dashboard</h1>
          <div className="page-sub">Business overview, support, appointments, tasks, finance, and compliance from ERPNext.</div>
        </div>
        <div className="row"><a className="btn" href="/portal/appointments">+ Appointment</a><a className="btn btn-primary" href="/portal/support">+ Support Ticket</a></div>
      </div>
      <div className="kpi-grid">
        <KPI label="Revenue" value={money(totalRevenue)} hint="Sales invoices" icon="R" />
        <KPI label="Outstanding" value={money(outstanding)} hint="Unpaid balance" tone="warn" icon="O" />
        <KPI label="Open Support" value={openSupport} hint="Tickets needing attention" tone="purple" icon="S" />
        <KPI label="Appointments" value={upcomingAppointments} hint="Upcoming scheduled events" tone="teal" icon="A" />
      </div>
      <DashboardQuickActions />
      <div className="two-col"><RecentInvoices invoices={data.invoices} /><SectionCard title="Support Tickets" href="/portal/support"><SupportList support={data.support} /></SectionCard></div>
      <div className="three-col mb"><SectionCard title="Appointments" href="/portal/appointments"><AppointmentList appointments={data.appointments} /></SectionCard><SectionCard title="Tasks" href="/portal/tasks"><TaskList tasks={data.tasks} /></SectionCard><SectionCard title="Messages" href="/portal/chat"><CommunicationList chat={data.chat} /></SectionCard></div>
      <div className="two-col"><ModuleOverview data={data} /><SectionCard title="Compliance Watch" href="/portal/compliance" actionLabel="Open"><ComplianceList compliance={data.compliance} /></SectionCard></div>
      <div className="banner info mt">This dashboard follows the uploaded HTML prototype structure: KPI tiles, quick actions, service lists, calendar/appointments, support tickets, communications, and module cards.</div>
    </div>
  );
}
