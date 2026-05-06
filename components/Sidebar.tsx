"use client";

import { usePathname } from "next/navigation";
<<<<<<< HEAD
=======
import { ALL_MODULES, ModuleDef } from "@/lib/modules";

const ALWAYS_SHOWN = ["Dashboard", "Settings"];
>>>>>>> cf61deae7e9ae9ce94e63e1c2a3bf16b7d6e37af

interface SidebarProps {
  activeModules?: string[];
  companyName?: string;
  role?: string;
}

<<<<<<< HEAD
const GROUPS: { title: string; items: Array<{ label: string; href: string; icon: string; module?: string }> }[] = [
=======
const GROUPS: { title: string; items: Array<{ label: string; href: string; icon: string }> }[] = [
>>>>>>> cf61deae7e9ae9ce94e63e1c2a3bf16b7d6e37af
  {
    title: "Main",
    items: [
      { label: "Dashboard", href: "/portal", icon: "⊞" },
    ],
  },
  {
    title: "Finance",
    items: [
<<<<<<< HEAD
      { label: "Customers", href: "/portal/customers", icon: "👥", module: "customers" },
      { label: "Invoices", href: "/portal/invoices", icon: "📄", module: "invoices" },
      { label: "Quotes", href: "/portal/quotes", icon: "💬", module: "quotes" },
      { label: "Payments", href: "/portal/payments", icon: "💳", module: "payments" },
      { label: "Compliance", href: "/portal/compliance", icon: "⚖️", module: "compliance" },
=======
      { label: "Customers", href: "/portal/customers", icon: "👥" },
      { label: "Invoices", href: "/portal/invoices", icon: "📄" },
      { label: "Quotes", href: "/portal/quotes", icon: "💬" },
      { label: "Payments", href: "/portal/payments", icon: "💳" },
      { label: "Compliance", href: "/portal/compliance", icon: "⚖️" },
>>>>>>> cf61deae7e9ae9ce94e63e1c2a3bf16b7d6e37af
    ],
  },
  {
    title: "Operations",
    items: [
<<<<<<< HEAD
      { label: "Suppliers", href: "/portal/suppliers", icon: "🚚", module: "suppliers" },
      { label: "Inventory", href: "/portal/items", icon: "📦", module: "items" },
      { label: "Projects", href: "/portal/projects", icon: "📊", module: "projects" },
      { label: "Tasks", href: "/portal/tasks", icon: "✅", module: "tasks" },
=======
      { label: "Suppliers", href: "/portal/suppliers", icon: "🚚" },
      { label: "Inventory", href: "/portal/items", icon: "📦" },
      { label: "Projects", href: "/portal/projects", icon: "📊" },
      { label: "Tasks", href: "/portal/tasks", icon: "✅" },
>>>>>>> cf61deae7e9ae9ce94e63e1c2a3bf16b7d6e37af
    ],
  },
  {
    title: "People",
    items: [
<<<<<<< HEAD
      { label: "Employees", href: "/portal/employees", icon: "👤", module: "employees" },
      { label: "Payroll", href: "/portal/payroll", icon: "💰", module: "payroll" },
      { label: "Leave", href: "/portal/leave", icon: "🏖️", module: "leave" },
=======
      { label: "Employees", href: "/portal/employees", icon: "👤" },
      { label: "Payroll", href: "/portal/payroll", icon: "💰" },
      { label: "Leave", href: "/portal/leave", icon: "🏖️" },
>>>>>>> cf61deae7e9ae9ce94e63e1c2a3bf16b7d6e37af
    ],
  },
  {
    title: "Service",
    items: [
<<<<<<< HEAD
      { label: "Support", href: "/portal/support", icon: "🎧", module: "support" },
      { label: "Messages", href: "/portal/chat", icon: "✉️", module: "chat" },
      { label: "Appointments", href: "/portal/appointments", icon: "📅", module: "appointments" },
=======
      { label: "Support", href: "/portal/support", icon: "🎧" },
      { label: "Messages", href: "/portal/chat", icon: "✉️" },
      { label: "Appointments", href: "/portal/appointments", icon: "📅" },
>>>>>>> cf61deae7e9ae9ce94e63e1c2a3bf16b7d6e37af
    ],
  },
  {
    title: "Account",
    items: [
      { label: "Reports", href: "/portal/reports", icon: "📈" },
<<<<<<< HEAD
      { label: "Billing", href: "/portal/billing", icon: "💳" },
=======
>>>>>>> cf61deae7e9ae9ce94e63e1c2a3bf16b7d6e37af
      { label: "Settings", href: "/portal/settings", icon: "⚙️" },
    ],
  },
];

<<<<<<< HEAD
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

=======
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

>>>>>>> cf61deae7e9ae9ce94e63e1c2a3bf16b7d6e37af
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
<<<<<<< HEAD
        const visible = group.items.filter((item) => isVisible(item.module));
=======
        const visible = group.items.filter((item) => isVisible(item.href));
>>>>>>> cf61deae7e9ae9ce94e63e1c2a3bf16b7d6e37af
        if (visible.length === 0) return null;
        return (
          <div key={group.title}>
            <div className="nav-section">{group.title}</div>
            <nav className="nav">
              {visible.map((item) => (
                <a
                  key={item.href}
<<<<<<< HEAD
                  className={`nav-item ${isActive(item.href) ? "active" : ""}`}
=======
                  className={`nav-item ${pathname === item.href ? "active" : ""}`}
>>>>>>> cf61deae7e9ae9ce94e63e1c2a3bf16b7d6e37af
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
