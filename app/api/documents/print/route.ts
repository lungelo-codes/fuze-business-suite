import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getERPNextBaseUrl } from "@/lib/server/erpnext";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const doctype = searchParams.get("doctype") || "";
  const name = searchParams.get("name") || "";
  if (!doctype || !name) return NextResponse.json({ error: "Missing document print details" }, { status: 400 });

  const sid = cookies().get("sid")?.value;
  if (!sid) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const baseUrl = getERPNextBaseUrl();
  const upstream = new URL(`${baseUrl}/printview`);
  searchParams.forEach((value, key) => upstream.searchParams.set(key, value));

  const res = await fetch(upstream.toString(), { headers: { Cookie: `sid=${sid}` }, cache: "no-store" });
  const body = await res.arrayBuffer();
  return new NextResponse(body, {
    status: res.status,
    headers: {
      "content-type": res.headers.get("content-type") || "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
