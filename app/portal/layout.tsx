"use client";
import { useState, useEffect, createContext, useContext } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ALL_MODULES, GROUP_LABELS, PlanId, ModuleId, getPlanModules, type Module } from "@/lib/modules";

// ─── Module Context ───────────────────────────────────────────────────────────
interface WorkspaceCtx {
  plan: PlanId;
  activeModules: string[];
  hasModule: (id: string) => boolean;
  company: string;
  currency: string;
}

const WorkspaceContext = createContext<WorkspaceCtx>({
  plan: "Growth",
  activeModules: [],
  hasModule: () => false,
  company: "Fuze Demo Company",
  currency: "ZAR",
});

export const useWorkspace = () => useContext(WorkspaceContext);

// ─── Sidebar nav item ─────────────────────────────────────────────────────────
function NavItem({ mod, locked }: { mod: Module; locked: boolean }) {
  const path = usePathname();
  const isActive = path === mod.path || (mod.path !== "/portal" && path.startsWith(mod.path));

  if (locked) {
    return (
      <div className="nav-item nav-locked" title="Upgrade to unlock">
        <span className="nav-icon">{mod.icon}</span>
        <span>{mod.label}</span>
        <span className="nav-lock">🔒</span>
      </div>
    );
  }

  return (
    <Link href={mod.path} className={`nav-item${isActive ? " active" : ""}`}>
      <span className="nav-icon">{mod.icon}</span>
      <span>{mod.label}</span>
    </Link>
  );
}

