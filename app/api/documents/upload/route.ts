import { NextResponse } from "next/server";
import { getERPNextBaseUrl } from "@/lib/server/erpnext";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  const form = await req.formData();
  const baseUrl = getERPNextBaseUrl();
  const sid = cookies().get("sid")?.value;
  if (!sid) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const res = await fetch(`${baseUrl}/api/method/upload_file`, {
    method: "POST",
    headers: { Cookie: `sid=${sid}` },
    body: form,
    cache: "no-store",
  });

  const text = await res.text();
  let json: unknown = {};
  try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
  if (!res.ok) return NextResponse.json({ error: "ERPNext upload failed", details: json }, { status: res.status });
  return NextResponse.json(json);
}
