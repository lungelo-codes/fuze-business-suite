import { NextResponse } from "next/server";
import { erpCreate, erpList, erpMethod } from "@/lib/server/erpnext";
import { requireSaaSUser, safeJsonError, tenantArgs } from "@/lib/server/apiGuard";

type Row = Record<string, unknown>;
type OptionRow = { name: string; label: string } & Row;

const DEFAULT_TARGETS = [
  "Employee",
  "Department",
  "Designation",
  "Employee Grade",
  "Employment Type",
  "Gender",
  "Leave Type",
  "Shift Type",
  "Holiday List",
  "Company",
  "Salary Structure",
  "Salary Component",
  "Job Opening",
  "Job Applicant",
  "Interview Round",
  "Interview Type",
  "Appraisal Template",
  "Training Program",
  "Vehicle",
  "Loan Type",
  "Expense Claim Type",
  "Project",
  "User",
];

function asOption(row: unknown): OptionRow | null {
  if (!row) return null;
  if (typeof row === "string") return { name: row, label: row };
  const r = row as Row;
  const name = String(r.name || r.value || r.id || "").trim();
  const label = String(
    r.label ||
      r.employee_name ||
      r.department_name ||
      r.designation_name ||
      r.employee_grade ||
      r.employee_type_name ||
      r.gender ||
      r.leave_type_name ||
      r.shift_type_name ||
      r.holiday_list_name ||
      r.job_title ||
      r.applicant_name ||
      r.round_name ||
      r.interview_round ||
      r.training_program ||
      r.loan_name ||
      r.expense_type ||
      r.full_name ||
      r.email ||
      r.license_plate ||
      r.title ||
      name
  ).trim();
  if (!name) return null;
  return { ...r, name, label: label || name };
}

function unwrapOptions(result: unknown, doctype: string): OptionRow[] {
  const r = result as any;
  const candidates = [
    r?.data?.options?.[doctype],
    r?.message?.options?.[doctype],
    r?.options?.[doctype],
    r?.data?.[doctype],
    r?.message?.[doctype],
    r?.[doctype],
    r?.data,
    r?.message,
    r,
  ];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate.map(asOption).filter(Boolean) as OptionRow[];
  }
  return [];
}

function unwrapAvailable(result: unknown, targets: string[]) {
  const r = result as any;
  const available = r?.data?.available || r?.message?.available || r?.available || {};
  const next: Record<string, boolean> = {};
  for (const target of targets) next[target] = available[target] !== false;
  return next;
}

function fallbackFields(doctype: string) {
  const map: Record<string, string[]> = {
    Employee: ["name", "employee_name", "department", "designation", "status"],
    Department: ["name", "department_name", "company", "parent_department"],
    Designation: ["name", "designation_name"],
    "Employee Grade": ["name", "employee_grade"],
    "Employment Type": ["name", "employee_type_name"],
    Gender: ["name", "gender"],
    "Leave Type": ["name", "leave_type_name", "is_lwp"],
    "Shift Type": ["name", "shift_type_name", "start_time", "end_time"],
    "Holiday List": ["name", "holiday_list_name", "from_date", "to_date"],
    "Job Opening": ["name", "job_title", "status", "company"],
    "Job Applicant": ["name", "applicant_name", "email_id", "job_title", "status"],
    "Interview Round": ["name", "round_name", "interview_round"],
    "Training Program": ["name", "training_program"],
    Vehicle: ["name", "license_plate", "make", "model"],
    User: ["name", "full_name", "email", "enabled"],
  };
  return map[doctype] || ["name"];
}

async function fallbackOptions(doctype: string): Promise<{ rows: OptionRow[]; available: boolean }> {
  try {
    const result = await erpMethod("business_crud.get_options", { doctype, query: "", limit: 120 });
    const rows = unwrapOptions(result, doctype);
    return { rows, available: true };
  } catch {
    // controlled fallback below
  }
  try {
    const rows = await erpList<Row>(doctype, { fields: fallbackFields(doctype), limit: 120, orderBy: "modified desc" });
    return { rows: rows.map(asOption).filter(Boolean) as OptionRow[], available: true };
  } catch {
    return { rows: [], available: false };
  }
}

