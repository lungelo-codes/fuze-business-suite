import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COMPANY_COOKIE } from "@/lib/modules";
import { askZAI, buildModuleContext } from "@/lib/server/zai";

function companyFromCookie() {
  const raw = cookies().get(COMPANY_COOKIE)?.value || "";
  return raw ? decodeURIComponent(raw) : "";
}

export async function GET(req: Request) {
  try {
    const params = new URL(req.url).searchParams;
    const moduleName = params.get("module") || "overview";
    const company = params.get("company") || companyFromCookie();
    const context = await buildModuleContext(moduleName, company);
    const ai = await askZAI({ module: moduleName, company, context });
    return NextResponse.json({ ok: true, module: moduleName, company, ai, context });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "AI summary failed" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const moduleName = body.module || "overview";
    const company = body.company || companyFromCookie();
    const context = body.context || await buildModuleContext(moduleName, company);
    const ai = await askZAI({ module: moduleName, company, question: body.question, context });
    return NextResponse.json({ ok: true, module: moduleName, company, ai });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "AI summary failed" }, { status: 500 });
  }
}
