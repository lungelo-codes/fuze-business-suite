"use client";

import { usePathname } from "next/navigation";
import { ALL_MODULES, ModuleDef } from "@/lib/modules";

const ALWAYS_SHOWN = ["Dashboard", "Settings"];

interface SidebarProps {
  activeModules?: string[];
  companyName?: string;
  role?: string;
}

const GROUPS: { title: string; items: Array<{ label: string; href: string; icon: string }> }[] = [
  {
    title: "Main",
    items: [
      { label: "Dashboard", href: "/portal", icon: "⊞" },
    ],
  },
  {
    title: "Finance",
    items: [
      { label: "Customers", href: "/portal/customers", icon: "👥" },
      { label: "Invoices", href: "/portal/invoices", icon: "📄" },
      { label: "Quotes", href: "/portal/quotes", icon: "💬" },
      { label: "Payments", href: "/portal/payments", icon: "💳" },
      { label: "Compliance", href: "/portal/compliance", icon: "⚖️" },
    ],
  },
  {
    title: "Operations",
    items: [
      { label: "Suppliers", href: "/portal/suppliers", icon: "🚚" },
      { label: "Inventory", href: "/portal/items", icon: "📦" },
      { label: "Projects", href: "/portal/projects", icon: "📊" },
      { label: "Tasks", href: "/portal/tasks", icon: "✅" },
    ],
  },
  {
    title: "People",
    items: [
      { label: "Employees", href: "/portal/employees", icon: "👤" },
      { label: "Payroll", href: "/portal/payroll", icon: "💰" },
      { label: "Leave", href: "/portal/leave", icon: "🏖️" },
    ],
  },
  {
    title: "Service",
    items: [
      { label: "Support", href: "/portal/support", icon: "🎧" },
      { label: "Messages", href: "/portal/chat", icon: "✉️" },
      { label: "Appointments", href: "/portal/appointments", icon: "📅" },
    ],
  },
  {
    title: "Account",
    items: [
      { label: "Reports", href: "/portal/reports", icon: "📈" },
      { label: "Settings", href: "/portal/settings", icon: "⚙️" },
    ],
  },
];

// Map href → module id
const HREF_TO_MODULE: Record<string, string> = {
  "/portal/customers": "customers",
  "/portal/invoices": "invoices",
  "/portal/quotes": "quotes",
  "/portal/payments": "payments",
  "/portal/compliance": "compliance",
  "/portal/suppliers": "suppliers",
  "/portal/items": "items",
  "/portal/projects": "projects",
  "/portal/tasks": "tasks",
  "/portal/employees": "employees",
  "/portal/payroll": "payroll",
  "/portal/leave": "leave",
  "/portal/support": "support",
  "/portal/chat": "chat",
  "/portal/appointments": "appointments",
};

export default function Sidebar({ activeModules, companyName, role }: SidebarProps) {
  const pathname = usePathname();

  function isVisible(href: string): boolean {
    // Dashboard, Reports, Settings are always visible
    if (!HREF_TO_MODULE[href]) return true;
    // If no module list specified, show all (admin view)
    if (!activeModules || activeModules.length === 0) return true;
    return activeModules.includes(HREF_TO_MODULE[href]);
  }

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">FB</div>
        <div>
          <div className="brand-name">Fuze Business Suite</div>
          <div className="brand-sub">{companyName || "Customer portal"}</div>
        </div>
      </div>

      {role === "admin" && (
        <div style={{ padding: "8px 10px" }}>
          <a
            href="/admin"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 10px",
              borderRadius: 8,
              background: "rgba(220,53,69,.08)",
              color: "#DC3545",
              fontSize: 13,
              fontWeight: 700,
              marginBottom: 4,
            }}
          >
            🛡 Admin Dashboard
          </a>
        </div>
      )}

      {GROUPS.map((group) => {
        const visible = group.items.filter((item) => isVisible(item.href));
        if (visible.length === 0) return null;
        return (
          <div key={group.title}>
            <div className="nav-section">{group.title}</div>
            <nav className="nav">
              {visible.map((item) => (
                <a
                  key={item.href}
                  className={`nav-item ${pathname === item.href ? "active" : ""}`}
                  href={item.href}
                >
                  <span style={{ fontSize: 15 }}>{item.icon}</span>
                  {item.label}
                </a>
              ))}
            </nav>
          </div>
        );
      })}
    </aside>
  );
}
