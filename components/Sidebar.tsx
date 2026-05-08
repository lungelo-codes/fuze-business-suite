"use client";
import { usePathname } from "next/navigation";

interface SidebarProps {
  activeModules?: string[];
  companyName?: string;
  companyLogo?: string;
  role?: string;
  plan?: string;
  theme?: "light" | "dark";
  onCollapse?: () => void;
}

type NavItem = { label: string; href: string; icon: string; module?: string; badge?: string };
type NavGroup = { title: string; items: NavItem[] };

function Icon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    dashboard: "M3 13h8V3H3v10Zm10 8h8V3h-8v18ZM3 21h8v-6H3v6Z",
    users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
    invoice: "M14 2H6a2 2 0 0 0-2 2v16l4-2 4 2 4-2 4 2V8l-6-6ZM14 2v6h6M8 13h8M8 17h6",
    quote: "M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z",
    chart: "M3 3v18h18M7 16l4-4 3 3 5-8",
    card: "M3 7h18v10H3zM3 10h18",
    bank: "M3 10h18M5 10V7l7-4 7 4v3M6 10v8M10 10v8M14 10v8M18 10v8M4 18h16",
    shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z",
    crm: "M4 19V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14M8 7h8M8 11h8M8 15h4",
    target: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12ZM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z",
    truck: "M3 7h11v8H3zM14 10h4l3 3v2h-7zM7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z",
    box: "M21 8l-9-5-9 5 9 5 9-5ZM3 8v8l9 5 9-5V8M12 13v8",
    project: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
    task: "M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11",
    person: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8",
    calendar: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z",
    support: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9 10a3 3 0 0 1 6 0c0 2-3 2-3 4M12 18h.01",
    mail: "M4 4h16v16H4zM4 7l8 6 8-6",
    folder: "M3 6a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6Z",
    settings: "M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5ZM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.65 1.65 0 0 0 15 19.4a1.65 1.65 0 0 0-1 .6 1.65 1.65 0 0 0-.4 1.1V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 8 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-.6-1 1.65 1.65 0 0 0-1.1-.4H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 8a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-.6 1.65 1.65 0 0 0 .4-1.1V3a2 2 0 1 1 4 0v.09A1.65 1.65 0 0 0 15 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06A2 2 0 1 1 19.73 7.1l-.06.06A1.65 1.65 0 0 0 19.4 9c.14.32.35.6.6.82.3.25.68.39 1.1.39H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51.79Z",
    default: "M12 2v20M2 12h20"
  };
  return <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name] || paths.default} /></svg>;
}

