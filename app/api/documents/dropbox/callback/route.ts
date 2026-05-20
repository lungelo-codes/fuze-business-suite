import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

function getBaseUrl(req: Request) { return process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin; }

export async function GET(req: Request) {
  const reqUrl = new URL(req.url);
  const code = reqUrl.searchParams.get("code");
  const state = reqUrl.searchParams.get("state");
  const savedState = req.headers.get("cookie")?.match(/dropbox_oauth_state=([^;]+)/)?.[1];
  if (!code || !state || !savedState || state !== savedState) return NextResponse.redirect(`${getBaseUrl(req)}/portal/documents?provider=dropbox&status=failed`);
  const clientId = process.env.DROPBOX_CLIENT_ID;
  const clientSecret = process.env.DROPBOX_CLIENT_SECRET;
  if (!clientId || !clientSecret) return NextResponse.redirect(`${getBaseUrl(req)}/portal/documents?provider=dropbox&status=missing_env`);
  const redirectUri = `${getBaseUrl(req)}/api/documents/dropbox/callback`;
  const tokenRes = await fetch("https://api.dropboxapi.com/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code, grant_type: "authorization_code", client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri }),
    cache: "no-store",
  });
  if (!tokenRes.ok) return NextResponse.redirect(`${getBaseUrl(req)}/portal/documents?provider=dropbox&status=token_failed`);
  const token = await tokenRes.json() as { access_token?: string; refresh_token?: string; expires_in?: number; account_id?: string };
  let email = "";
  try {
    const profile = await fetch("https://api.dropboxapi.com/2/users/get_current_account", { method: "POST", headers: { Authorization: `Bearer ${token.access_token}` }, cache: "no-store" }).then((r) => r.json());
    email = String(profile?.email || "");
  } catch {}
  const expiresAt = new Date(Date.now() + Math.max(60, Number(token.expires_in || 14400) - 60) * 1000).toISOString().slice(0, 19).replace("T", " ");
  await erpMethod("documents.save_storage_connection", { provider: "dropbox", access_token: token.access_token, refresh_token: token.refresh_token, expires_at: expiresAt, account_email: email });
  const res = NextResponse.redirect(`${getBaseUrl(req)}/portal/documents?provider=dropbox&status=connected`);
  res.cookies.delete("dropbox_oauth_state");
  return res;
}
