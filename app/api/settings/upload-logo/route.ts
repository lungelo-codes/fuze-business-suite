import { NextResponse } from "next/server";
const ERPNEXT_URL = process.env.ERPNEXT_URL || process.env.NEXT_PUBLIC_ERPNEXT_URL;
const ERPNEXT_API_KEY = process.env.ERPNEXT_API_KEY;
const ERPNEXT_API_SECRET = process.env.ERPNEXT_API_SECRET;
function authHeaders(): HeadersInit { return ERPNEXT_API_KEY && ERPNEXT_API_SECRET ? { Authorization: `token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}` } : {}; }
export async function POST(req: Request) {
  try {
    if (!ERPNEXT_URL) return NextResponse.json({ error: "Missing ERPNEXT_URL" }, { status: 500 });
    const input = await req.formData();
    const file = input.get("file");
    const company = String(input.get("company") || "");
    if (!(file instanceof File) || !company) return NextResponse.json({ error: "Missing logo file or company" }, { status: 400 });
    const form = new FormData();
    form.set("file", file, file.name);
    form.set("doctype", "Company");
    form.set("docname", company);
    form.set("fieldname", "company_logo");
    form.set("is_private", "0");
    const res = await fetch(`${ERPNEXT_URL}/api/method/upload_file`, { method: "POST", headers: authHeaders(), body: form, cache: "no-store" });
    const text = await res.text();
    let json: any = {}; try { json = JSON.parse(text); } catch { json = { raw: text }; }
    if (!res.ok) return NextResponse.json({ error: json.message || json.exception || "Logo upload failed" }, { status: res.status });
    const fileUrl = json.message?.file_url || json.data?.file_url || json.file_url;
    return NextResponse.json({ data: { file_url: fileUrl, raw: json } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Logo upload failed" }, { status: 500 });
  }
}