// ─── Portal layout ────────────────────────────────────────────────────────────
export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const [plan] = useState<PlanId>("Growth");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [company] = useState("Fuze Demo Company");
  const [currency] = useState("ZAR");
  const [aiOpen, setAiOpen] = useState(false);
  const [aiInput, setAiInput] = useState("");
  const [aiMessages, setAiMessages] = useState<{ role: string; content: string }[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const path = usePathname();

  const activeModuleIds = getPlanModules(plan);
  const hasModule = (id: string) => activeModuleIds.includes(id as ModuleId);

  // Group modules for sidebar
  const groups: Record<string, { mod: Module; locked: boolean }[]> = {};
  for (const mod of ALL_MODULES) {
    if (!groups[mod.group]) groups[mod.group] = [];
    groups[mod.group].push({ mod, locked: !hasModule(mod.id) });
  }

  // Current page title
  const currentMod = ALL_MODULES.find(
    (m) => path === m.path || (m.path !== "/portal" && path.startsWith(m.path))
  );

  const sendAI = async () => {
    if (!aiInput.trim()) return;
    const userMsg = aiInput.trim();
    setAiInput("");
    setAiMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setAiLoading(true);

    try {
      const { default: apiClient } = await import("@/lib/api");
      const reply = await apiClient.chat(userMsg, aiMessages);
      setAiMessages((prev) => [...prev, { role: "assistant", content: reply || "No response" }]);
    } catch {
      setAiMessages((prev) => [...prev, { role: "assistant", content: "Assistant unavailable – please try again." }]);
    }
    setAiLoading(false);
  };

  return (
    <WorkspaceContext.Provider value={{ plan, activeModules: activeModuleIds, hasModule, company, currency }}>
      <div className={`app${sidebarOpen ? "" : " sidebar-collapsed"}`}>
        {/* ── Sidebar ── */}
        <aside className="sidebar">
          <div className="brand">
            <div className="brand-mark">FS</div>
            {sidebarOpen && (
              <div>
                <div className="brand-name">Business Suite</div>
                <div className="brand-sub">{company}</div>
              </div>
            )}
            <button
              className="sidebar-toggle"
              onClick={() => setSidebarOpen((p) => !p)}
              title={sidebarOpen ? "Collapse" : "Expand"}
            >
              {sidebarOpen ? "‹" : "›"}
            </button>
          </div>

          {Object.entries(groups).map(([group, items]) => (
            <div key={group}>
              {sidebarOpen && (
                <div className="nav-section">{GROUP_LABELS[group] ?? group}</div>
              )}
              <nav className="nav">
                {items.map(({ mod, locked }) => (
                  <NavItem key={mod.id} mod={mod} locked={locked} />
                ))}
              </nav>
            </div>
          ))}

          {/* AI button */}
          <div style={{ marginTop: "auto", padding: "12px 10px" }}>
            <button
              className="btn btn-teal"
              style={{ width: "100%", justifyContent: "center" }}
              onClick={() => setAiOpen(true)}
            >
              ✦ {sidebarOpen ? "Fuze AI" : "AI"}
            </button>
          </div>

          {/* Plan badge */}
          {sidebarOpen && (
            <div style={{ padding: "10px 18px 18px" }}>
              <div className="plan-badge">
                <span>{plan} Plan</span>
                <Link href="/portal/settings" style={{ color: "var(--teal)", fontSize: 11, fontWeight: 700 }}>
                  Upgrade →
                </Link>
              </div>
            </div>
          )}
        </aside>

        {/* ── Main ── */}
        <main className="main">
          {/* Topbar */}
          <div className="topbar">
            <div className="crumb">
              <Link href="/portal" style={{ color: "var(--muted)" }}>Portal</Link>
              {currentMod && currentMod.path !== "/portal" && (
                <>
                  <span style={{ color: "var(--muted-2)" }}>/</span>
                  <span className="now">{currentMod.label}</span>
                </>
              )}
              {!currentMod && <span className="now">Dashboard</span>}
            </div>

            <div className="top-right">
              <div className="tenant-chip">
                <span className="dot" />
                <span>{company}</span>
              </div>
              <button
                className="btn"
                onClick={() => setAiOpen(true)}
                title="Fuze AI"
              >
                ✦ Ask AI
              </button>
              <div className="avatar">AD</div>
            </div>
          </div>

          {/* Page content */}
          <div className="content-wrap">{children}</div>
        </main>

        {/* ── AI Panel ── */}
        {aiOpen && (
          <div className="ai-overlay" onClick={(e) => e.target === e.currentTarget && setAiOpen(false)}>
            <div className="ai-panel">
              <div className="ai-panel-head">
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: "var(--navy-ink)" }}>✦ Fuze AI</div>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>Business assistant</div>
                </div>
                <button className="btn" onClick={() => setAiOpen(false)}>✕</button>
              </div>

              <div className="ai-messages">
                {aiMessages.length === 0 && (
                  <div className="ai-welcome">
                    <div className="ai-avatar">✦</div>
                    <p>Hi! I&apos;m Fuze AI. Ask me about your pipeline, compliance deadlines, how to send an invoice, or anything about your business.</p>
                    <div className="ai-suggestions">
                      {[
                        "What are my overdue invoices?",
                        "When is my next VAT submission?",
                        "Draft a follow-up email for a lead",
                        "Explain my pipeline value",
                      ].map((s) => (
                        <button key={s} className="ai-suggestion" onClick={() => setAiInput(s)}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {aiMessages.map((m, i) => (
                  <div key={i} className={`ai-msg ${m.role}`}>
                    {m.role === "assistant" && <div className="ai-msg-avatar">✦</div>}
                    <div className="ai-msg-bubble">{m.content}</div>
                  </div>
                ))}
                {aiLoading && (
                  <div className="ai-msg assistant">
                    <div className="ai-msg-avatar">✦</div>
                    <div className="ai-msg-bubble ai-thinking">
                      <span /><span /><span />
                    </div>
                  </div>
                )}
              </div>

              <div className="ai-input-row">
                <input
                  className="ai-input"
                  placeholder="Ask Fuze AI anything..."
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendAI()}
                />
                <button className="btn btn-teal" onClick={sendAI} disabled={aiLoading}>
                  ↑
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </WorkspaceContext.Provider>
  );
}
