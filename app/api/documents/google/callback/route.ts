import { NextResponse } from "next/server";

function getBaseUrl(req: Request) {
  return process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
}

export async function GET(req: Request) {
  const reqUrl = new URL(req.url);
  const code = reqUrl.searchParams.get("code");
  const state = reqUrl.searchParams.get("state");
  const savedState = req.headers.get("cookie")?.match(/gdrive_oauth_state=([^;]+)/)?.[1];

  if (!code || !state || !savedState || state !== savedState) {
    return NextResponse.redirect(`${getBaseUrl(req)}/portal/documents?provider=google&status=failed`);
  }

  const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${getBaseUrl(req)}/portal/documents?provider=google&status=missing_env`);
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: `${getBaseUrl(req)}/api/documents/google/callback`,
      grant_type: "authorization_code",
    }),
    cache: "no-store",
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${getBaseUrl(req)}/portal/documents?provider=google&status=token_failed`);
  }

  const token = await tokenRes.json() as { access_token?: string; refresh_token?: string; expires_in?: number };
  const res = NextResponse.redirect(`${getBaseUrl(req)}/portal/documents?provider=google&status=connected`);
  res.cookies.delete("gdrive_oauth_state");
  if (token.access_token) {
    res.cookies.set("gdrive_access_token", token.access_token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: Math.max(60, Number(token.expires_in || 3600) - 60),
    });
  }
  if (token.refresh_token) {
    res.cookies.set("gdrive_refresh_token", token.refresh_token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 90,
    });
  }
  res.cookies.set("gdrive_connected", "1", { path: "/", sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 90 });
  return res;
}
