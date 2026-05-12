"use client";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

interface ConciseSidebarProps {
  activeModules?: string[];
  companyName?: string;
  companyLogo?: string;
  role?: string;
  plan?: string;
  theme?: "light" | "dark";
  onCollapse?: () => void;
}

/* ── SVG icon renderer (reusing original icon paths) ── */
function Icon({ name, size = 16 }: { name: string; size?: number }) {
  const paths: Record<string, string> = {
    dashboard: "M3 13h8V3H3v10Zm10 8h8V3h-8v18ZM3 21h8v-6H3v6Z",
    crm: "M4 19V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14M8 7h8M8 11h8M8 15h4",
    sales: "M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z",
    finance: "M14 2H6a2 2 0 0 0-2 2v16l4-2 4 2 4-2 4 2V8l-6-6ZM14 2v6h6M8 13h8M8 17h6",
    procurement: "M3 7h11v8H3zM14 10h4l3 3v2h-7zM7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z",
    projects: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
    hr: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8",
    support: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9 10a3 3 0 0 1 6 0c0 2-3 2-3 4M12 18h.01",
    reports: "M3 3v18h18M7 16l4-4 3 3 5-8",
    settings: "M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5ZM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.65 1.65 0 0 0 15 19.4a1.65 1.65 0 0 0-1 .6 1.65 1.65 0 0 0-.4 1.1V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 8 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-.6-1 1.65 1.65 0 0 0-1.1-.4H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 8a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-.6 1.65 1.65 0 0 0 .4-1.1V3a2 2 0 1 1 4 0v.09A1.65 1.65 0 0 0 15 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06A2 2 0 1 1 19.73 7.1l-.06.06A1.65 1.65 0 0 0 19.4 9c.14.32.35.6.6.82.3.25.68.39 1.1.39H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51.79Z",
    shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z",
    logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
    chevron: "M6 9l6 6 6-6",
    target: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12ZM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z",
    users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
    invoice: "M14 2H6a2 2 0 0 0-2 2v16l4-2 4 2 4-2 4 2V8l-6-6ZM14 2v6h6M8 13h8M8 17h6",
    card: "M3 7h18v10H3zM3 10h18",
    task: "M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11",
    calendar: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z",
    box: "M21 8l-9-5-9 5 9 5 9-5ZM3 8v8l9 5 9-5V8M12 13v8",
    quote: "M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z",
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
    >
      <path d={paths[name] || paths.dashboard} />
    </svg>
  );
}

/* ── 10 nav groups ── */
interface SubItem {
  label: string;
  href: string;
  icon: string;
  module?: string;
}

interface NavGroup {
  id: string;
  label: string;
  icon: string;
  href: string;          // primary href (group root)
  subs: SubItem[];
}

