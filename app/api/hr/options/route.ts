
import { NextResponse } from "next/server";
import { erpList, erpMethod } from "@/lib/server/erpnext";
import { requireSaaSUser, safeJsonError } from "@/lib/server/apiGuard";

type Row = Record<string, unknown>;
const DEFAULT_TARGETS = ["Employee","Department","Designation","Branch","Employee Grade","Employment Type","Gender","Leave Type","Shift Type","Holiday List","Company","Salary Structure","Salary Component","Job Opening","Job Applicant","Appraisal Template","Training Program","Vehicle","Loan Type","Expense Claim Type","Project","User"];

async function optionsFor(doctype: string, search?: string) {
  try {
    const result = await erpMethod("business_crud.get_options", { doctype, query: search || "", limit: 120 }) as any;
    const rows = Array.isArray(result?.data) ? result.data : Array.isArray(result?.message) ? result.message : Array.isArray(result?.options) ? result.options : [];
    return rows.map((r: any) => ({ name: r.name || r.value || r.label || String(r), label: r.label || r.title || r.employee_name || r.customer_name || r.name || String(r) }));
  } catch {
    const fields = ["name", "employee_name", "department_name", "designation_name", "title", "job_title"];
    const rows = await erpList<Row>(doctype, { fields, limit: 120, orderBy: "modified desc" }).catch(() => []);
    return rows.map((r) => ({ name: String(r.name || ""), label: String(r.employee_name || r.department_name || r.designation_name || r.job_title || r.title || r.name || "") })).filter((r) => r.name);
  }
}

export async function GET(req: Request) {
  try {
    requireSaaSUser();
    const url = new URL(req.url);
    const targets = (url.searchParams.get("targets") || DEFAULT_TARGETS.join(",")).split(",").map((s) => s.trim()).filter(Boolean);
    const search = url.searchParams.get("search") || "";
    const entries = await Promise.all(targets.map(async (dt) => [dt, await optionsFor(dt, search)] as const));
    const data: Record<string, unknown> = {};
    for (const [dt, rows] of entries) data[dt] = rows;
    return NextResponse.json({ ok: true, data, options: data });
  } catch (error: unknown) {
    return safeJsonError(error, "Could not load HR dropdowns.");
  }
}
