"use client";

import { usePathname } from "next/navigation";

const LABELS: Record<string, string> = {
  "/portal": "Dashboard",
  "/portal/customers": "Customers",
  "/portal/invoices": "Invoices",
  "/portal/quotes": "Quotes",
  "/portal/payments": "Payments",
  "/portal/compliance": "Compliance",
  "/portal/suppliers": "Suppliers",
  "/portal/items": "Inventory",
  "/portal/projects": "Projects",
  "/portal/tasks": "Tasks",
  "/portal/employees": "Employees",
  "/portal/payroll": "Payroll",
  "/portal/leave": "Leave",
  "/portal/support": "Support",
  "/portal/chat": "Messages",
  "/portal/appointments": "Appointments",
  "/portal/reports": "Reports",
  "/portal/settings": "Settings",
};

interface TopbarProps {
  plan?: string;
  companyName?: string;
}

export default function Topbar({ plan, companyName }: TopbarProps) {
  const pathname = usePathname() || "/portal";
  const label = LABELS[pathname] || "Portal";

  return (
    <div className="topbar">
      <div className="crumb">
        <span>Portal</span>
        <span style={{ color: "#CBD0DD" }}>›</span>
        <span className="now">{label}</span>
      </div>
      <div className="top-right">
        {plan && (
          <span className="tenant-chip">
            <span className="dot" />
            {plan} Plan
          </span>
        )}
        {companyName && (
          <span className="tenant-chip" style={{ gap: 6 }}>
            🏢 {companyName}
          </span>
        )}
        <div className="avatar">
          {companyName ? companyName.charAt(0).toUpperCase() : "U"}
        </div>
      </div>
    </div>
  );
}
