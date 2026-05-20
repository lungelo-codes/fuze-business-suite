import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

type Conn = { access_token?: string; refresh_token?: string; expires_at?: string; account_email?: string; connected?: boolean };
function unwrap<T>(value: unknown): T { const boxed = value as { data?: T; message?: T }; return (boxed?.data ?? boxed?.message ?? value) as T; }
async function refreshDropbox(conn: Conn) {
  const clientId = process.env.DROPBOX_CLIENT_ID;
  const clientSecret = process.env.DROPBOX_CLIENT_SECRET;
  if (!conn.refresh_token || !clientId || !clientSecret) return conn;
  const tokenRes = await fetch("https://api.dropboxapi.com/oauth2/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ refresh_token: conn.refresh_token, grant_type: "refresh_token", client_id: clientId, client_secret: clientSecret }), cache: "no-store",
  });
  if (!tokenRes.ok) return conn;
  const token = await tokenRes.json() as { access_token?: string; expires_in?: number };
  if (!token.access_token) return conn;
  const expiresAt = new Date(Date.now() + Math.max(60, Number(token.expires_in || 14400) - 60) * 1000).toISOString().slice(0, 19).replace("T", " ");
  await erpMethod("documents.save_storage_connection", { provider: "dropbox", access_token: token.access_token, expires_at: expiresAt, account_email: conn.account_email });
  return { ...conn, access_token: token.access_token, expires_at: expiresAt };
}
export async function GET() {
  let conn = unwrap<Conn>(await erpMethod("documents.get_storage_connection", { provider: "dropbox" }) || {});
  if (!conn?.access_token && conn?.refresh_token) conn = await refreshDropbox(conn);
  if (!conn?.access_token) return NextResponse.json({ connected: false, data: [] });
  let res = await fetch("https://api.dropboxapi.com/2/files/list_folder", { method: "POST", headers: { Authorization: `Bearer ${conn.access_token}`, "Content-Type": "application/json" }, body: JSON.stringify({ path: "", recursive: false, include_media_info: false, include_deleted: false, include_has_explicit_shared_members: false }), cache: "no-store" });
  if (res.status === 401 && conn.refresh_token) { conn = await refreshDropbox(conn); res = await fetch("https://api.dropboxapi.com/2/files/list_folder", { method: "POST", headers: { Authorization: `Bearer ${conn.access_token}`, "Content-Type": "application/json" }, body: JSON.stringify({ path: "", recursive: false }), cache: "no-store" }); }
  if (!res.ok) return NextResponse.json({ connected: false, data: [], error: "Could not read Dropbox files" }, { status: 401 });
  const json = await res.json();
  return NextResponse.json({ connected: true, account_email: conn.account_email, data: json.entries || [] });
}
