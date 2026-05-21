"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";

type PortalShellProps = {
  children: React.ReactNode;
  activeModules?: string[];
  companyName?: string;
  role?: string;
  plan?: string;
};

const SIDEBAR_KEY = "business-suite-main-sidebar-open";
const THEME_KEY = "business-suite-theme";

export default function PortalShell({ children, activeModules = [], companyName, role, plan }: PortalShellProps) {
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [platformLogo, setPlatformLogo] = useState("");
  const [tenantLogo, setTenantLogo] = useState("");

  useEffect(() => {
    setMounted(true);
    try {
      const savedSidebar = window.localStorage.getItem(SIDEBAR_KEY);
      const savedTheme = window.localStorage.getItem(THEME_KEY) as "light" | "dark" | null;
      if (savedSidebar === "0") setSidebarOpen(false);
      if (savedSidebar === "1") setSidebarOpen(true);
      if (savedTheme === "dark" || savedTheme === "light") setTheme(savedTheme);
    } catch {}
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [tenantRes, platformRes] = await Promise.all([
          fetch(`/api/settings/tenant-control?company=${encodeURIComponent(companyName || "")}`, { cache: "no-store" }),
          fetch(`/api/settings/platform-control`, { cache: "no-store" }),
        ]);
        const tenantJson = await tenantRes.json().catch(() => ({}));
        const platformJson = await platformRes.json().catch(() => ({}));
        if (active && tenantJson.data?.company_logo) setTenantLogo(String(tenantJson.data.company_logo));
        if (active && platformJson.data?.platform_logo) setPlatformLogo(String(platformJson.data.platform_logo));
        else if (active && platformJson.data?.website_logo) setPlatformLogo(String(platformJson.data.website_logo));
      } catch {}
    })();
    return () => { active = false };
  }, [companyName]);

  function setOpen(next: boolean) {
    setSidebarOpen(next);
    try { window.localStorage.setItem(SIDEBAR_KEY, next ? "1" : "0"); } catch {}
  }

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    try { window.localStorage.setItem(THEME_KEY, next); } catch {}
  }

  const open = mounted ? sidebarOpen : true;
  const shellClass = useMemo(() => `portal-shell demo-shell ${open ? "sidebar-open" : "sidebar-closed"} theme-${theme}`, [open, theme]);

  return (
    <div className={shellClass}>
      <div className={`main-nav-slot ${open ? "show" : "hide"}`} aria-hidden={!open}>
        <Sidebar
          activeModules={activeModules}
          companyName={companyName}
          companyLogo={platformLogo}
          role={role}
          plan={plan}
          theme={theme}
          onCollapse={() => setOpen(false)}
        />
      </div>
      <main className="main demo-main">
        <Topbar
          plan={plan}
          companyName={companyName}
          companyLogo={tenantLogo}
          role={role}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
        <div className="content-wrap demo-content-wrap">{children}</div>
      </main>
      {mounted && !open && (
        <button type="button" className="sidebar-edge-pill" aria-label="Open main menu" title="Open main menu" onClick={() => setOpen(true)}>☰</button>
      )}
    </div>
  );
}
