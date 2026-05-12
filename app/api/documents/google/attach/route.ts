import { NextResponse } from "next/server";
import { erpCreate } from "@/lib/server/erpnext";

type Body = {
  name?: string;
  webViewLink?: string;
  attached_to_doctype?: string;
  attached_to_name?: string;
};

export async function POST(req: Request) {
  const body = await req.json() as Body;
  if (!body.name || !body.webViewLink) {
    return NextResponse.json({ error: "Missing Google Drive file details" }, { status: 400 });
  }

  const doc = await erpCreate("File", {
    file_name: body.name,
    file_url: body.webViewLink,
    is_private: 0,
    attached_to_doctype: body.attached_to_doctype || undefined,
    attached_to_name: body.attached_to_name || undefined,
  });

  return NextResponse.json({ data: doc });
}
