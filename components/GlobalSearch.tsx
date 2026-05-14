"use client"
import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"

type SearchResult = {
  id: string
  title: string
  subtitle: string
  type: string
  href: string
  status?: string
}

const TYPE_COLORS: Record<string, string> = {
  Customer: "#2E6BE5",
  Lead: "#F59E0B",
  Invoice: "#10B981",
  Quote: "#8B5CF6",
  Payment: "#06B6D4",
  Project: "#EC4899",
  Task: "#6366F1",
  Employee: "#14B8A6",
  Support: "#EF4444",
  Supplier: "#84CC16",
  Item: "#F97316",
  Opportunity: "#A855F7",
}

export default function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setOpen(true)
        setTimeout(() => inputRef.current?.focus(), 50)
      }
      if (e.key === "Escape") {
        setOpen(false)
        setQuery("")
        setResults([])
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults([])
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const r = await fetch(`/api/portal/search?q=${encodeURIComponent(query)}&limit=8`)
        const j = await r.json()
        setResults(Array.isArray(j.data) ? j.data : [])
        setSelected(0)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 280)
  }, [query])

  function navigate(href: string) {
    setOpen(false)
    setQuery("")
    setResults([])
    router.push(href)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelected((s) => Math.min(s + 1, results.length - 1)) }
    if (e.key === "ArrowUp") { e.preventDefault(); setSelected((s) => Math.max(s - 1, 0)) }
    if (e.key === "Enter" && results[selected]) navigate(results[selected].href)
  }

  if (!open) {
    return (
      <button
        className="search-trigger"
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50) }}
        style={{
          display: "flex", alignItems: "center", gap: 8, padding: "6px 14px",
          background: "var(--demo-soft)", border: "1px solid var(--demo-line)",
          borderRadius: 8, cursor: "pointer", color: "var(--demo-muted)", fontSize: 13,
          minWidth: 180,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>
        Search…
        <span style={{ marginLeft: "auto", fontSize: 11, opacity: 0.6 }}>⌘K</span>
      </button>
    )
  }

  return (
    <>
      {/* Backdrop */}
      <div
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", zIndex: 9998 }}
        onClick={() => { setOpen(false); setQuery(""); setResults([]) }}
      />
      {/* Search modal */}
      <div style={{
        position: "fixed", top: "10vh", left: "50%", transform: "translateX(-50%)",
        width: "min(600px, 90vw)", background: "var(--demo-card)",
        borderRadius: 14, boxShadow: "0 24px 80px rgba(0,0,0,.25)",
        border: "1px solid var(--demo-line)", zIndex: 9999, overflow: "hidden",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px", borderBottom: "1px solid var(--demo-line)" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--demo-muted)" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search customers, invoices, leads, projects…"
            style={{
              flex: 1, border: "none", outline: "none", background: "transparent",
              fontSize: 15, color: "var(--demo-text)",
            }}
          />
          {loading && <span style={{ fontSize: 12, color: "var(--demo-muted)" }}>Searching…</span>}
          <button onClick={() => { setOpen(false); setQuery(""); setResults([]) }}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--demo-muted)", fontSize: 18, lineHeight: 1 }}>×</button>
        </div>

        {results.length > 0 && (
          <div style={{ maxHeight: 380, overflowY: "auto" }}>
            {results.map((r, i) => (
              <button
                key={r.id + r.type}
                onClick={() => navigate(r.href)}
                style={{
                  display: "flex", alignItems: "center", gap: 12, width: "100%",
                  padding: "10px 18px", border: "none", cursor: "pointer", textAlign: "left",
                  background: i === selected ? "var(--demo-soft)" : "transparent",
                  borderBottom: "1px solid var(--demo-line)",
                  transition: "background .1s",
                }}
                onMouseEnter={() => setSelected(i)}
              >
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10,
                  background: (TYPE_COLORS[r.type] || "#6B7280") + "22",
                  color: TYPE_COLORS[r.type] || "#6B7280",
                  minWidth: 60, textAlign: "center",
                }}>{r.type}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--demo-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.title}</div>
                  {r.subtitle && r.subtitle !== "—" && (
                    <div style={{ fontSize: 11, color: "var(--demo-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.subtitle}</div>
                  )}
                </div>
                {r.status && <span style={{ fontSize: 11, color: "var(--demo-muted)" }}>{r.status}</span>}
              </button>
            ))}
          </div>
        )}

        {query.length >= 2 && !loading && results.length === 0 && (
          <div style={{ padding: "24px 18px", textAlign: "center", color: "var(--demo-muted)", fontSize: 13 }}>
            No results for &ldquo;{query}&rdquo;
          </div>
        )}

        {!query && (
          <div style={{ padding: "16px 18px" }}>
            <div style={{ fontSize: 12, color: "var(--demo-muted)", marginBottom: 10 }}>Quick links</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {[
                { label: "Customers", href: "/portal/customers" },
                { label: "Invoices", href: "/portal/invoices" },
                { label: "Leads", href: "/portal/leads" },
                { label: "Projects", href: "/portal/projects" },
                { label: "Support", href: "/portal/support" },
                { label: "Employees", href: "/portal/employees" },
              ].map((l) => (
                <button key={l.href} onClick={() => navigate(l.href)}
                  style={{ fontSize: 12, padding: "4px 12px", background: "var(--demo-soft)", border: "1px solid var(--demo-line)", borderRadius: 20, cursor: "pointer", color: "var(--demo-text)" }}>
                  {l.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ padding: "8px 18px", borderTop: "1px solid var(--demo-line)", display: "flex", gap: 16 }}>
          {[["↑↓", "Navigate"], ["↵", "Open"], ["Esc", "Close"]].map(([key, label]) => (
            <span key={key} style={{ fontSize: 11, color: "var(--demo-muted)", display: "flex", alignItems: "center", gap: 4 }}>
              <kbd style={{ padding: "1px 5px", background: "var(--demo-soft)", borderRadius: 4, border: "1px solid var(--demo-line)", fontSize: 10 }}>{key}</kbd>
              {label}
            </span>
          ))}
        </div>
      </div>
    </>
  )
}
