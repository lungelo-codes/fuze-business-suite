"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  label: string;
  href: string;
  icon: string;
  module?: string;
  badge?: string;
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

interface SidebarProps {
  activeModules?: string[];
  companyName?: string;
  companyLogo?: string;
  role?: string;
  plan?: string;
  fullName?: string;
  isOpen?: boolean;
  onClose?: () => void;
  onCollapse?: () => void;
  theme?: "dark" | "light";
}

const ICONS: Record<string, string> = {
  dashboard: "⊞",
  crm: "◎",
  users: "👥",
  quote: "💬",
  invoice: "📄",
  chart: "📊",
  shield: "⚖️",
  folder: "📁",
  truck: "🚚",
  box: "📦",
  project: "◫",
  task: "✓",
  person: "👤",
  support: "🎧",
  mail: "✉️",
  calendar: "📅",
  settings: "⚙️",
  card: "💳",
  bank: "🏦",
};

const GROUPS: NavGroup[] = [
  {
    title: "Home",
    items: [{ label: "Dashboard", href: "/portal", icon: "dashboard" }],
  },
  {
    title: "CRM & Sales",
    items: [
      // Always visible: this is the main CRM dashboard/workspace.
      // Do not attach module: "crm" here, otherwise it disappears when the tenant has
      // leads/customers/quotes enabled but not the exact crm module key.
      { label: "CRM Workspace", href: "/portal/crm", icon: "crm" },
      { label: "Customers", href: "/portal/customers", icon: "users", module: "customers" },
      { label: "Contacts", href: "/portal/contacts", icon: "users", module: "customers" },
      { label: "Quotes", href: "/portal/quotes", icon: "quote", module: "quotes" },
      { label: "Sales Orders", href: "/portal/sales-orders", icon: "invoice", module: "sales-orders" },
      { label: "Contracts", href: "/portal/contracts", icon: "invoice", module: "contracts" },
    ],
  },
  {
    title: "Finance",
    items: [
      // Finance dashboard contains invoices, payments and banking as tabs/actions.
      { label: "Finance", href: "/portal/finance", icon: "chart", module: "payments" },
      { label: "Compliance", href: "/portal/compliance", icon: "shield", module: "compliance" },
    ],
  },
  {
    title: "Operations",
    items: [
      { label: "Documents", href: "/portal/documents", icon: "folder", module: "documents" },
      { label: "Suppliers", href: "/portal/suppliers", icon: "truck", module: "suppliers" },
      { label: "Purchase Orders", href: "/portal/purchase-orders", icon: "invoice", module: "purchase-orders" },
      { label: "Inventory", href: "/portal/items", icon: "box", module: "items" },
      { label: "Projects", href: "/portal/projects", icon: "project", module: "projects" },
      { label: "Tasks", href: "/portal/tasks", icon: "task", module: "tasks" },
    ],
  },
  {
    title: "People",
    items: [{ label: "HR", href: "/portal/hr", icon: "person", module: "employees" }],
  },
  {
    title: "Service",
    items: [
      { label: "Support", href: "/portal/support", icon: "support", module: "support" },
      { label: "Team Chat", href: "/portal/chat", icon: "mail", module: "chat" },
      { label: "Appointments", href: "/portal/appointments", icon: "calendar", module: "appointments" },
    ],
  },
  {
    title: "Account",
    items: [
      { label: "Reports", href: "/portal/reports", icon: "chart" },
      { label: "Business Profile", href: "/portal/business-profile", icon: "settings" },
      { label: "Modules", href: "/portal/modules", icon: "box" },
      { label: "Billing", href: "/portal/billing", icon: "card" },
      { label: "Settings", href: "/portal/settings", icon: "settings" },
    ],
  },
];

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function canShow(item: NavItem, activeModules?: string[]) {
  if (!item.module) return true;
  if (!activeModules || activeModules.length === 0) return true;

  const enabled = new Set(activeModules.map(normalize));
  const moduleKey = normalize(item.module);

  if (enabled.has(moduleKey)) return true;

  // Practical aliases from SaaS module names to sidebar keys.
  const aliases: Record<string, string[]> = {
    customers: ["crm", "sales", "crm-sales", "crm & sales"],
    quotes: ["crm", "sales", "crm-sales", "crm & sales"],
    "sales-orders": ["sales", "crm-sales", "crm & sales"],
    contracts: ["crm", "sales", "crm-sales", "crm & sales"],
    payments: ["finance", "accounting", "accounts"],
    compliance: ["finance", "accounting", "sa-compliance", "south african compliance"],
    documents: ["document", "document-management", "operations"],
    suppliers: ["procurement", "buying", "operations"],
    "purchase-orders": ["procurement", "buying", "operations"],
    items: ["inventory", "stock", "operations"],
    projects: ["project", "projects-tasks", "operations"],
    tasks: ["project", "projects", "projects-tasks", "operations"],
    employees: ["hr", "hr-payroll", "people"],
    support: ["helpdesk", "service", "support-desk"],
    chat: ["workspace", "team-chat", "messages"],
    appointments: ["calendar", "service", "projects", "crm"],
  };

  return (aliases[moduleKey] || []).some((alias) => enabled.has(alias));
}

