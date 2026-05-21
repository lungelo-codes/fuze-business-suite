
import { NextResponse } from "next/server";
import { erpCreate, erpList, erpMethod } from "@/lib/server/erpnext";
import { requireSaaSUser, safeJsonError } from "@/lib/server/apiGuard";

type Row = Record<string, unknown>;
const DEFAULT_TARGETS = ["Employee","Department","Designation","Branch","Employee Grade","Employment Type","Gender","Leave Type","Shift Type","Holiday List","Company","Salary Structure","Salary Component","Job Opening","Job Applicant","Interview Round","Interview Type","Appraisal Template","Training Program","Vehicle","Loan Type","Expense Claim Type","Project","User"];

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


function quickValues(doctype: string, label: string): Record<string, unknown> {
  const clean = label.trim();
  const map: Record<string, Record<string, unknown>> = {
    Department: { department_name: clean },
    Branch: { branch: clean },
    Designation: { designation_name: clean },
    "Employee Grade": { employee_grade: clean },
    "Employment Type": { employee_type_name: clean },
    Gender: { gender: clean },
    "Leave Type": { leave_type_name: clean },
    "Shift Type": { shift_type_name: clean, start_time: "08:00:00", end_time: "17:00:00" },
    "Holiday List": { holiday_list_name: clean },
    "Interview Round": { interview_round: clean },
    "Interview Type": { interview_type: clean },
    "Training Program": { training_program: clean },
    "Loan Type": { loan_name: clean },
    "Expense Claim Type": { expense_type: clean },
  };
  return map[doctype] || { name: clean };
}

export async function POST(req: Request) {
  try {
    requireSaaSUser();
    const body = await req.json().catch(() => ({}));
    const doctype = String(body.doctype || "");
    const label = String(body.label || body.name || "").trim();
    if (!doctype || !label) return NextResponse.json({ ok: false, error: "Missing option details" }, { status: 400 });
    let created: any;
    try {
      created = await erpMethod("business_crud.quick_create", { doctype, label, values: quickValues(doctype, label) });
    } catch {
      created = await erpCreate<Row>(doctype, quickValues(doctype, label));
    }
    const row = {
      name: String(created?.data?.name || created?.data?.id || created?.message?.name || created?.name || label),
      label: String(created?.data?.label || created?.data?.name || created?.message?.label || created?.message?.name || label),
    };
    return NextResponse.json({ ok: true, data: row, record: row }, { status: 201 });
  } catch (error: unknown) {
    return safeJsonError(error, "Could not create HR option.");
  }
}
