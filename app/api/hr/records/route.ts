
import { NextResponse } from "next/server";
import { erpCreate, erpList, erpMethod, erpPatch } from "@/lib/server/erpnext";
import { requireSaaSUser, safeJsonError, tenantArgs, tenantData } from "@/lib/server/apiGuard";

type Row = Record<string, unknown>;

const GROUPS: Record<string, { doctype: string; key: string; fields: string[]; orderBy?: string; method?: string }[]> = {
  employees: [
    { key: "employees", doctype: "Employee", method: "hr.get_employees", fields: ["name","employee_name","first_name","last_name","department","designation","branch","grade","employment_type","status","company_email","cell_number","date_of_joining","user_id","reports_to","modified"], orderBy: "modified desc" },
  ],
  shift: [
    { key: "shift_types", doctype: "Shift Type", method: "hr.get_shift_types", fields: ["name","start_time","end_time","enable_auto_attendance","holiday_list","modified"], orderBy: "modified desc" },
    { key: "shift_assignments", doctype: "Shift Assignment", method: "hr.get_shift_assignments", fields: ["name","employee","employee_name","shift_type","start_date","end_date","status","docstatus","modified"], orderBy: "modified desc" },
    { key: "shift_requests", doctype: "Shift Request", method: "hr.get_shift_requests", fields: ["name","employee","employee_name","shift_type","from_date","to_date","status","docstatus","modified"], orderBy: "modified desc" },
    { key: "checkins", doctype: "Employee Checkin", method: "hr.get_employee_checkins", fields: ["name","employee","employee_name","time","log_type","shift","device_id","modified"], orderBy: "time desc" },
  ],
  attendance: [
    { key: "attendance", doctype: "Attendance", method: "hr.get_attendance", fields: ["name","employee","employee_name","attendance_date","status","shift","working_hours","in_time","out_time","docstatus","modified"], orderBy: "attendance_date desc" },
    { key: "attendance_requests", doctype: "Attendance Request", method: "hr.get_attendance_requests", fields: ["name","employee","employee_name","from_date","to_date","reason","status","docstatus","modified"], orderBy: "modified desc" },
  ],
  leave: [
    { key: "leave_requests", doctype: "Leave Application", method: "hr.get_leave_requests", fields: ["name","employee","employee_name","leave_type","from_date","to_date","total_leave_days","status","docstatus","description","modified"], orderBy: "from_date desc" },
    { key: "leave_allocations", doctype: "Leave Allocation", method: "hr.get_leave_allocations", fields: ["name","employee","employee_name","leave_type","from_date","to_date","new_leaves_allocated","total_leaves_allocated","docstatus","modified"], orderBy: "modified desc" },
    { key: "leave_types", doctype: "Leave Type", method: "hr.get_leave_types", fields: ["name","is_lwp","is_earned_leave","allow_negative","modified"], orderBy: "modified desc" },
    { key: "holiday_lists", doctype: "Holiday List", method: "hr.get_holiday_lists", fields: ["name","from_date","to_date","total_holidays","modified"], orderBy: "modified desc" },
    { key: "encashments", doctype: "Leave Encashment", method: "hr.get_leave_encashments", fields: ["name","employee","employee_name","leave_type","encashment_date","encashable_days","encashment_amount","docstatus","modified"], orderBy: "modified desc" },
  ],
  recruitment: [
    { key: "job_openings", doctype: "Job Opening", method: "hr.get_job_openings", fields: ["name","job_title","department","designation","status","posted_on","closes_on","modified"], orderBy: "modified desc" },
    { key: "job_applicants", doctype: "Job Applicant", method: "hr.get_job_applicants", fields: ["name","applicant_name","email_id","phone_number","job_title","status","modified"], orderBy: "modified desc" },
    { key: "interviews", doctype: "Interview", method: "hr.get_interviews", fields: ["name","job_applicant","interview_round","status","scheduled_on","modified"], orderBy: "modified desc" },
    { key: "job_offers", doctype: "Job Offer", method: "hr.get_job_offers", fields: ["name","job_applicant","applicant_name","offer_date","status","docstatus","modified"], orderBy: "modified desc" },
    { key: "job_requisitions", doctype: "Job Requisition", method: "hr.get_job_requisitions", fields: ["name","designation","department","requested_by","status","no_of_positions","modified"], orderBy: "modified desc" },
  ],
  performance: [
    { key: "appraisals", doctype: "Appraisal", method: "hr.get_appraisals", fields: ["name","employee","employee_name","appraisal_template","appraisal_cycle","status","docstatus","modified"], orderBy: "modified desc" },
    { key: "appraisal_cycles", doctype: "Appraisal Cycle", method: "hr.get_appraisal_cycles", fields: ["name","cycle_name","start_date","end_date","status","modified"], orderBy: "modified desc" },
    { key: "goals", doctype: "Employee Performance Goal", method: "hr.get_goals", fields: ["name","employee","goal_name","status","progress","modified"], orderBy: "modified desc" },
    { key: "feedback", doctype: "Employee Performance Feedback", method: "hr.get_employee_performance_feedback", fields: ["name","employee","feedback","reviewer","modified"], orderBy: "modified desc" },
  ],
  payroll: [
    { key: "salary_structures", doctype: "Salary Structure", method: "hr.get_salary_structures", fields: ["name","company","is_active","payroll_frequency","currency","modified"], orderBy: "modified desc" },
    { key: "structure_assignments", doctype: "Salary Structure Assignment", method: "hr.get_salary_structure_assignments", fields: ["name","employee","employee_name","salary_structure","from_date","base","docstatus","modified"], orderBy: "modified desc" },
    { key: "salary_slips", doctype: "Salary Slip", fields: ["name","employee","employee_name","start_date","end_date","gross_pay","net_pay","total_deduction","status","docstatus","modified"], orderBy: "modified desc" },
    { key: "payroll_entries", doctype: "Payroll Entry", method: "hr.get_payroll_entries", fields: ["name","company","payroll_frequency","start_date","end_date","status","docstatus","modified"], orderBy: "modified desc" },
    { key: "salary_components", doctype: "Salary Component", method: "hr.get_salary_components", fields: ["name","salary_component","type","amount_based_on_formula","modified"], orderBy: "modified desc" },
    { key: "additional_salary", doctype: "Additional Salary", fields: ["name","employee","employee_name","salary_component","amount","payroll_date","docstatus","modified"], orderBy: "modified desc" },
    { key: "overtime_slips", doctype: "Overtime Slip", fields: ["name","employee","employee_name","overtime_type","from_date","to_date","total_overtime_hours","docstatus","modified"], orderBy: "modified desc" },
    { key: "payroll_corrections", doctype: "Payroll Correction", fields: ["name","employee","employee_name","payroll_date","status","docstatus","modified"], orderBy: "modified desc" },
  ],
  benefits: [
    { key: "employee_advances", doctype: "Employee Advance", method: "hr.get_employee_advances", fields: ["name","employee","employee_name","purpose","advance_amount","paid_amount","status","docstatus","modified"], orderBy: "modified desc" },
    { key: "loans", doctype: "Loan", fields: ["name","applicant","applicant_name","loan_type","loan_amount","status","docstatus","modified"], orderBy: "modified desc" },
    { key: "loan_types", doctype: "Loan Type", fields: ["name","rate_of_interest","maximum_loan_amount","modified"], orderBy: "modified desc" },
    { key: "employee_benefit_applications", doctype: "Employee Benefit Application", fields: ["name","employee","employee_name","payroll_period","docstatus","modified"], orderBy: "modified desc" },
    { key: "employee_benefit_claims", doctype: "Employee Benefit Claim", fields: ["name","employee","employee_name","claim_date","claim_amount","docstatus","modified"], orderBy: "modified desc" },
    { key: "gratuity", doctype: "Gratuity", fields: ["name","employee","employee_name","gratuity_rule","amount","docstatus","modified"], orderBy: "modified desc" },
  ],
  training: [
    { key: "training_programs", doctype: "Training Program", method: "hr.get_training_programs", fields: ["name","training_program","description","modified"], orderBy: "modified desc" },
    { key: "training_events", doctype: "Training Event", method: "hr.get_training_events", fields: ["name","event_name","training_program","event_status","start_time","end_time","modified"], orderBy: "modified desc" },
    { key: "training_results", doctype: "Training Result", method: "hr.get_training_results", fields: ["name","employee","employee_name","training_event","status","modified"], orderBy: "modified desc" },
  ],
  lifecycle: [
    { key: "onboarding", doctype: "Employee Onboarding", method: "hr.get_employee_onboardings", fields: ["name","employee","employee_name","job_applicant","status","docstatus","modified"], orderBy: "modified desc" },
    { key: "promotions", doctype: "Employee Promotion", method: "hr.get_employee_promotions", fields: ["name","employee","employee_name","promotion_date","docstatus","modified"], orderBy: "modified desc" },
    { key: "transfers", doctype: "Employee Transfer", method: "hr.get_employee_transfers", fields: ["name","employee","employee_name","transfer_date","docstatus","modified"], orderBy: "modified desc" },
    { key: "separations", doctype: "Employee Separation", method: "hr.get_employee_separations", fields: ["name","employee","employee_name","status","docstatus","modified"], orderBy: "modified desc" },
    { key: "exit_interviews", doctype: "Exit Interview", method: "hr.get_exit_interviews", fields: ["name","employee","employee_name","status","modified"], orderBy: "modified desc" },
  ],
  fleet: [
    { key: "vehicles", doctype: "Vehicle", method: "hr.get_vehicles", fields: ["name","license_plate","make","model","employee","status","modified"], orderBy: "modified desc" },
    { key: "vehicle_logs", doctype: "Vehicle Log", method: "hr.get_vehicle_logs", fields: ["name","license_plate","employee","date","odometer","fuel_qty","price","modified"], orderBy: "modified desc" },
  ],
};

