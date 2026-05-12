"use client";
import { useEffect, useMemo, useRef, useState } from "react";

type NotificationItem = { id: string; title: string; message: string; type: string; status: "unread" | "read"; date?: string; href?: string; source: string };

function formatDate(value?: string) {
  if (!value) return "";
  const date = new Date(value.replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [error, setError] = useState("");
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const unread = useMemo(() => items.filter((item) => item.status === "unread").length, [items]);

  async function load() {
    try {
      setLoading(true); setError("");
      const res = await fetch("/api/notifications", { cache: "no-store" });
      const json = await res.json();
      setItems(Array.isArray(json.data) ? json.data : []);
      if (Array.isArray(json.errors) && json.errors.length && !json.data?.length) setError(json.errors[0]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load notifications"); setItems([]);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);
  useEffect(() => {
    function closeOnOutside(event: MouseEvent) { if (!wrapRef.current?.contains(event.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", closeOnOutside);
    return () => document.removeEventListener("mousedown", closeOnOutside);
  }, []);
  async function markRead(item: NotificationItem) {
    setItems((current) => current.map((row) => row.id === item.id && row.source === item.source ? { ...row, status: "read" } : row));
    try { await fetch("/api/notifications/read", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id, source: item.source }) }); } catch {}
  }
  function openItem(item: NotificationItem) { markRead(item); if (item.href) window.location.href = item.href; }

  return <div className="notif-wrap" ref={wrapRef}>
    <button type="button" className="bell" aria-label="Notifications" onClick={() => { setOpen((value) => !value); if (!open) load(); }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
      {unread > 0 && <span className="count">{unread > 9 ? "9+" : unread}</span>}
    </button>
    {open && <div className="notif-panel"><div className="notif-head"><div><strong>Notifications</strong><span>{unread} unread</span></div><button type="button" className="notif-refresh" onClick={load}>Refresh</button></div><div className="notif-list">
      {loading && <div className="notif-empty">Loading notifications…</div>}
      {!loading && error && <div className="notif-empty danger">{error}</div>}
      {!loading && !error && items.length === 0 && <div className="notif-empty">No notifications yet.</div>}
      {!loading && !error && items.slice(0, 8).map((item) => <button key={`${item.source}:${item.id}`} type="button" className={`notif-item ${item.status === "unread" ? "unread" : ""}`} onClick={() => openItem(item)}><span className="notif-dot" /><span className="notif-copy"><strong>{item.title}</strong><small>{item.message}</small><em>{item.type}{item.date ? ` · ${formatDate(item.date)}` : ""}</em></span></button>)}
    </div><a className="notif-foot" href="/portal/notifications">View all notifications</a></div>}
  </div>;
}
