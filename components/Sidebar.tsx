"use client";

import { usePathname } from "next/navigation";

interface SidebarProps {
  activeModules?: string[];
  companyName?: string;
  role?: string;
}

const GROUPS: { title: string; items: Array<{ label: string; href: string; icon: string; module?: string }> }[] = [
  {
    title: "Main",
    items: [
      { label: "Dashboard", href: "/portal", icon: "⊞" },
    ],
  },
  {
    title: "Finance",
    items: [
      { label: "Customers", href: "/portal/customers", icon: "👥", module: "customers" },
      { label: "Invoices", href: "/portal/invoices", icon: "📄", module: "invoices" },
      { label: "Quotes", href: "/portal/quotes", icon: "💬", module: "quotes" },
      { label: "Payments", href: "/portal/payments", icon: "💳", module: "payments" },
      { label: "Compliance", href: "/portal/compliance", icon: "⚖️", module: "compliance" },
    ],
  },
  {
    title: "Operations",
    items: [
      { label: "Suppliers", href: "/portal/suppliers", icon: "🚚", module: "suppliers" },
      { label: "Inventory", href: "/portal/items", icon: "📦", module: "items" },
      { label: "Projects", href: "/portal/projects", icon: "📊", module: "projects" },
      { label: "Tasks", href: "/portal/tasks", icon: "✅", module: "tasks" },
    ],
  },
  {
    title: "People",
    items: [
      { label: "Employees", href: "/portal/employees", icon: "👤", module: "employees" },
      { label: "Payroll", href: "/portal/payroll", icon: "💰", module: "payroll" },
      { label: "Leave", href: "/portal/leave", icon: "🏖️", module: "leave" },
    ],
  },
  {
    title: "Service",
    items: [
      { label: "Support", href: "/portal/support", icon: "🎧", module: "support" },
      { label: "Messages", href: "/portal/chat", icon: "✉️", module: "chat" },
      { label: "Appointments", href: "/portal/appointments", icon: "📅", module: "appointments" },
    ],
  },
  {
    title: "Account",
    items: [
      { label: "Reports", href: "/portal/reports", icon: "📈" },
      { label: "Billing", href: "/portal/billing", icon: "💳" },
      { label: "Settings", href: "/portal/settings", icon: "⚙️" },
    ],
  },
];

export default function Sidebar({ activeModules, companyName, role }: SidebarProps) {
  const pathname = usePathname();

  function isVisible(module?: string): boolean {
    if (!module) return true;
    if (!activeModules || activeModules.length === 0) return true;
    return activeModules.includes(module);
  }

  const isActive = (href: string) => {
    if (href === "/portal") return pathname === "/portal";
    return pathname.startsWith(href);
  };

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
        const visible = group.items.filter((item) => isVisible(item.module));
        if (visible.length === 0) return null;
        return (
          <div key={group.title}>
            <div className="nav-section">{group.title}</div>
            <nav className="nav">
              {visible.map((item) => (
                <a
                  key={item.href}
                  className={`nav-item ${isActive(item.href) ? "active" : ""}`}
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
