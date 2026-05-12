"use client";
import { useEffect, useState } from "react";

type NotificationItem = { id: string; title: string; message: string; type: string; status: "unread" | "read"; date?: string; href?: string; source: string };

export default function NotificationsPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState("");
  async function load() {
    try { setLoading(true); setError(""); const res = await fetch("/api/notifications", { cache: "no-store" }); const json = await res.json(); setItems(Array.isArray(json.data) ? json.data : []); setUnread(Number(json.unread || 0)); if (Array.isArray(json.errors) && json.errors.length && !json.data?.length) setError(json.errors[0]); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not load notifications"); setItems([]); setUnread(0); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);
  async function markRead(item: NotificationItem) { setItems((current) => current.map((row) => row.id === item.id && row.source === item.source ? { ...row, status: "read" } : row)); setUnread((count) => Math.max(0, count - (item.status === "unread" ? 1 : 0))); try { await fetch("/api/notifications/read", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id, source: item.source }) }); } catch {} }
  function openItem(item: NotificationItem) { markRead(item); if (item.href) window.location.href = item.href; }
  return <div className="page-stack"><div className="page-head"><div><h1 className="page-title">Notifications</h1><div className="page-sub">Assignments, compliance reminders, document updates and system alerts.</div></div><button type="button" className="btn" onClick={load}>Refresh</button></div><div className="business-card"><div className="business-card-head"><div><h3>Notification Centre</h3><p>{unread} unread notifications</p></div></div><div className="notif-page-list">{loading && <div className="empty-action"><div className="empty-title">Loading notifications…</div></div>}{!loading && error && <div className="empty-action"><div className="empty-title">Could not load notifications</div><div className="empty-copy">{error}</div></div>}{!loading && !error && items.length === 0 && <div className="empty-action"><div className="empty-icon">✓</div><div className="empty-title">No notifications</div><div className="empty-copy">You are all caught up.</div></div>}{!loading && !error && items.map((item) => <button key={`${item.source}:${item.id}`} type="button" className={`notif-page-item ${item.status === "unread" ? "unread" : ""}`} onClick={() => openItem(item)}><div><strong>{item.title}</strong><p>{item.message}</p><small>{item.source} · {item.type} {item.date ? `· ${item.date}` : ""}</small></div><span>{item.status}</span></button>)}</div></div></div>;
}
