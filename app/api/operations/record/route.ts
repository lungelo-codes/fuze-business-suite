import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";
import { safeJsonError } from "@/lib/server/apiGuard";

type Any = Record<string, unknown>;
function unwrap<T>(value: unknown): T { const boxed = value as { data?: T; message?: T }; return (boxed?.data ?? boxed?.message ?? value ?? {}) as T; }

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const doctype = url.searchParams.get("doctype") || "";
    const name = url.searchParams.get("name") || "";
    if (!doctype || !name) return NextResponse.json({ error: "Missing record" }, { status: 400 });
    const result = await erpMethod("business_crud.get_doctype", { doctype, name });
    const doc = unwrap<Any>(result);
    return NextResponse.json({ success: true, data: doc, record: doc });
  } catch (error) {
    return safeJsonError(error, "Could not load record.");
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json().catch(() => ({})) as Any;
    const doctype = String(body.doctype || "");
    const name = String(body.name || "");
    const values = (body.values && typeof body.values === "object" ? body.values : {}) as Any;
    if (!doctype || !name) return NextResponse.json({ error: "Missing record" }, { status: 400 });
    const result = await erpMethod("business_crud.update_doctype", { doctype, name, values });
    const doc = unwrap<Any>(result);
    return NextResponse.json({ success: true, data: doc, record: doc });
  } catch (error) {
    return safeJsonError(error, "Could not update record.");
  }
}
