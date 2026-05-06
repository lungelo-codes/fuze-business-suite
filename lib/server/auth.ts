import { NextResponse } from "next/server";
import { ERPNextError } from "./erpnext";

const DEFAULT_ERPNEXT_URL = process.env.ERPNEXT_URL || process.env.NEXT_PUBLIC_ERPNEXT_URL || "https://business-suite.fuzedigital.co.za";

function cleanUrl(url?: string | null): string {
  return (url || DEFAULT_ERPNEXT_URL).replace(/\/$/, "");
}

export async function erpLogin(email: string, password: string, siteUrl?: string): Promise<{
  body: unknown;
  setCookie?: string;
  erpUrl: string;
}> {
  const erpUrl = cleanUrl(siteUrl || DEFAULT_ERPNEXT_URL);
  const res = await fetch(`${erpUrl}/api/method/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usr: email, pwd: password }),
    cache: "no-store",
    redirect: "manual"
  });

  const text = await res.text();
  let body: unknown = {};
  try { body = text ? JSON.parse(text) : {}; } catch { body = { raw: text }; }
  if (!res.ok) throw new ERPNextError("Login failed. Check your email, password, and tenant URL.", res.status);

  return { body, setCookie: res.headers.get("set-cookie") || undefined, erpUrl };
}

export function attachERPSetCookie(response: NextResponse, setCookie?: string): NextResponse {
  if (setCookie) response.headers.append("set-cookie", setCookie);
  return response;
}
