import { NextResponse } from "next/server";

function getBaseUrl(req: Request) {
  return process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
}

export async function GET(req: Request) {
  const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
  if (!clientId) {
    const back = new URL(`${getBaseUrl(req)}/portal/documents`);
    back.searchParams.set("storage", "google");
    back.searchParams.set("setup", "missing_credentials");
    return NextResponse.redirect(back.toString());
  }

  const state = crypto.randomUUID();
  const redirectUri = `${getBaseUrl(req)}/api/documents/google/callback`;
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", state);
  url.searchParams.set("scope", [
    "openid",
    "email",
    "profile",
    "https://www.googleapis.com/auth/drive.metadata.readonly",
    "https://www.googleapis.com/auth/drive.readonly",
  ].join(" "));

  const res = NextResponse.redirect(url.toString());
  res.cookies.set("gdrive_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 10 * 60,
  });
  return res;
}
