import { NextResponse } from "next/server";
import { erpMethod, BusinessSuiteError, getERPNextBaseUrl } from "@/lib/server/erpnext";

export async function POST(req: Request) {
  try {
    const input = await req.formData();
    const file = input.get("file");
    const company = String(input.get("company") || "");
    const target = String(input.get("target") || "company");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing logo file" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");
    const result = await erpMethod<any>("settings.upload_logo", {
      file_name: file.name,
      file_content: base64,
      company,
      target,
    });

    const rawUrl = result?.file_url || result?.logo || result?.data?.file_url || result?.data?.logo || result?.stored_file_url || result?.data?.stored_file_url;
    const base = getERPNextBaseUrl();
    const fileUrl = typeof rawUrl === "string" && rawUrl.startsWith("/") ? `${base}${rawUrl}` : rawUrl;
    return NextResponse.json({ data: { file_url: fileUrl, raw: result } });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Logo upload failed" },
      { status: e instanceof BusinessSuiteError ? e.status : 500 }
    );
  }
}