function rowsFrom(result: unknown, keys: string[]): Row[] {
  const r = result as any;
  if (Array.isArray(r)) return r;
  if (Array.isArray(r?.data)) return r.data;
  if (Array.isArray(r?.message)) return r.message;
  for (const key of keys) {
    if (Array.isArray(r?.data?.[key])) return r.data[key];
    if (Array.isArray(r?.message?.[key])) return r.message[key];
    if (Array.isArray(r?.[key])) return r[key];
  }
  return [];
}

async function loadSource(source: { doctype: string; key: string; fields: string[]; orderBy?: string; method?: string }, args: Record<string, unknown>) {
  if (source.method) {
    try {
      const result = await erpMethod(source.method.replace(/^hr\./, "hr."), { ...args, limit: Number(args.limit || 80), offset: Number(args.offset || 0) });
      const rows = rowsFrom(result, [source.key, source.key.replace(/_/g, ""), source.doctype.toLowerCase().replace(/\s/g, "_")]);
      return rows;
    } catch {
      // safe fallback below
    }
  }
  return erpList<Row>(source.doctype, { fields: source.fields, limit: Number(args.limit || 80), orderBy: source.orderBy || "modified desc" }).catch(() => []);
}

export async function GET(req: Request) {
  try {
    const session = requireSaaSUser();
    const url = new URL(req.url);
    const group = url.searchParams.get("group") || "overview";
    const doctype = url.searchParams.get("doctype");
    const limit = Number(url.searchParams.get("limit") || 80);
    const args = tenantArgs({ limit, offset: Number(url.searchParams.get("offset") || 0) }, session);
    if (url.searchParams.get("employee")) args.employee = url.searchParams.get("employee");
    if (url.searchParams.get("status")) args.status = url.searchParams.get("status");

    if (doctype) {
      const source = Object.values(GROUPS).flat().find((s) => s.doctype === doctype) || { doctype, key: "records", fields: ["name","modified"], orderBy: "modified desc" };
      const rows = await loadSource(source, args);
      return NextResponse.json({ ok: true, data: rows, records: rows, doctype, key: source.key });
    }

    const sources = group === "overview" ? Object.values(GROUPS).flat().slice(0, 22) : (GROUPS[group] || []);
    const entries = await Promise.all(sources.map(async (source) => [source.key, await loadSource(source, args), source.doctype] as const));
    const data: Record<string, unknown> = {};
    const meta: Record<string, string> = {};
    for (const [key, rows, dt] of entries) { data[key] = rows; meta[key] = dt; }
    return NextResponse.json({ ok: true, data, meta, group });
  } catch (error: unknown) {
    return safeJsonError(error, "Could not load HR records.");
  }
}

export async function POST(req: Request) {
  try {
    const session = requireSaaSUser();
    const body = await req.json().catch(() => ({}));
    const doctype = String(body.doctype || "");
    const values = tenantData((body.values || {}) as Record<string, unknown>, session);
    if (!doctype) return NextResponse.json({ ok: false, error: "Missing doctype" }, { status: 400 });
    try { await erpMethod("hr.ensure_runtime_context", {}); } catch {}
    const created = await erpCreate<Row>(doctype, values);
    return NextResponse.json({ ok: true, data: created, record: created }, { status: 201 });
  } catch (error: unknown) {
    return safeJsonError(error, "Could not save HR record.");
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const doctype = String(body.doctype || "");
    const name = String(body.name || "");
    const values = (body.values || {}) as Record<string, unknown>;
    if (!doctype || !name) return NextResponse.json({ ok: false, error: "Missing record" }, { status: 400 });
    try { await erpMethod("hr.ensure_runtime_context", {}); } catch {}
    const updated = await erpPatch<Row>(doctype, name, values);
    return NextResponse.json({ ok: true, data: updated, record: updated });
  } catch (error: unknown) {
    return safeJsonError(error, "Could not update HR record.");
  }
}
