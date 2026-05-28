"use client";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

interface SidebarProps {
  activeModules?: string[];
  companyName?: string;
  companyLogo?: string;
  role?: string;
  plan?: string;
  theme?: "light" | "dark";
  onCollapse?: () => void;
}

type NavItem = { label: string; href: string; icon: string; module?: string; badge?: string; exact?: boolean };
type NavGroup = { title: string; items: NavItem[] };
type PlanModuleEvent = CustomEvent<{ plan?: string; modules?: string[] }>;

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
    settings: "M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5ZM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.65 1.65 0 0 0 15 19.4a1.65 1.65 0 0 0-1 .6 1.65 1.65 0 0 0-.4 1.1V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 8 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-.6-1 1.65 1.65 0 0 0-1.1-.4H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 8a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-.6 1.65 1.65 0 0 0 .4-1.1V3a2 2 0 1 1 4 0v.09A1.65 1.65 0 0 0 15 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06A2 2 0 1 1 19.73 7.1l-.06.06A1.65 1.65 0 0 0 19.4 9c.14.32.35.6.6.82.3.25.68.39 1.1.39H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51.79Z",
    billing: "M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2Z",
    procurement: "M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0",
    hr: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
    ai: "M12 2l1.8 5.4L20 9.2l-5.2 3.5L16.6 20 12 15.8 7.4 20l1.8-7.3L4 9.2l6.2-1.8L12 2Z",
    signout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
    default: "M12 2v20M2 12h20",
  };
  return <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name] || paths.default} /></svg>;
}

const GROUPS: NavGroup[] = [
  { title: "Main", items: [
    { label: "Dashboard", href: "/portal", icon: "dashboard", exact: true },
    { label: "CRM", href: "/portal/crm", icon: "crm", module: "crm" },
    { label: "Sales", href: "/portal/sales-orders", icon: "chart", module: "selling" },
    { label: "Projects", href: "/portal/projects", icon: "project", module: "projects" },
    { label: "Support", href: "/portal/support", icon: "support", module: "support" },
    { label: "HR", href: "/portal/hr", icon: "hr", module: "hr" },
    { label: "Accounting", href: "/portal/accounting", icon: "invoice", module: "accounting" },
    { label: "Assets", href: "/portal/assets", icon: "truck", module: "assets" },
    { label: "Buying", href: "/portal/buying", icon: "procurement", module: "buying" },
    { label: "Subcontracting", href: "/portal/subcontracting", icon: "users", module: "subcontracting" },
    { label: "Insights", href: "/portal/insights", icon: "chart", module: "insights" },
  ]},
  { title: "Portal", items: [
    { label: "Client Portal", href: "/customer-portal", icon: "users", module: "portal-login" },
  ]},
  { title: "AI & Automation", items: [
    { label: "AI Assistant", href: "/portal/insights?tab=ai", icon: "ai", module: "ai", badge: "New" },
  ]},
  { title: "Settings", items: [
    { label: "Settings", href: "/portal/settings", icon: "settings" },
  ]},
];

function moduleAliases(module?: string): string[] {
  switch (module) {
    case "accounting": return ["accounting", "invoices", "payments", "banking"];
    case "banking": return ["banking", "payments", "accounting"];
    case "selling": return ["selling", "sales-orders", "quotes", "crm"];
    case "buying": return ["buying", "suppliers", "purchase-orders"];
    case "inventory": return ["inventory", "items"];
    case "hr": return ["hr", "employees", "attendance", "leave", "payroll"];
    case "quality": return ["quality", "operations"];
    case "assets": return ["assets", "asset", "asset-management"];
    case "subcontracting": return ["subcontracting", "buying", "operations"];
    case "projects": return ["projects", "project", "tasks", "operations"];
    case "support": return ["support", "issues", "helpdesk"];
    case "insights": return ["insights", "reports", "ai"];
    case "portal-login": return ["portal-login", "client-portal", "customer-portal"];
    case "ai": return ["ai", "insights", "reports"];
    default: return module ? [module] : [];
  }
}

function readLocalPlanModules() {
  if (typeof window === "undefined") return { plan: "", modules: [] as string[] };
  try {
    const plan = window.localStorage.getItem("fuze_plan_live") || "";
    const raw = window.localStorage.getItem("fuze_modules_live") || "[]";
    const modules = JSON.parse(raw);
    return { plan, modules: Array.isArray(modules) ? modules : [] };
  } catch { return { plan: "", modules: [] as string[] }; }
}

