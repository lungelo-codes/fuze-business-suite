import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

type Body = { id?: string; name?: string; webViewLink?: string; mimeType?: string; attached_to_doctype?: string; attached_to_name?: string };

export async function POST(req: Request) {
  const body = await req.json() as Body;
  if (!body.name || !body.webViewLink) return NextResponse.json({ error: "Missing Google Drive file details" }, { status: 400 });
  const result = await erpMethod("documents.attach_cloud_file", {
    provider: "google",
    file_name: body.name,
    file_url: body.webViewLink,
    cloud_id: body.id,
    mime_type: body.mimeType,
    attached_to_doctype: body.attached_to_doctype,
    attached_to_name: body.attached_to_name,
  });
  const boxed = result as { data?: unknown } | null;
  return NextResponse.json({ data: boxed?.data ?? result });
}
