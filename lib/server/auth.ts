import { NextResponse } from "next/server";
import { ERPNextError } from "./erpnext";

const ERPNEXT_URL = process.env.ERPNEXT_URL || process.env.NEXT_PUBLIC_ERPNEXT_URL;

export async function erpLogin(email: string, password: string): Promise<{
  body: unknown;
  setCookie?: string;
}> {
  if (!ERPNEXT_URL) throw new ERPNextError("Missing ERPNEXT_URL");

  const res = await fetch(`${ERPNEXT_URL}/api/method/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ usr: email, pwd: password }),
    cache: "no-store",
    redirect: "manual"
  });

  const text = await res.text();
  let body: unknown = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }

  if (!res.ok) throw new ERPNextError("Login failed", res.status);

  return {
    body,
    setCookie: res.headers.get("set-cookie") || undefined
  };
}

export function attachERPSetCookie(response: NextResponse, setCookie?: string): NextResponse {
  if (setCookie) response.headers.set("set-cookie", setCookie);
  return response;
}
