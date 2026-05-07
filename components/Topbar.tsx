"use client";
import { usePathname } from "next/navigation";
import { useState } from "react";
import NotificationBell from "@/components/notifications/NotificationBell";

const LABELS: Record<string,string> = {
  "/portal":"Dashboard","/portal/customers":"Customers","/portal/invoices":"Invoices","/portal/quotes":"Quotes","/portal/payments":"Payments","/portal/compliance":"Compliance","/portal/suppliers":"Suppliers","/portal/items":"Inventory","/portal/projects":"Projects","/portal/tasks":"Tasks","/portal/employees":"Employees","/portal/payroll":"Payroll","/portal/leave":"Leave","/portal/attendance":"Attendance","/portal/support":"Support","/portal/chat":"Messages","/portal/appointments":"Appointments","/portal/reports":"Reports","/portal/modules":"Modules","/portal/billing":"Billing","/portal/settings":"Profile & Settings","/portal/crm":"CRM Pipeline","/portal/leads":"Leads","/portal/opportunities":"Opportunities","/portal/sales-orders":"Sales Orders","/portal/contracts":"Contracts","/portal/campaigns":"Campaigns","/portal/finance":"Finance","/portal/vat":"VAT Returns","/portal/paye":"PAYE","/portal/uif":"UIF","/portal/sdl":"SDL","/portal/cipc":"CIPC","/portal/sars-profile":"SARS Profile","/portal/bank-reconciliation":"Bank Reconciliation","/portal/company-compliance":"Company Compliance","/portal/compliance-reminders":"Compliance Reminders","/portal/business-profile":"Business Profile","/portal/audit-trail":"Audit Trail","/portal/notifications":"Notifications"
};

export default function Topbar({ plan, companyName, companyLogo, role }: { plan?: string; companyName?: string; companyLogo?: string; role?: string }) {
  const pathname = usePathname() || "/portal";
  const label = LABELS[pathname] || "Portal";
  const [open, setOpen] = useState(false);
  const initials = companyName ? companyName.split(/\s+/).slice(0,2).map(w => w[0]).join("").toUpperCase() : "BS";
  return (
    <div className="topbar">
      <div className="crumb"><span>Business Suite</span><span className="sep">›</span><span className="now">{label}</span></div>
      <div className="top-right">
        <a className="tenant-chip" href="/portal/billing"><span className="dot" />{plan || "Starter"} Plan</a>
        <a className="tenant-chip" href="/portal/settings">{companyName || "Company Profile"}</a>
        <NotificationBell />
        <div className="me" onClick={() => setOpen(v => !v)} role="button" tabIndex={0}>
          {companyLogo ? <img className="me-avatar me-logo-img" src={companyLogo} alt={companyName || "Company logo"} /> : <div className="me-avatar">{initials}</div>}<div className="me-name">{companyName || "My Account"}</div>
          {open && <div className="profile-menu"><a href="/portal/settings"><strong>Profile & Settings</strong><span>Company, user and security details</span></a><a href="/portal/billing"><strong>Plan & Billing</strong><span>Plan, modules and invoices</span></a>{role === "admin" && <a href="/admin"><strong>Admin Dashboard</strong><span>Manage SaaS customers</span></a>}<a href="/api/auth/logout"><strong>Sign out</strong><span>Leave the portal safely</span></a></div>}
        </div>
      </div>
    </div>
  );
}