const NAV: NavGroup[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: "dashboard",
    href: "/portal",
    subs: [],
  },
  {
    id: "crm",
    label: "CRM",
    icon: "crm",
    href: "/portal/crm",
    subs: [
      { label: "Pipeline", href: "/portal/crm", icon: "target", module: "crm" },
      { label: "Leads", href: "/portal/leads", icon: "target", module: "leads" },
      { label: "Customers", href: "/portal/customers", icon: "users", module: "customers" },
      { label: "Contacts", href: "/portal/contacts", icon: "users", module: "customers" },
    ],
  },
  {
    id: "sales",
    label: "Sales",
    icon: "sales",
    href: "/portal/quotes",
    subs: [
      { label: "Quotations", href: "/portal/quotes", icon: "quote", module: "quotes" },
      { label: "Sales Orders", href: "/portal/sales-orders", icon: "invoice", module: "sales-orders" },
      { label: "Products", href: "/portal/items", icon: "box", module: "items" },
    ],
  },
  {
    id: "finance",
    label: "Finance",
    icon: "finance",
    href: "/portal/finance",
    subs: [
      { label: "Invoices", href: "/portal/invoices", icon: "invoice", module: "invoices" },
      { label: "Bills", href: "/portal/payments", icon: "card", module: "payments" },
      { label: "Payments", href: "/portal/payments", icon: "card", module: "payments" },
      { label: "VAT", href: "/portal/vat", icon: "shield", module: "compliance" },
      { label: "PAYE", href: "/portal/paye", icon: "shield", module: "compliance" },
      { label: "CIPC", href: "/portal/cipc", icon: "shield", module: "compliance" },
    ],
  },
  {
    id: "procurement",
    label: "Procurement",
    icon: "procurement",
    href: "/portal/purchase-orders",
    subs: [
      { label: "Purchase Orders", href: "/portal/purchase-orders", icon: "invoice", module: "purchase-orders" },
      { label: "Suppliers", href: "/portal/suppliers", icon: "procurement", module: "suppliers" },
    ],
  },
  {
    id: "projects",
    label: "Projects",
    icon: "projects",
    href: "/portal/projects",
    subs: [
      { label: "Projects", href: "/portal/projects", icon: "projects", module: "projects" },
      { label: "Tasks", href: "/portal/tasks", icon: "task", module: "tasks" },
    ],
  },
  {
    id: "hr",
    label: "HR",
    icon: "hr",
    href: "/portal/employees",
    subs: [
      { label: "Employees", href: "/portal/employees", icon: "hr", module: "employees" },
      { label: "Leave", href: "/portal/leave", icon: "calendar", module: "leave" },
      { label: "Attendance", href: "/portal/attendance", icon: "task", module: "attendance" },
      { label: "Payroll", href: "/portal/payroll", icon: "card", module: "payroll" },
    ],
  },
  {
    id: "support",
    label: "Support",
    icon: "support",
    href: "/portal/support",
    subs: [
      { label: "Help Tickets", href: "/portal/support", icon: "support", module: "support" },
    ],
  },
  {
    id: "reports",
    label: "Insights",
    icon: "reports",
    href: "/portal/reports",
    subs: [],
  },
  {
    id: "settings",
    label: "Settings",
    icon: "settings",
    href: "/portal/settings",
    subs: [
      { label: "Company Profile", href: "/portal/business-profile", icon: "settings" },
      { label: "Modules", href: "/portal/modules", icon: "box" },
      { label: "Billing", href: "/portal/billing", icon: "card" },
    ],
  },
];

/* ── Helper: determine which group is active based on pathname ── */
function activeGroup(pathname: string): string {
  if (pathname === "/portal") return "dashboard";
  for (const g of NAV) {
    if (g.href !== "/portal" && pathname.startsWith(g.href)) return g.id;
    for (const s of g.subs) {
      if (pathname.startsWith(s.href)) return g.id;
    }
  }
  return "";
}

