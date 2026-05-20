import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

type Conn = { provider?: string; access_token?: string; refresh_token?: string; expires_at?: string; account_email?: string; connected?: boolean };
function unwrap<T>(value: unknown): T {
  const boxed = value as { data?: T; message?: T };
  return (boxed?.data ?? boxed?.message ?? value) as T;
}

async function refreshGoogle(conn: Conn) {
  const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
  if (!conn.refresh_token || !clientId || !clientSecret) return conn;
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: conn.refresh_token,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });
  if (!tokenRes.ok) return conn;
  const token = await tokenRes.json() as { access_token?: string; expires_in?: number };
  if (!token.access_token) return conn;
  const expiresAt = new Date(Date.now() + Math.max(60, Number(token.expires_in || 3600) - 60) * 1000).toISOString().slice(0, 19).replace("T", " ");
  await erpMethod("documents.save_storage_connection", { provider: "google", access_token: token.access_token, expires_at: expiresAt, account_email: conn.account_email });
  return { ...conn, access_token: token.access_token, expires_at: expiresAt };
}

export async function GET() {
  let conn = unwrap<Conn>(await erpMethod("documents.get_storage_connection", { provider: "google" }) || {});
  if (!conn?.access_token && conn?.refresh_token) conn = await refreshGoogle(conn);
  if (!conn?.access_token) return NextResponse.json({ connected: false, data: [] });

  let url = new URL("https://www.googleapis.com/drive/v3/files");
  url.searchParams.set("pageSize", "50");
  url.searchParams.set("fields", "files(id,name,mimeType,webViewLink,modifiedTime,size,iconLink)");
  url.searchParams.set("q", "trashed=false");

  let res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${conn.access_token}` }, cache: "no-store" });
  if (res.status === 401 && conn.refresh_token) {
    conn = await refreshGoogle(conn);
    res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${conn.access_token}` }, cache: "no-store" });
  }
  if (!res.ok) return NextResponse.json({ connected: false, data: [], error: "Could not read Google Drive files" }, { status: 401 });
  const json = await res.json();
  return NextResponse.json({ connected: true, account_email: conn.account_email, data: json.files || [] });
}