export default function Sidebar({ activeModules = [], companyName, companyLogo, role, plan, onCollapse }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentHref = searchParams.toString() ? `${pathname}?${searchParams.toString()}` : pathname;
  const [liveModules, setLiveModules] = useState<string[]>(activeModules);
  const [livePlan, setLivePlan] = useState(plan || "Starter");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  useEffect(() => { setLiveModules(activeModules); setLivePlan(plan || "Starter"); }, [activeModules, plan]);

  useEffect(() => {
    const local = readLocalPlanModules();
    if (local.modules.length) setLiveModules(local.modules);
    if (local.plan) setLivePlan(local.plan);
    const refreshFromServer = async () => {
      try {
        const res = await fetch("/api/saas/tenant-modules", { cache: "no-store" });
        const json = await res.json().catch(() => ({}));
        if (res.ok) { if (Array.isArray(json.activeModules) && json.activeModules.length) setLiveModules(json.activeModules); if (json.plan) setLivePlan(String(json.plan)); }
      } catch {}
    };
    const onPlanModulesChanged = (event: Event) => {
      const detail = (event as PlanModuleEvent).detail || {};
      if (Array.isArray(detail.modules)) setLiveModules(detail.modules);
      if (detail.plan) setLivePlan(detail.plan);
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === "fuze_plan_live" || event.key === "fuze_modules_live") {
        const next = readLocalPlanModules();
        if (next.modules.length) setLiveModules(next.modules);
        if (next.plan) setLivePlan(next.plan);
      }
    };
    refreshFromServer();
    window.addEventListener("fuze-plan-modules-changed", onPlanModulesChanged);
    window.addEventListener("storage", onStorage);
    return () => { window.removeEventListener("fuze-plan-modules-changed", onPlanModulesChanged); window.removeEventListener("storage", onStorage); };
  }, []);

  const activeSet = useMemo(() => new Set(liveModules.map((m) => m.trim().toLowerCase()).filter(Boolean)), [liveModules]);
  const isVisible = (module?: string) => !module || !activeSet.size || moduleAliases(module).some((a) => activeSet.has(a));
  const isActive = (href: string, exact?: boolean) => href.includes("?") ? currentHref === href : exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  const groupHasActive = (group: NavGroup) => group.items.some((item) => isActive(item.href, item.exact));
  const enabledCount = liveModules.length;

  return <aside className="sidebar demo-sidebar">
    <div className="brand demo-brand">
      {companyLogo ? <img className="brand-logo-img" src={companyLogo} alt={companyName || "Company logo"} /> : <div className="brand-mark demo-brand-mark">BS</div>}
      <div className="brand-copy"><div className="brand-name">Business Suite</div><div className="brand-sub">{companyName || "Business portal"}</div></div>
      {onCollapse && <button type="button" className="sidebar-collapse" aria-label="Hide main menu" onClick={onCollapse}>☰</button>}
    </div>

    {role === "admin" && <div className="nav admin-nav"><a className="nav-item" href="/admin"><Icon name="shield" />Admin Dashboard</a></div>}

    <div className="demo-nav-scroll">
      {GROUPS.map((group) => {
        const visible = group.items.filter((item) => isVisible(item.module));
        if (!visible.length) return null;
        const open = groupHasActive(group) || collapsed[group.title] !== true;
        return <div key={group.title} className="demo-nav-group">
          <button type="button" onClick={() => setCollapsed((prev) => ({ ...prev, [group.title]: !prev[group.title] }))} style={{ display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%",background:"none",border:"none",cursor:"pointer",padding:"14px 16px 4px",fontSize:"10.5px",letterSpacing:".8px",fontWeight:800,textTransform:"uppercase" }}>
            <span>{group.title}</span><span style={{ fontSize:9, opacity:0.55, marginRight:4 }}>{open ? "▲" : "▼"}</span>
          </button>
          {open && <nav className="nav">{visible.map((item) => <a key={item.href} className={`nav-item nav-item-${item.module || item.icon}${isActive(item.href, item.exact) ? " active" : ""}`} href={item.href}><span className="nav-icon-shell"><Icon name={item.icon} /></span><span>{item.label}</span>{item.badge && <span className="nav-badge">{item.badge}</span>}</a>)}</nav>}
        </div>;
      })}
    </div>

    <div className="subscription-card demo-subscription-card">
      <div className="subscription-top"><div><div className="subscription-plan">{livePlan || "Starter"}</div><div className="subscription-muted">{enabledCount} active modules</div></div><span className="subscription-status">Active</span></div>
      <div className="subscription-progress"><span style={{ width: `${Math.min(100, Math.max(18, enabledCount * 4))}%` }} /></div>
      <a className="subscription-button" href="/portal/billing">Manage Subscription</a>
    </div>

    <div className="demo-signout"><a className="nav-item" href="/api/auth/logout"><Icon name="signout" />Sign Out</a></div>
  </aside>;
}