function initials(name?: string) {
  if (!name) return "FD";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "FD";
}

export default function Sidebar({
  activeModules = [],
  companyName = "Fuze Business Suite",
  companyLogo,
  role,
  plan = "Growth",
  fullName,
  isOpen = false,
  onClose,
  onCollapse,
  theme = "light",
}: SidebarProps) {
  const pathname = usePathname();
  const visibleGroups = GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => canShow(item, activeModules)),
  })).filter((group) => group.items.length > 0);

  const sidebar = (
    <aside className="demo-sidebar" data-theme={theme}>
      <div className="demo-sidebar-brand">
        {companyLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="demo-brand-mark" src={companyLogo} alt={`${companyName} logo`} />
        ) : (
          <div className="demo-brand-mark">FD</div>
        )}
        <div>
          <div className="demo-brand-title">Business Suite</div>
          <div className="demo-brand-subtitle">{companyName}</div>
        </div>
      </div>

      <div className="demo-user-card">
        <div className="demo-avatar">{initials(fullName || companyName)}</div>
        <div>
          <div className="demo-user-name">{fullName || "Business User"}</div>
          <div className="demo-user-role">{role || "User"}</div>
        </div>
      </div>

      <nav className="demo-sidebar-nav">
        {role === "admin" && (
          <Link className="demo-nav-item demo-nav-admin" href="/admin" onClick={onClose}>
            <span className="demo-nav-icon">🛡</span>
            <span>Admin Dashboard</span>
          </Link>
        )}

        {visibleGroups.map((group) => (
          <div className="demo-nav-group" key={group.title}>
            <div className="demo-nav-heading">{group.title}</div>
            {group.items.map((item) => {
              const active = item.href === "/portal" ? pathname === "/portal" : pathname?.startsWith(item.href);
              return (
                <Link
                  key={`${group.title}-${item.href}`}
                  href={item.href}
                  onClick={onClose}
                  className={`demo-nav-item${active ? " active" : ""}`}
                >
                  <span className="demo-nav-icon">{ICONS[item.icon] || "•"}</span>
                  <span>{item.label}</span>
                  {item.badge && <span className="demo-nav-badge">{item.badge}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="demo-sidebar-footer">
        {onCollapse && (
          <button type="button" className="demo-plan-link" onClick={onCollapse}>
            Collapse menu
          </button>
        )}
        <div>
          <div className="demo-plan-label">{plan} Plan</div>
          <Link href="/portal/billing" onClick={onClose} className="demo-plan-link">
            Manage billing
          </Link>
        </div>
      </div>
    </aside>
  );

  return (
    <>
      <div className="demo-sidebar-desktop">{sidebar}</div>
      <div className={`demo-sidebar-mobile${isOpen ? " open" : ""}`}>
        <button className="demo-sidebar-backdrop" onClick={onClose} aria-label="Close menu" />
        {sidebar}
      </div>
    </>
  );
}