function quickValues(doctype: string, label: string, company?: string): Record<string, unknown> {
  const clean = label.trim();
  const base: Record<string, unknown> = {};
  const withCompany = () => {
    if (company) base.company = company;
    return base;
  };
  switch (doctype) {
    case "Department":
      return { department_name: clean, ...withCompany() };
    case "Designation":
      return { designation_name: clean };
    case "Employee Grade":
      return { name: clean, employee_grade: clean };
    case "Employment Type":
      return { employee_type_name: clean };
    case "Gender":
      return { gender: clean };
    case "Leave Type":
      return { leave_type_name: clean, is_lwp: 0 };
    case "Shift Type":
      return { shift_type_name: clean, start_time: "08:00:00", end_time: "17:00:00" };
    case "Holiday List":
      return { holiday_list_name: clean };
    case "Interview Round":
      return { round_name: clean, interview_round: clean };
    case "Interview Type":
      return { interview_type: clean };
    case "Training Program":
      return { training_program: clean };
    case "Loan Type":
      return { loan_name: clean };
    case "Expense Claim Type":
      return { expense_type: clean };
    case "Job Opening":
      return { job_title: clean, status: "Open", ...withCompany() };
    default:
      return { name: clean };
  }
}

export async function GET(req: Request) {
  try {
    const session = requireSaaSUser();
    const url = new URL(req.url);
    const targets = (url.searchParams.get("targets") || DEFAULT_TARGETS.join(",")).split(",").map((s) => s.trim()).filter(Boolean);
    const search = url.searchParams.get("search") || "";

    try {
      const result = await erpMethod("hr.get_hr_options", tenantArgs({ targets: targets.join(","), search, limit: 120 }, session));
      const data: Record<string, OptionRow[]> = {};
      for (const target of targets) data[target] = unwrapOptions(result, target);
      const available = unwrapAvailable(result, targets);
      return NextResponse.json({ ok: true, data, options: data, available });
    } catch {
      const entries = await Promise.all(targets.map(async (dt) => {
        const result = await fallbackOptions(dt);
        return [dt, result.rows, result.available] as const;
      }));
      const data: Record<string, OptionRow[]> = {};
      const available: Record<string, boolean> = {};
      for (const [dt, rows, isAvailable] of entries) {
        data[dt] = rows;
        available[dt] = isAvailable;
      }
      return NextResponse.json({ ok: true, data, options: data, available });
    }
  } catch (error: unknown) {
    return safeJsonError(error, "Could not load HR dropdowns.");
  }
}

export async function POST(req: Request) {
  try {
    const session = requireSaaSUser();
    const body = await req.json().catch(() => ({}));
    const doctype = String(body.doctype || "").trim();
    const label = String(body.label || body.name || "").trim();
    if (!doctype || !label) return NextResponse.json({ ok: false, error: "Missing option details" }, { status: 400 });

    try {
      const result = await erpMethod("hr.create_hr_option", tenantArgs({ doctype, label, values: quickValues(doctype, label, session.company) }, session));
      const record = ((result as any)?.data?.record || (result as any)?.message?.record || (result as any)?.record || (result as any)?.data || (result as any)?.message) as Row;
      const row = asOption(record) || { name: label, label };
      return NextResponse.json({ ok: true, data: row, record: row }, { status: 201 });
    } catch {
      const values = quickValues(doctype, label, session.company);
      const created = await erpCreate<Row>(doctype, values);
      const row = asOption(created) || { name: String(created?.name || label), label: String(created?.name || label) };
      return NextResponse.json({ ok: true, data: row, record: row }, { status: 201 });
    }
  } catch (error: unknown) {
    return safeJsonError(error, "Could not create HR option.");
  }
}
