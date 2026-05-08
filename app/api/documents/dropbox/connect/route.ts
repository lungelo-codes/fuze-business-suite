import { NextResponse } from "next/server";

function getBaseUrl(req: Request) {
  return process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
}

export async function GET(req: Request) {
  const clientId = process.env.DROPBOX_CLIENT_ID;
  if (!clientId) return NextResponse.json({ error: "Missing DROPBOX_CLIENT_ID" }, { status: 500 });

  const state = crypto.randomUUID();
  const redirectUri = `${getBaseUrl(req)}/api/documents/dropbox/callback`;
  const url = new URL("https://www.dropbox.com/oauth2/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("token_access_type", "offline");
  url.searchParams.set("state", state);

  const res = NextResponse.redirect(url.toString());
  res.cookies.set("dropbox_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 10 * 60,
  });
  return res;
}
