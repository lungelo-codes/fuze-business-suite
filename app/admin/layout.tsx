import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ROLE_COOKIE } from "@/lib/modules";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const role = cookieStore.get(ROLE_COOKIE)?.value;

  // In production, verify against ERPNext session + System Manager role
  // For now, allow if role cookie is "admin"
  if (role !== "admin") {
    redirect("/login?reason=admin_required");
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark" style={{ background: "linear-gradient(135deg,#DC3545,#E89B0E)" }}>FB</div>
          <div>
            <div className="brand-name">Fuze Admin</div>
            <div className="brand-sub" style={{ color: "#DC3545" }}>System Manager</div>
          </div>
        </div>
        <div className="nav-section">Admin</div>
        <nav className="nav">
          <a className="nav-item" href="/admin">⊞ Overview</a>
          <a className="nav-item" href="/admin/customers">👥 Customers</a>
        </nav>
        <div className="nav-section">Quick Links</div>
        <nav className="nav">
          <a className="nav-item" href="/portal">← Customer Portal</a>
        </nav>
      </aside>
      <main className="main">
        <div className="topbar">
          <div className="crumb">
            <span style={{ color: "#DC3545", fontWeight: 700 }}>🛡 Admin</span>
          </div>
          <div className="top-right">
            <span className="tenant-chip" style={{ borderColor: "#DC3545", color: "#DC3545" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#DC3545", display: "inline-block" }} />
              System Manager
            </span>
          </div>
        </div>
        <div className="content-wrap">{children}</div>
      </main>
    </div>
  );
}
