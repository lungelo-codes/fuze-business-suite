"use client"
import { useEffect, useRef, useState } from "react"

type Row = Record<string, unknown>

function text(v: unknown): string { return v ? String(v) : "" }
function dateTime(v: unknown): string {
  if (!v) return ""
  try { return new Date(String(v)).toLocaleString("en-ZA", { dateStyle: "short", timeStyle: "short" }) }
  catch { return String(v) }
}

export default function ChatClient() {
  const [messages, setMessages] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [content, setContent] = useState("")
  const [subject, setSubject] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState("")
  const [filter, setFilter] = useState<"all" | "Comment" | "Email" | "Chat">("all")
  const bottomRef = useRef<HTMLDivElement>(null)

  async function loadMessages() {
    try {
      const r = await fetch("/api/portal/chat", { cache: "no-store" })
      const j = await r.json()
      if (j.data) setMessages(j.data)
    } catch {}
    setLoading(false)
  }

  useEffect(() => {
    loadMessages()
    const interval = setInterval(loadMessages, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return
    setSending(true); setError("")
    try {
      const res = await fetch("/api/portal/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, subject: subject || "Portal Message", communication_type: "Comment" }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Could not send message")
      setContent(""); setSubject("")
      await loadMessages()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send message")
    } finally { setSending(false) }
  }

  const filtered = filter === "all"
    ? messages
    : messages.filter((m) => m.communication_type === filter)

  return (
    <div className="demo-workspace animate-fade-up">
      <div className="demo-module-titlebar">
        <div>
          <div className="demo-eyebrow">Service Workspace</div>
          <h1>Team Messages</h1>
          <p>View and send communications, comments, and team messages.</p>
        </div>
      </div>

      <div className="demo-panel" style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 260px)", minHeight: 400 }}>
        {/* Filter bar */}
        <div className="demo-panel-head">
          <div className="seg">
            {(["all", "Comment", "Email", "Chat"] as const).map((f) => (
              <button key={f} className={filter === f ? "on" : ""} onClick={() => setFilter(f)}>
                {f === "all" ? "All" : f}
              </button>
            ))}
          </div>
          <span style={{ fontSize: 12, color: "var(--demo-muted)" }}>{filtered.length} message{filtered.length !== 1 ? "s" : ""}</span>
        </div>

        {/* Messages list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
          {loading ? (
            <div style={{ color: "var(--demo-muted)", textAlign: "center", padding: 40 }}>Loading messages…</div>
          ) : filtered.length === 0 ? (
            <div style={{ color: "var(--demo-muted)", textAlign: "center", padding: 40 }}>No messages yet. Send the first one below.</div>
          ) : (
            filtered.map((msg) => (
              <div key={String(msg.name)} style={{
                background: "var(--demo-soft)",
                borderRadius: 10,
                padding: "12px 16px",
                maxWidth: "80%",
                alignSelf: "flex-start",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, gap: 16 }}>
                  <strong style={{ fontSize: 13, color: "var(--demo-text)" }}>
                    {text(msg.sender_full_name || msg.sender || "System")}
                  </strong>
                  <span style={{ fontSize: 11, color: "var(--demo-muted)", whiteSpace: "nowrap" }}>
                    {dateTime(msg.modified)}
                  </span>
                </div>
                {text(msg.subject) && text(msg.subject) !== "Portal Message" && (
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--demo-muted)", marginBottom: 4 }}>
                    {text(msg.subject)}
                  </div>
                )}
                <div style={{ fontSize: 13, color: "var(--demo-text)", lineHeight: 1.5 }}
                  dangerouslySetInnerHTML={{ __html: text(msg.content).replace(/<[^>]*>/g, "").slice(0, 500) }}
                />
                <div style={{ fontSize: 11, color: "var(--demo-muted)", marginTop: 6 }}>
                  {text(msg.communication_type)}
                  {msg.reference_doctype ? ` · ${text(msg.reference_doctype)} ${text(msg.reference_name)}` : ""}
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {/* Compose */}
        <div style={{ borderTop: "1px solid var(--demo-line)", padding: "16px 20px" }}>
          <form onSubmit={sendMessage} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input
              className="inp"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject (optional)"
              style={{ fontSize: 13 }}
            />
            <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
              <textarea
                className="inp"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Type a message…"
                rows={2}
                style={{ flex: 1, resize: "none" }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault()
                    sendMessage(e as unknown as React.FormEvent)
                  }
                }}
              />
              <button className="btn btn-teal" disabled={sending || !content.trim()} style={{ height: 44 }}>
                {sending ? "…" : "Send"}
              </button>
            </div>
            {error && <div className="banner warn">{error}</div>}
            <div style={{ fontSize: 11, color: "var(--demo-muted)" }}>Press Ctrl+Enter to send</div>
          </form>
        </div>
      </div>
    </div>
  )
}