const GROUPS: NavGroup[] = [
  { title: "Home", items: [{ label: "Executive Dashboard", href: "/portal", icon: "dashboard" }] },
  { title: "CRM & Sales", items: [
    { label: "CRM Workspace", href: "/portal/crm", icon: "crm", module: "crm" },
    { label: "Leads", href: "/portal/leads", icon: "target", module: "leads" },
    { label: "Opportunities", href: "/portal/opportunities", icon: "target", module: "opportunities" },
    { label: "Customers", href: "/portal/customers", icon: "users", module: "customers" },
    { label: "Contacts", href: "/portal/contacts", icon: "users", module: "customers" },
    { label: "Quotes", href: "/portal/quotes", icon: "quote", module: "quotes" },
    { label: "Sales Orders", href: "/portal/sales-orders", icon: "invoice", module: "sales-orders" },
    { label: "Contracts", href: "/portal/contracts", icon: "invoice", module: "contracts" },
    { label: "Campaigns", href: "/portal/campaigns", icon: "mail", module: "campaigns" },
  ]},
  { title: "Finance", items: [
    { label: "Finance Dashboard", href: "/portal/finance", icon: "chart", module: "payments" },
    { label: "Invoices", href: "/portal/invoices", icon: "invoice", module: "invoices" },
    { label: "Payments", href: "/portal/payments", icon: "card", module: "payments" },
    { label: "Banking", href: "/portal/bank-reconciliation", icon: "bank", module: "payments" },
    { label: "Compliance", href: "/portal/compliance", icon: "shield", module: "compliance" },
    { label: "VAT", href: "/portal/vat", icon: "invoice", module: "compliance" },
    { label: "PAYE", href: "/portal/paye", icon: "card", module: "compliance" },
    { label: "UIF", href: "/portal/uif", icon: "card", module: "compliance" },
    { label: "SDL", href: "/portal/sdl", icon: "card", module: "compliance" },
    { label: "CIPC", href: "/portal/cipc", icon: "shield", module: "compliance" },
  ]},
  { title: "Operations", items: [
    { label: "Documents", href: "/portal/documents", icon: "folder", module: "documents", badge: "Paid" },
    { label: "Suppliers", href: "/portal/suppliers", icon: "truck", module: "suppliers" },
    { label: "Purchase Orders", href: "/portal/purchase-orders", icon: "invoice", module: "purchase-orders" },
    { label: "Inventory", href: "/portal/items", icon: "box", module: "items" },
    { label: "Projects", href: "/portal/projects", icon: "project", module: "projects" },
    { label: "Tasks", href: "/portal/tasks", icon: "task", module: "tasks" },
  ]},
  { title: "People", items: [
    { label: "Employees", href: "/portal/employees", icon: "person", module: "employees" },
    { label: "Payroll", href: "/portal/payroll", icon: "card", module: "payroll" },
    { label: "Leave", href: "/portal/leave", icon: "calendar", module: "leave" },
    { label: "Attendance", href: "/portal/attendance", icon: "task", module: "attendance" },
  ]},
  { title: "Service", items: [
    { label: "Support", href: "/portal/support", icon: "support", module: "support" },
    { label: "Team Chat", href: "/portal/chat", icon: "mail", module: "chat" },
    { label: "Appointments", href: "/portal/appointments", icon: "calendar", module: "appointments" },
  ]},
  { title: "Account", items: [
    { label: "Reports", href: "/portal/reports", icon: "chart" },
    { label: "Business Profile", href: "/portal/business-profile", icon: "settings" },
    { label: "Modules", href: "/portal/modules", icon: "box" },
    { label: "Billing", href: "/portal/billing", icon: "card" },
    { label: "Settings", href: "/portal/settings", icon: "settings" },
  ]},
];

export default function Sidebar({ activeModules = [], companyName, companyLogo, role, plan, theme = "light", onCollapse }: SidebarProps) {
  const pathname = usePathname();
  const activeSet = new Set(activeModules);
  function isVisible(module?: string): boolean { return !module || activeSet.has(module); }
  const isActive = (href: string) => href === "/portal" ? pathname === "/portal" : pathname.startsWith(href);

  return (
    <aside className="sidebar demo-sidebar">
      <div className="brand demo-brand">
        {companyLogo ? <img className="brand-logo-img" src={companyLogo} alt={companyName || "Company logo"} /> : <div className="brand-mark demo-brand-mark">BS</div>}
        <div className="brand-copy"><div className="brand-name">Business Suite</div><div className="brand-sub">{companyName || "Business portal"}</div></div>
        {onCollapse && <button type="button" className="sidebar-collapse" aria-label="Hide main menu" title="Hide menu" onClick={onCollapse}>☰</button>}
      </div>
      {role === "admin" && <div className="nav admin-nav"><a className="nav-item" href="/admin"><Icon name="shield" />Admin Dashboard</a></div>}
      <div className="demo-nav-scroll">
        {GROUPS.map(group => {
          const visible = group.items.filter(item => isVisible(item.module));
          if (!visible.length) return null;
          return <div key={group.title} className="demo-nav-group"><div className="nav-section">{group.title}</div><nav className="nav">{visible.map(item => <a key={item.href} className={`nav-item ${isActive(item.href) ? "active" : ""}`} href={item.href}><Icon name={item.icon} /><span>{item.label}</span>{item.badge && <span className="nav-badge">{item.badge}</span>}</a>)}</nav></div>;
        })}
      </div>
      <div className="subscription-card demo-subscription-card"><div className="subscription-top"><div><div className="subscription-plan">{plan || "Starter"}</div><div className="subscription-muted">{activeModules.length} active modules</div></div><span className="subscription-status">Active</span></div><div className="subscription-progress"><span /></div><a className="subscription-button" href="/portal/billing">Manage Subscription</a></div><div className="demo-signout"><a className="nav-item" href="/api/auth/logout"><Icon name="default" />Sign Out</a></div>
    </aside>
  );
}
