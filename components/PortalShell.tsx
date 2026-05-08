"use client";

import { useEffect, useState } from "react";
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

export default function PortalShell({ children, activeModules, companyName, role, plan }: PortalShellProps) {
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [companyLogo, setCompanyLogo] = useState("");

  useEffect(() => {
    setMounted(true);
    try {
      const saved = window.localStorage.getItem(SIDEBAR_KEY);
      if (saved === "0") setSidebarOpen(false);
      if (saved === "1") setSidebarOpen(true);
    } catch {}
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch(`/api/settings/business-branding?company=${encodeURIComponent(companyName || "")}`, { cache: "no-store" });
        const json = await res.json();
        if (active && json.data?.company?.company_logo) setCompanyLogo(String(json.data.company.company_logo));
      } catch {}
    })();
    return () => { active = false };
  }, [companyName]);

  function setOpen(next: boolean) {
    setSidebarOpen(next);
    try { window.localStorage.setItem(SIDEBAR_KEY, next ? "1" : "0"); } catch {}
  }

  const open = mounted ? sidebarOpen : true;

  return (
    <div className={`app portal-shell ${open ? "sidebar-open" : "sidebar-closed"}`}>
      <div className={`main-nav-slot ${open ? "show" : "hide"}`} aria-hidden={!open}>
        <Sidebar activeModules={activeModules} companyName={companyName} companyLogo={companyLogo} role={role} plan={plan} onCollapse={() => setOpen(false)} />
      </div>
      <main className="main">
        <Topbar plan={plan} companyName={companyName} companyLogo={companyLogo} role={role} />
        <div className="content-wrap">{children}</div>
      </main>
      {mounted && !open && <button type="button" className="sidebar-edge-pill" aria-label="Open main menu" title="Open main menu" onClick={() => setOpen(true)}>☰</button>}
    </div>
  );
}
