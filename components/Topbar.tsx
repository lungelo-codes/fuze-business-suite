"use client";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import NotificationBell from "@/components/notifications/NotificationBell";

const LABELS: Record<string,string> = {
  "/portal":"Dashboard","/portal/customers":"Customers","/portal/contacts":"Contacts","/portal/invoices":"Invoices","/portal/quotes":"Quotes","/portal/payments":"Payments","/portal/compliance":"Compliance","/portal/suppliers":"Suppliers","/portal/items":"Inventory","/portal/projects":"Projects","/portal/tasks":"Tasks","/portal/employees":"Employees","/portal/payroll":"Payroll","/portal/leave":"Leave","/portal/attendance":"Attendance","/portal/support":"Support","/portal/chat":"Team Chat","/portal/appointments":"Appointments","/portal/reports":"Reports","/portal/modules":"Modules","/portal/billing":"Billing","/portal/settings":"Profile & Settings","/portal/crm":"CRM Workspace","/portal/leads":"Leads","/portal/opportunities":"Opportunities","/portal/sales-orders":"Sales Orders","/portal/contracts":"Contracts","/portal/campaigns":"Campaigns","/portal/finance":"Finance","/portal/vat":"VAT Returns","/portal/paye":"PAYE","/portal/uif":"UIF","/portal/sdl":"SDL","/portal/cipc":"CIPC","/portal/sars-profile":"SARS Profile","/portal/bank-reconciliation":"Banking","/portal/company-compliance":"Company Compliance","/portal/compliance-reminders":"Compliance Reminders","/portal/business-profile":"Business Profile","/portal/audit-trail":"Audit Trail","/portal/notifications":"Notifications","/portal/documents":"Documents"
};

const searchItems = [
  { type: "Customer", title: "Customer records", href: "/portal/customers" },
  { type: "CRM", title: "Lead pipeline", href: "/portal/crm" },
  { type: "Invoice", title: "Sales invoices", href: "/portal/invoices" },
  { type: "Finance", title: "Payments and banking", href: "/portal/finance" },
  { type: "Documents", title: "Google Drive and Dropbox", href: "/portal/documents" },
  { type: "Support", title: "Tickets and communication", href: "/portal/support" },
];

export default function Topbar({ plan, companyName, companyLogo, role, theme = "light", onToggleTheme }: { plan?: string; companyName?: string; companyLogo?: string; role?: string; theme?: "light" | "dark"; onToggleTheme?: () => void }) {
  const pathname = usePathname() || "/portal";
  const label = LABELS[pathname] || "Portal";
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const initials = companyName ? companyName.split(/\s+/).slice(0,2).map(w => w[0]).join("").toUpperCase() : "BS";
  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return searchItems;
    return searchItems.filter((item) => `${item.type} ${item.title}`.toLowerCase().includes(q));
  }, [search]);
  return (
    <div className="topbar demo-topbar">
      <div className="topbar-left">
        <div className="crumb"><span>Business Suite</span><span className="sep">›</span><span className="now">{label}</span></div>
        <h2 className="demo-top-title">{label}</h2>
      </div>
      <div className="top-search-wrap">
        <span className="search-shortcut">⌘K</span>
        <input value={search} onChange={(e) => { setSearch(e.target.value); setSearchOpen(true); }} onFocus={() => setSearchOpen(true)} placeholder="Global search: customers, invoices, leads..." />
        {searchOpen && <div className="search-popover"><div className="search-popover-head"><strong>Global Search</strong><span>Tenant-safe records</span></div>{results.map((item) => <a key={item.href} href={item.href} onClick={() => setSearchOpen(false)}><span><strong>{item.title}</strong><small>{item.type}</small></span><em>Open</em></a>)}</div>}
      </div>
      <div className="top-right">
        <div className="topbar-actions">
          <a className="shell-action-primary" href="/portal/crm">+ New</a>
          <a className="shell-action-ghost" href="/portal/settings">Customize</a>
        </div>
        <button type="button" className="theme-toggle" onClick={onToggleTheme}>{theme === "dark" ? "Light" : "Dark"}</button>
        <a className="tenant-chip" href="/portal/billing"><span className="dot" />{plan || "Starter"}</a>
        <NotificationBell />
        <div className="me" onClick={() => setOpen(v => !v)} role="button" tabIndex={0}>
          {companyLogo ? <img className="me-avatar me-logo-img" src={companyLogo} alt={companyName || "Company logo"} /> : <div className="me-avatar">{initials}</div>}<div className="me-name">{companyName || "My Account"}</div>
          {open && <div className="profile-menu"><a href="/portal/settings"><strong>Profile & Settings</strong><span>Company, user and security details</span></a><a href="/portal/billing"><strong>Plan & Billing</strong><span>Plan, modules and invoices</span></a>{role === "admin" && <a href="/admin"><strong>Admin Dashboard</strong><span>Manage SaaS customers</span></a>}<a href="/api/auth/logout"><strong>Sign out</strong><span>Leave the portal safely</span></a></div>}
        </div>
      </div>
    </div>
  );
}
