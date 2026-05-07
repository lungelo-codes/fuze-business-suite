"use client";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

function AdminSidebar() {
  const pathname = usePathname() || "/admin";

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  return (
    <aside className="sidebar">
      <div className="brand">
        <div
          className="brand-mark"
          style={{ background: "linear-gradient(135deg,#DC3545,#E89B0E)" }}
        >
          FB
        </div>
        <div>
          <div className="brand-name">Fuze Admin</div>
          <div className="brand-sub" style={{ color: "#DC3545" }}>
            System Manager
          </div>
        </div>
      </div>

      <div className="nav-section">Dashboard</div>
      <nav className="nav">
        <a className={`nav-item ${isActive("/admin") && !isActive("/admin/customers") && !isActive("/admin/plans") && !isActive("/admin/modules") && !isActive("/admin/settings") ? "active" : ""}`} href="/admin">
          <span style={{ fontSize: 15 }}>⊞</span> Overview
        </a>
      </nav>

      <div className="nav-section">Tenants</div>
      <nav className="nav">
        <a className={`nav-item ${isActive("/admin/customers") ? "active" : ""}`} href="/admin/customers">
          <span style={{ fontSize: 15 }}>👥</span> All Tenants
        </a>
      </nav>

      <div className="nav-section">Configuration</div>
      <nav className="nav">
        <a className={`nav-item ${isActive("/admin/plans") ? "active" : ""}`} href="/admin/plans">
          <span style={{ fontSize: 15 }}>💳</span> Plans
        </a>
        <a className={`nav-item ${isActive("/admin/modules") ? "active" : ""}`} href="/admin/modules">
          <span style={{ fontSize: 15 }}>🧩</span> Modules
        </a>
        <a className={`nav-item ${isActive("/admin/settings") ? "active" : ""}`} href="/admin/settings">
          <span style={{ fontSize: 15 }}>⚙️</span> Settings
        </a>
      </nav>

      <div className="nav-section">Navigation</div>
      <nav className="nav">
        <a className="nav-item" href="/portal">
          <span style={{ fontSize: 15 }}>←</span> Customer Portal
        </a>
        <a
          className="nav-item"
          href="/api/auth/logout"
          style={{ color: "var(--danger)" }}
        >
          <span style={{ fontSize: 15 }}>⏻</span> Sign Out
        </a>
      </nav>
    </aside>
  );
}

function AdminTopbar() {
  const pathname = usePathname() || "/admin";
  const LABELS: Record<string, string> = {
    "/admin": "Overview",
    "/admin/customers": "Tenants",
    "/admin/plans": "Plans",
    "/admin/modules": "Modules",
    "/admin/settings": "Settings",
  };
  const label = Object.entries(LABELS)
    .sort((a, b) => b[0].length - a[0].length)
    .find(([path]) => pathname === path || pathname.startsWith(path + "/"))?.[1] ?? "Admin";

  return (
    <div className="topbar">
      <div className="crumb">
        <span style={{ color: "#DC3545", fontWeight: 700 }}>🛡 Admin</span>
        <span style={{ color: "#CBD0DD" }}>›</span>
        <span className="now">{label}</span>
      </div>
      <div className="top-right">
        <span
          className="tenant-chip"
          style={{ borderColor: "#DC3545", color: "#DC3545" }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#DC3545",
              display: "inline-block",
            }}
          />
          System Manager
        </span>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    // Check role cookie client-side
    const cookies = document.cookie.split(";").reduce<Record<string, string>>((acc, c) => {
      const [k, v] = c.trim().split("=");
      if (k) acc[k] = v ?? "";
      return acc;
    }, {});
    const role = cookies["fuze_role"];
    if (role !== "admin") {
      window.location.href = "/login?reason=admin_required";
    } else {
      setAuthorized(true);
    }
  }, []);

  if (authorized === null) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          background: "var(--bg)",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🛡</div>
          <div style={{ color: "var(--muted)", fontSize: 14 }}>Verifying admin access…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <AdminSidebar />
      <main className="main">
        <AdminTopbar />
        <div className="content-wrap">{children}</div>
      </main>
    </div>
  );
}