export default function ConciseSidebar({
  activeModules = [],
  companyName,
  companyLogo,
  role,
  plan,
  onCollapse,
}: ConciseSidebarProps) {
  const pathname = usePathname();
  const activeSet = new Set(activeModules);
  const currentGroup = activeGroup(pathname || "/portal");

  /* Which groups are open (expanded) */
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set([currentGroup]));

  /* Keep current group expanded on route change */
  useEffect(() => {
    setOpenGroups((prev) => new Set(Array.from(prev).concat(currentGroup)));
  }, [currentGroup]);

  function toggleGroup(id: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function isSubVisible(module?: string) {
    return !module || activeSet.has(module);
  }

  function isActive(href: string) {
    return href === "/portal" ? pathname === "/portal" : (pathname || "").startsWith(href);
  }

  return (
    <aside className="sidebar demo-sidebar" style={{ display: "flex", flexDirection: "column" }}>
      {/* ── Brand ── */}
      <div className="brand demo-brand">
        {companyLogo ? (
          <img className="brand-logo-img" src={companyLogo} alt={companyName || "Logo"} />
        ) : (
          <div className="brand-mark demo-brand-mark">FS</div>
        )}
        <div className="brand-copy">
          <div className="brand-name">Fuze Suite</div>
          <div className="brand-sub">{companyName || "Business portal"}</div>
        </div>
        {onCollapse && (
          <button
            type="button"
            className="sidebar-collapse"
            aria-label="Hide menu"
            title="Hide menu"
            onClick={onCollapse}
            style={{ marginLeft: "auto" }}
          >
            ☰
          </button>
        )}
      </div>

      {/* ── Admin shortcut ── */}
      {role === "admin" && (
        <div className="nav" style={{ padding: "0 10px 4px" }}>
          <a className="nav-item" href="/admin">
            <Icon name="shield" />
            Admin Dashboard
          </a>
        </div>
      )}

      {/* ── 10-item nav ── */}
      <div className="demo-nav-scroll" style={{ flex: 1 }}>
        <nav className="nav" style={{ padding: "0 10px" }}>
          {NAV.map((group) => {
            const isGroupActive = currentGroup === group.id;
            const isExpanded = openGroups.has(group.id);
            const hasSubs = group.subs.length > 0;
            const visibleSubs = group.subs.filter((s) => isSubVisible(s.module));

            return (
              <div key={group.id} style={{ marginBottom: 2 }}>
                {/* Group header row */}
                <div
                  className={`nav-item concise-nav-item ${isGroupActive ? "active" : ""}`}
                  style={{
                    justifyContent: "space-between",
                    cursor: hasSubs ? "pointer" : "default",
                    padding: "9px 10px",
                  }}
                  onClick={() => {
                    if (hasSubs) toggleGroup(group.id);
                  }}
                  role={hasSubs ? "button" : undefined}
                  tabIndex={hasSubs ? 0 : undefined}
                  onKeyDown={(e) => {
                    if (hasSubs && (e.key === "Enter" || e.key === " ")) toggleGroup(group.id);
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 11 }}>
                    <Icon name={group.icon} />
                    <span style={{ fontWeight: isGroupActive ? 700 : 500 }}>{group.label}</span>
                  </span>
                  {hasSubs && (
                    <svg
                      width={14}
                      height={14}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                        transition: "transform 0.18s ease",
                        flexShrink: 0,
                        opacity: 0.55,
                      }}
                    >
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  )}
                  {/* If no subs, make the entire row a link */}
                  {!hasSubs && (
                    <a
                      href={group.href}
                      style={{
                        position: "absolute",
                        inset: 0,
                        borderRadius: 8,
                      }}
                      aria-label={group.label}
                    />
                  )}
                </div>

                {/* Sub-items */}
                {hasSubs && isExpanded && visibleSubs.length > 0 && (
                  <div
                    style={{
                      paddingLeft: 16,
                      paddingBottom: 4,
                      display: "flex",
                      flexDirection: "column",
                      gap: 1,
                      borderLeft: "2px solid var(--line-2)",
                      marginLeft: 20,
                    }}
                  >
                    {visibleSubs.map((sub) => (
                      <a
                        key={sub.href + sub.label}
                        href={sub.href}
                        className={`nav-item concise-sub-item ${isActive(sub.href) ? "active" : ""}`}
                        style={{
                          fontSize: 12.5,
                          padding: "7px 10px",
                          gap: 9,
                          color: isActive(sub.href) ? "var(--navy)" : "var(--muted)",
                        }}
                      >
                        <Icon name={sub.icon} size={14} />
                        {sub.label}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>

      {/* ── Subscription card ── */}
      <div className="subscription-card demo-subscription-card">
        <div className="subscription-top">
          <div>
            <div className="subscription-plan">{plan || "Starter"}</div>
            <div className="subscription-muted">{activeModules.length} active modules</div>
          </div>
          <span className="subscription-status">Active</span>
        </div>
        <div className="subscription-progress">
          <span />
        </div>
        <a className="subscription-button" href="/portal/billing">
          Manage Subscription
        </a>
      </div>

      {/* ── Sign out ── */}
      <div className="demo-signout">
        <a className="nav-item" href="/api/auth/logout" style={{ padding: "10px 20px", gap: 11 }}>
          <Icon name="logout" />
          Sign Out
        </a>
      </div>
    </aside>
  );
}
