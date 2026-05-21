"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";

type Any = Record<string, any>;
type HrTab = "overview" | "employees" | "setup" | "shift" | "attendance" | "leave" | "recruitment" | "performance" | "payroll" | "benefits" | "training" | "lifecycle" | "fleet" | "reports";

type Props = {
  initialTab?: string;
  initialEmployees?: Any[];
  initialAttendance?: Any[];
  initialLeave?: Any[];
  initialPayroll?: Any[];
  initialExpenses?: Any[];
  initialRecruitment?: Any[];
  initialAppraisals?: Any[];
  dashMetrics?: Any;
};

type Source = { key: string; label: string; doctype: string; create?: string; columns: { key: string; label: string; money?: boolean; status?: boolean }[]; fields: Field[] };
type OptionRow = { name: string; label: string } & Record<string, any>;
type Field = { name: string; label: string; type?: string; link?: string; options?: string[]; required?: boolean; readonly?: boolean };

const COLORS = ["#28A486", "#242048", "#F59E0B", "#EF4444", "#6366F1", "#14B8A6", "#EC4899"];
const TABS: { id: HrTab; label: string; subtitle: string }[] = [
  { id: "overview", label: "Overview", subtitle: "People, attendance, leave, payroll and lifecycle command centre" },
  { id: "employees", label: "Employees", subtitle: "Employee master, profile, department, reporting line and user link" },
  { id: "setup", label: "HR Setup", subtitle: "Departments, designations, grades, employment types, leave and shift masters available on this tenant" },
  { id: "shift", label: "Shift", subtitle: "Shift types, assignments, requests and employee check-ins" },
  { id: "attendance", label: "Attendance", subtitle: "Attendance, attendance requests and working hours" },
  { id: "leave", label: "Leave", subtitle: "Leave types, allocations, applications, balances and encashment" },
  { id: "recruitment", label: "Job Portal", subtitle: "Job openings, applicants, interviews, offers and requisitions" },
  { id: "performance", label: "Performance", subtitle: "Appraisal cycles, appraisals, goals and feedback" },
  { id: "payroll", label: "Payroll", subtitle: "Salary structures, assignments, slips, entries, overtime and corrections" },
  { id: "benefits", label: "Benefits & Loans", subtitle: "Employee advances, loans, gratuity and flexible benefits" },
  { id: "training", label: "Training", subtitle: "Training programs, events and results" },
  { id: "lifecycle", label: "Lifecycle", subtitle: "Onboarding, promotions, transfers, separations and exits" },
  { id: "fleet", label: "Fleet", subtitle: "Vehicles and vehicle logs assigned to employees" },
  { id: "reports", label: "Reports", subtitle: "HR analytics, payroll, attendance and project profitability indicators" },
];

function normTab(value?: string | null): HrTab {
  const v = String(value || "").toLowerCase();
  const found = TABS.find((t) => t.id === v || t.label.toLowerCase().replace(/\s+/g, "-") === v);
  return found?.id || "overview";
}
function title(s: string) { return s.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase()); }
function txt(v: any) { return v === undefined || v === null || v === "" ? "—" : String(v); }
function money(v: any) { const n = Number(v || 0); return n ? new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 }).format(n) : "—"; }
function dateText(v: any) { if (!v) return "—"; const d = new Date(v); return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" }); }
function rowsFrom(json: any, keys: string[] = []) { const data = json?.data ?? json?.message ?? json ?? {}; if (Array.isArray(data)) return data; for (const k of keys) if (Array.isArray(data?.[k])) return data[k]; if (Array.isArray(json?.records)) return json.records; return []; }
async function api(url: string, init?: RequestInit) { const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers || {}) } }); const json = await res.json().catch(() => ({})); if (!res.ok) throw new Error(json?.error || json?.message || `Request failed (${res.status})`); return json; }
function chipClass(v: any) { const s = String(v || "").toLowerCase(); if (s.includes("reject") || s.includes("absent") || s.includes("cancel") || s.includes("left")) return "chip danger"; if (s.includes("open") || s.includes("draft") || s.includes("pending")) return "chip warn"; if (s.includes("active") || s.includes("present") || s.includes("approved") || s.includes("submit")) return "chip ok"; return "chip info"; }

const employeeFields: Field[] = [
  { name: "first_name", label: "First Name", required: true }, { name: "last_name", label: "Last Name" }, { name: "gender", label: "Gender", link: "Gender" }, { name: "date_of_birth", label: "Date of Birth", type: "date" }, { name: "date_of_joining", label: "Date of Joining", type: "date", required: true }, { name: "status", label: "Status", options: ["Active", "Inactive", "Suspended", "Left"] }, { name: "department", label: "Department", link: "Department" }, { name: "designation", label: "Designation", link: "Designation" }, { name: "grade", label: "Grade", link: "Employee Grade" }, { name: "employment_type", label: "Employment Type", link: "Employment Type" }, { name: "reports_to", label: "Reports To", link: "Employee" }, { name: "company_email", label: "Company Email", type: "email" }, { name: "cell_number", label: "Cell Number" }, { name: "user_id", label: "Linked User", link: "User" },
];
const SOURCES: Record<HrTab, Source[]> = {
  overview: [],
  employees: [{ key: "employees", label: "Employees", doctype: "Employee", create: "New Employee", columns: [{ key: "employee_name", label: "Employee" }, { key: "department", label: "Department" }, { key: "designation", label: "Designation" }, { key: "status", label: "Status", status: true }, { key: "date_of_joining", label: "Joined" }], fields: employeeFields }],
  setup: [
    { key: "departments", label: "Departments", doctype: "Department", create: "New Department", columns: [{ key: "department_name", label: "Department" }, { key: "company", label: "Company" }, { key: "parent_department", label: "Parent" }], fields: [{ name: "department_name", label: "Department Name", required: true }, { name: "company", label: "Company", link: "Company" }, { name: "parent_department", label: "Parent Department", link: "Department" }] },
    { key: "designations", label: "Designations", doctype: "Designation", create: "New Designation", columns: [{ key: "designation_name", label: "Designation" }], fields: [{ name: "designation_name", label: "Designation Name", required: true }] },
    { key: "grades", label: "Employee Grades", doctype: "Employee Grade", create: "New Grade", columns: [{ key: "name", label: "Grade" }], fields: [{ name: "employee_grade", label: "Grade Name" }] },
    { key: "employment_types", label: "Employment Types", doctype: "Employment Type", create: "New Employment Type", columns: [{ key: "name", label: "Employment Type" }], fields: [{ name: "employee_type_name", label: "Employment Type" }] },
    { key: "leave_types", label: "Leave Types", doctype: "Leave Type", create: "New Leave Type", columns: [{ key: "name", label: "Leave Type" }, { key: "is_lwp", label: "LWP" }], fields: [{ name: "leave_type_name", label: "Leave Type", required: true }, { name: "is_lwp", label: "Leave Without Pay", type: "checkbox" }, { name: "is_earned_leave", label: "Earned Leave", type: "checkbox" }] },
    { key: "shift_types", label: "Shift Types", doctype: "Shift Type", create: "New Shift Type", columns: [{ key: "name", label: "Shift" }, { key: "start_time", label: "Start" }, { key: "end_time", label: "End" }], fields: [{ name: "shift_type_name", label: "Shift Type" }, { name: "start_time", label: "Start Time", type: "time" }, { name: "end_time", label: "End Time", type: "time" }, { name: "holiday_list", label: "Holiday List", link: "Holiday List" }] },
    { key: "holiday_lists", label: "Holiday Lists", doctype: "Holiday List", create: "New Holiday List", columns: [{ key: "name", label: "Holiday List" }, { key: "from_date", label: "From" }, { key: "to_date", label: "To" }], fields: [{ name: "holiday_list_name", label: "Holiday List Name" }, { name: "from_date", label: "From", type: "date" }, { name: "to_date", label: "To", type: "date" }] },
  ],
  shift: [
    { key: "shift_types", label: "Shift Types", doctype: "Shift Type", create: "New Shift Type", columns: [{ key: "name", label: "Shift" }, { key: "start_time", label: "Start" }, { key: "end_time", label: "End" }], fields: [{ name: "shift_type", label: "Shift Type" }, { name: "start_time", label: "Start Time", type: "time" }, { name: "end_time", label: "End Time", type: "time" }, { name: "enable_auto_attendance", label: "Auto Attendance", type: "checkbox" }] },
    { key: "shift_assignments", label: "Shift Assignments", doctype: "Shift Assignment", create: "Assign Shift", columns: [{ key: "employee_name", label: "Employee" }, { key: "shift_type", label: "Shift" }, { key: "start_date", label: "Start" }, { key: "end_date", label: "End" }, { key: "status", label: "Status", status: true }], fields: [{ name: "employee", label: "Employee", link: "Employee", required: true }, { name: "shift_type", label: "Shift Type", link: "Shift Type", required: true }, { name: "start_date", label: "Start Date", type: "date", required: true }, { name: "end_date", label: "End Date", type: "date" }] },
    { key: "checkins", label: "Employee Checkins", doctype: "Employee Checkin", create: "New Checkin", columns: [{ key: "employee_name", label: "Employee" }, { key: "time", label: "Time" }, { key: "log_type", label: "In/Out", status: true }, { key: "shift", label: "Shift" }], fields: [{ name: "employee", label: "Employee", link: "Employee", required: true }, { name: "time", label: "Time", type: "datetime-local", required: true }, { name: "log_type", label: "Log Type", options: ["IN", "OUT"] }, { name: "device_id", label: "Device ID" }] },
  ],
  attendance: [
    { key: "attendance", label: "Attendance", doctype: "Attendance", create: "Mark Attendance", columns: [{ key: "employee_name", label: "Employee" }, { key: "attendance_date", label: "Date" }, { key: "shift", label: "Shift" }, { key: "status", label: "Status", status: true }, { key: "working_hours", label: "Hours" }], fields: [{ name: "employee", label: "Employee", link: "Employee", required: true }, { name: "attendance_date", label: "Date", type: "date", required: true }, { name: "shift", label: "Shift", link: "Shift Type" }, { name: "status", label: "Status", options: ["Present", "Absent", "On Leave", "Half Day", "Work From Home"], required: true }, { name: "working_hours", label: "Working Hours", type: "number" }] },
    { key: "attendance_requests", label: "Attendance Requests", doctype: "Attendance Request", create: "New Request", columns: [{ key: "employee_name", label: "Employee" }, { key: "from_date", label: "From" }, { key: "to_date", label: "To" }, { key: "status", label: "Status", status: true }], fields: [{ name: "employee", label: "Employee", link: "Employee", required: true }, { name: "from_date", label: "From", type: "date" }, { name: "to_date", label: "To", type: "date" }, { name: "reason", label: "Reason", type: "textarea" }] },
  ],
  leave: [
    { key: "leave_requests", label: "Leave Applications", doctype: "Leave Application", create: "Apply Leave", columns: [{ key: "employee_name", label: "Employee" }, { key: "leave_type", label: "Leave Type" }, { key: "from_date", label: "From" }, { key: "to_date", label: "To" }, { key: "status", label: "Status", status: true }], fields: [{ name: "employee", label: "Employee", link: "Employee", required: true }, { name: "leave_type", label: "Leave Type", link: "Leave Type", required: true }, { name: "from_date", label: "From", type: "date", required: true }, { name: "to_date", label: "To", type: "date", required: true }, { name: "description", label: "Reason", type: "textarea" }] },
    { key: "leave_allocations", label: "Leave Allocations", doctype: "Leave Allocation", create: "Allocate Leave", columns: [{ key: "employee_name", label: "Employee" }, { key: "leave_type", label: "Type" }, { key: "from_date", label: "From" }, { key: "to_date", label: "To" }, { key: "total_leaves_allocated", label: "Allocated" }], fields: [{ name: "employee", label: "Employee", link: "Employee", required: true }, { name: "leave_type", label: "Leave Type", link: "Leave Type" }, { name: "from_date", label: "From", type: "date" }, { name: "to_date", label: "To", type: "date" }, { name: "new_leaves_allocated", label: "New Leaves", type: "number" }] },
    { key: "leave_types", label: "Leave Types", doctype: "Leave Type", create: "New Leave Type", columns: [{ key: "name", label: "Leave Type" }, { key: "is_lwp", label: "LWP" }, { key: "is_earned_leave", label: "Earned" }], fields: [{ name: "leave_type_name", label: "Leave Type Name" }, { name: "is_lwp", label: "Is LWP", type: "checkbox" }, { name: "is_earned_leave", label: "Earned Leave", type: "checkbox" }] },
  ],
  recruitment: [
    { key: "job_openings", label: "Job Openings", doctype: "Job Opening", create: "Post Job", columns: [{ key: "job_title", label: "Job Title" }, { key: "department", label: "Department" }, { key: "designation", label: "Designation" }, { key: "status", label: "Status", status: true }], fields: [{ name: "job_title", label: "Job Title", required: true }, { name: "department", label: "Department", link: "Department" }, { name: "designation", label: "Designation", link: "Designation" }, { name: "status", label: "Status", options: ["Open", "Closed"] }, { name: "description", label: "Description", type: "textarea" }] },
    { key: "job_applicants", label: "Job Applicants", doctype: "Job Applicant", create: "Add Applicant", columns: [{ key: "applicant_name", label: "Applicant" }, { key: "email_id", label: "Email" }, { key: "job_title", label: "Job" }, { key: "status", label: "Status", status: true }], fields: [{ name: "applicant_name", label: "Applicant Name", required: true }, { name: "email_id", label: "Email", type: "email" }, { name: "phone_number", label: "Phone" }, { name: "job_title", label: "Job Opening", link: "Job Opening" }, { name: "status", label: "Status" }] },
    { key: "interviews", label: "Interviews", doctype: "Interview", create: "Schedule Interview", columns: [{ key: "job_applicant", label: "Applicant" }, { key: "interview_round", label: "Round" }, { key: "scheduled_on", label: "Scheduled" }, { key: "status", label: "Status", status: true }], fields: [{ name: "job_applicant", label: "Applicant", link: "Job Applicant" }, { name: "interview_round", label: "Interview Round" }, { name: "scheduled_on", label: "Scheduled On", type: "datetime-local" }, { name: "status", label: "Status" }] },
  ],
  performance: [
    { key: "appraisals", label: "Appraisals", doctype: "Appraisal", create: "New Appraisal", columns: [{ key: "employee_name", label: "Employee" }, { key: "appraisal_template", label: "Template" }, { key: "status", label: "Status", status: true }], fields: [{ name: "employee", label: "Employee", link: "Employee" }, { name: "appraisal_template", label: "Appraisal Template", link: "Appraisal Template" }, { name: "status", label: "Status" }] },
    { key: "goals", label: "Goals", doctype: "Employee Performance Goal", create: "New Goal", columns: [{ key: "employee", label: "Employee" }, { key: "goal_name", label: "Goal" }, { key: "progress", label: "Progress" }, { key: "status", label: "Status", status: true }], fields: [{ name: "employee", label: "Employee", link: "Employee" }, { name: "goal_name", label: "Goal Name" }, { name: "progress", label: "Progress", type: "number" }, { name: "status", label: "Status" }] },
  ],
  payroll: [
    { key: "salary_structures", label: "Salary Structures", doctype: "Salary Structure", create: "Salary Structure", columns: [{ key: "name", label: "Structure" }, { key: "payroll_frequency", label: "Frequency" }, { key: "is_active", label: "Active" }], fields: [{ name: "name", label: "Name" }, { name: "payroll_frequency", label: "Frequency", options: ["Monthly", "Weekly", "Daily"] }, { name: "is_active", label: "Active", type: "checkbox" }] },
    { key: "structure_assignments", label: "Structure Assignments", doctype: "Salary Structure Assignment", create: "Assign Structure", columns: [{ key: "employee_name", label: "Employee" }, { key: "salary_structure", label: "Structure" }, { key: "from_date", label: "From" }, { key: "base", label: "Base", money: true }], fields: [{ name: "employee", label: "Employee", link: "Employee" }, { name: "salary_structure", label: "Salary Structure", link: "Salary Structure" }, { name: "from_date", label: "From", type: "date" }, { name: "base", label: "Base", type: "number" }] },
    { key: "salary_slips", label: "Salary Slips", doctype: "Salary Slip", create: "Create Slip", columns: [{ key: "employee_name", label: "Employee" }, { key: "start_date", label: "Start" }, { key: "end_date", label: "End" }, { key: "net_pay", label: "Net", money: true }, { key: "status", label: "Status", status: true }], fields: [{ name: "employee", label: "Employee", link: "Employee" }, { name: "start_date", label: "Start", type: "date" }, { name: "end_date", label: "End", type: "date" }, { name: "posting_date", label: "Posting Date", type: "date" }, { name: "payroll_frequency", label: "Frequency", options: ["Monthly", "Weekly", "Daily"] }] },
    { key: "overtime_slips", label: "Overtime", doctype: "Overtime Slip", create: "Overtime Slip", columns: [{ key: "employee_name", label: "Employee" }, { key: "overtime_type", label: "Type" }, { key: "total_overtime_hours", label: "Hours" }], fields: [{ name: "employee", label: "Employee", link: "Employee" }, { name: "overtime_type", label: "Overtime Type" }, { name: "from_date", label: "From", type: "date" }, { name: "to_date", label: "To", type: "date" }] },
  ],
  benefits: [
    { key: "employee_advances", label: "Employee Advances", doctype: "Employee Advance", create: "New Advance", columns: [{ key: "employee_name", label: "Employee" }, { key: "purpose", label: "Purpose" }, { key: "advance_amount", label: "Amount", money: true }, { key: "status", label: "Status", status: true }], fields: [{ name: "employee", label: "Employee", link: "Employee" }, { name: "purpose", label: "Purpose" }, { name: "advance_amount", label: "Amount", type: "number" }, { name: "posting_date", label: "Posting Date", type: "date" }] },
    { key: "loans", label: "Loans", doctype: "Loan", create: "New Loan", columns: [{ key: "applicant_name", label: "Applicant" }, { key: "loan_type", label: "Loan Type" }, { key: "loan_amount", label: "Amount", money: true }, { key: "status", label: "Status", status: true }], fields: [{ name: "applicant", label: "Employee", link: "Employee" }, { name: "loan_type", label: "Loan Type", link: "Loan Type" }, { name: "loan_amount", label: "Amount", type: "number" }] },
    { key: "gratuity", label: "Gratuity", doctype: "Gratuity", create: "New Gratuity", columns: [{ key: "employee_name", label: "Employee" }, { key: "amount", label: "Amount", money: true }, { key: "docstatus", label: "Status", status: true }], fields: [{ name: "employee", label: "Employee", link: "Employee" }, { name: "gratuity_rule", label: "Gratuity Rule" }, { name: "amount", label: "Amount", type: "number" }] },
  ],
  training: [
    { key: "training_programs", label: "Training Programs", doctype: "Training Program", create: "New Program", columns: [{ key: "name", label: "Program" }, { key: "description", label: "Description" }], fields: [{ name: "training_program", label: "Program Name" }, { name: "description", label: "Description", type: "textarea" }] },
    { key: "training_events", label: "Training Events", doctype: "Training Event", create: "New Event", columns: [{ key: "event_name", label: "Event" }, { key: "training_program", label: "Program" }, { key: "event_status", label: "Status", status: true }], fields: [{ name: "event_name", label: "Event Name" }, { name: "training_program", label: "Training Program", link: "Training Program" }, { name: "start_time", label: "Start", type: "datetime-local" }, { name: "end_time", label: "End", type: "datetime-local" }] },
    { key: "training_results", label: "Training Results", doctype: "Training Result", create: "New Result", columns: [{ key: "employee_name", label: "Employee" }, { key: "training_event", label: "Event" }, { key: "status", label: "Status", status: true }], fields: [{ name: "employee", label: "Employee", link: "Employee" }, { name: "training_event", label: "Training Event", link: "Training Event" }, { name: "status", label: "Status" }] },
  ],
  lifecycle: [
    { key: "onboarding", label: "Onboarding", doctype: "Employee Onboarding", create: "Start Onboarding", columns: [{ key: "employee_name", label: "Employee" }, { key: "job_applicant", label: "Applicant" }, { key: "status", label: "Status", status: true }], fields: [{ name: "employee", label: "Employee", link: "Employee" }, { name: "job_applicant", label: "Job Applicant", link: "Job Applicant" }, { name: "status", label: "Status" }] },
    { key: "promotions", label: "Promotions", doctype: "Employee Promotion", create: "New Promotion", columns: [{ key: "employee_name", label: "Employee" }, { key: "promotion_date", label: "Date" }, { key: "docstatus", label: "Status", status: true }], fields: [{ name: "employee", label: "Employee", link: "Employee" }, { name: "promotion_date", label: "Promotion Date", type: "date" }] },
    { key: "transfers", label: "Transfers", doctype: "Employee Transfer", create: "New Transfer", columns: [{ key: "employee_name", label: "Employee" }, { key: "transfer_date", label: "Date" }, { key: "docstatus", label: "Status", status: true }], fields: [{ name: "employee", label: "Employee", link: "Employee" }, { name: "transfer_date", label: "Transfer Date", type: "date" }, { name: "new_company", label: "New Company", link: "Company" }] },
    { key: "separations", label: "Separations", doctype: "Employee Separation", create: "Start Separation", columns: [{ key: "employee_name", label: "Employee" }, { key: "status", label: "Status", status: true }], fields: [{ name: "employee", label: "Employee", link: "Employee" }, { name: "status", label: "Status" }] },
  ],
  fleet: [
    { key: "vehicles", label: "Vehicles", doctype: "Vehicle", create: "New Vehicle", columns: [{ key: "license_plate", label: "Plate" }, { key: "make", label: "Make" }, { key: "model", label: "Model" }, { key: "employee", label: "Employee" }, { key: "status", label: "Status", status: true }], fields: [{ name: "license_plate", label: "License Plate" }, { name: "make", label: "Make" }, { name: "model", label: "Model" }, { name: "employee", label: "Employee", link: "Employee" }, { name: "status", label: "Status" }] },
    { key: "vehicle_logs", label: "Vehicle Logs", doctype: "Vehicle Log", create: "New Log", columns: [{ key: "license_plate", label: "Vehicle" }, { key: "employee", label: "Employee" }, { key: "date", label: "Date" }, { key: "odometer", label: "Odometer" }, { key: "price", label: "Cost", money: true }], fields: [{ name: "license_plate", label: "Vehicle", link: "Vehicle" }, { name: "employee", label: "Employee", link: "Employee" }, { name: "date", label: "Date", type: "date" }, { name: "odometer", label: "Odometer", type: "number" }, { name: "fuel_qty", label: "Fuel Qty", type: "number" }, { name: "price", label: "Cost", type: "number" }] },
  ],
  reports: [],
};

function FieldInput({ field, value, onChange, options, available, onOptionCreated }: { field: Field; value: any; onChange: (v: any) => void; options: Record<string, OptionRow[]>; available: Record<string, boolean>; onOptionCreated: (doctype: string, row: OptionRow) => void }) {
  const opts = field.link ? options[field.link] || [] : [];
  const linkAvailable = field.link ? available[field.link] !== false : true;
  async function addOption() {
    if (!field.link) return;
    const label = window.prompt(`Add new ${field.link}`);
    if (!label?.trim()) return;
    try {
      const json = await api("/api/hr/options", { method: "POST", body: JSON.stringify({ doctype: field.link, label: label.trim() }) });
      const row = (json.data || json.record || json.message || { name: label.trim(), label: label.trim() }) as OptionRow;
      onOptionCreated(field.link, row);
      onChange(row.name || label.trim());
    } catch (error: any) {
      window.alert(error?.message || `Could not add ${field.link}`);
    }
  }
  if (field.options || field.link) return <div className="hr-link-field"><select value={String(value ?? "")} disabled={!linkAvailable && Boolean(field.link)} onChange={(e) => e.target.value === "__add_new__" ? void addOption() : onChange(e.target.value)}><option value="">{linkAvailable ? "Select…" : "Not available on this tenant"}</option>{field.options?.map((o) => <option key={o} value={o}>{o}</option>)}{opts.map((o) => <option key={o.name} value={o.name}>{o.label || o.name}</option>)}{field.link && linkAvailable && <option value="__add_new__">+ Add new {field.link}</option>}</select>{field.link && linkAvailable && <button type="button" className="btn btn-small" onClick={addOption}>Add</button>}</div>;
  if (field.type === "textarea") return <textarea value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} rows={3} />;
  if (field.type === "checkbox") return <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked ? 1 : 0)} />;
  return <input type={field.type || "text"} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} />;
}

function Modal({ mode, source, record, options, available, onClose, onSaved, onOptionCreated }: { mode: "create" | "edit"; source: Source; record?: Any; options: Record<string, OptionRow[]>; available: Record<string, boolean>; onClose: () => void; onSaved: () => void; onOptionCreated: (doctype: string, row: OptionRow) => void }) {
  const [doc, setDoc] = useState<Any>(() => ({ ...(record || {}) }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const editable: Field[] = (source.fields.length ? source.fields : Object.keys(doc).filter((k) => !["name","doctype","owner","creation","modified","modified_by","docstatus","idx"].includes(k)).slice(0, 18).map((name): Field => ({ name, label: title(name) }))).filter((field) => !field.link || available[field.link] !== false);
  async function save() {
    setBusy(true); setError("");
    try {
      if (mode === "create") await api("/api/hr/records", { method: "POST", body: JSON.stringify({ doctype: source.doctype, values: doc }) });
      else await api("/api/hr/records", { method: "PUT", body: JSON.stringify({ doctype: source.doctype, name: record?.name, values: doc }) });
      onSaved(); onClose();
    } catch (e: any) { setError(e?.message || "Could not save record"); } finally { setBusy(false); }
  }
  async function action(actionName: string) {
    setBusy(true); setError("");
    try { await api("/api/hr/action", { method: "POST", body: JSON.stringify({ doctype: source.doctype, name: record?.name, action: actionName }) }); onSaved(); onClose(); } catch (e: any) { setError(e?.message || "Could not complete action"); } finally { setBusy(false); }
  }
  return <div className="hr-modal-backdrop"><div className="hr-modal"><div className="hr-modal-head"><div><span>{source.doctype}</span><h2>{mode === "create" ? source.create || `New ${source.label}` : txt(record?.name)}</h2></div><button onClick={onClose}>×</button></div><div className="hr-form-grid">{editable.map((f) => <label key={f.name}><span>{f.label}{f.required ? " *" : ""}</span><FieldInput field={f} value={doc[f.name]} onChange={(v) => setDoc((d) => ({ ...d, [f.name]: v }))} options={options} available={available} onOptionCreated={onOptionCreated} /></label>)}</div>{error && <div className="hr-error">{error}</div>}<div className="hr-modal-actions">{mode === "edit" && <><button className="btn" onClick={() => action("submit")} disabled={busy}>Submit</button><button className="btn" onClick={() => action("cancel")} disabled={busy}>Cancel Doc</button>{source.doctype === "Leave Application" && <button className="btn" onClick={() => action("approve_leave")} disabled={busy}>Approve Leave</button>}{source.doctype === "Leave Application" && <button className="btn" onClick={() => action("reject_leave")} disabled={busy}>Reject Leave</button>}{source.doctype === "Expense Claim" && <button className="btn" onClick={() => action("approve_expense")} disabled={busy}>Approve Expense</button>}</>}<button className="btn" onClick={onClose}>Close</button><button className="btn btn-teal" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</button></div></div></div>;
}

function DataTable({ source, rows, onOpen }: { source: Source; rows: Any[]; onOpen: (source: Source, row: Any) => void }) {
  return <div className="hr-table-wrap"><table className="demo-table hr-table"><thead><tr>{source.columns.map((c) => <th key={c.key}>{c.label}</th>)}</tr></thead><tbody>{rows.map((r, i) => <tr key={String(r.name || i)} onClick={() => onOpen(source, r)}>{source.columns.map((c) => <td key={c.key}>{c.status ? <span className={chipClass(r[c.key])}>{txt(r[c.key])}</span> : c.money ? money(r[c.key]) : c.key.includes("date") || c.key.endsWith("_on") ? dateText(r[c.key]) : txt(r[c.key])}</td>)}</tr>)}</tbody></table>{!rows.length && <div className="hr-empty"><b>No {source.label.toLowerCase()} yet</b><span>Create one using the action button, or check permissions/setup.</span></div>}</div>;
}

function ReportCard({ title, children }: { title: string; children: React.ReactNode }) { return <section className="demo-panel"><div className="demo-panel-head"><div><h3>{title}</h3></div></div><div style={{ height: 260 }}>{children}</div></section>; }

export default function HRWorkspaceClient({ initialTab }: Props) {
  const params = useSearchParams();
  const [tab, setTab] = useState<HrTab>(() => normTab(initialTab || params.get("tab")));
  const [data, setData] = useState<Record<string, Any[]>>({});
  const [meta, setMeta] = useState<Record<string, string>>({});
  const [options, setOptions] = useState<Record<string, OptionRow[]>>({});
  const [available, setAvailable] = useState<Record<string, boolean>>({});
  const [reports, setReports] = useState<Any>({});
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<{ mode: "create" | "edit"; source: Source; record?: Any } | null>(null);
  const [notice, setNotice] = useState("");
  const sourceAllowed = (source: Source) => available[source.doctype] !== false;
  const rawSources = tab === "overview" ? Object.values(SOURCES).flat().filter(Boolean).slice(0, 10) : SOURCES[tab] || [];
  const sources = rawSources.filter(sourceAllowed);

  async function load(target = tab) {
    setLoading(true);
    try {
      if (target === "reports") {
        const json = await api("/api/hr/reports"); setReports(json.data || json.message || json || {});
      } else {
        const group = target === "overview" ? "overview" : target;
        const json = await api(`/api/hr/records?group=${encodeURIComponent(group)}&limit=120`);
        setData((d) => ({ ...d, ...(json.data || {}) })); setMeta((m) => ({ ...m, ...(json.meta || {}) }));
      }
    } catch (e: any) { setNotice(e?.message || "Could not load HR workspace"); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(tab); }, [tab]);
  useEffect(() => { api("/api/hr/options").then((j) => { setOptions(j.data || j.options || {}); setAvailable(j.available || {}); }).catch(() => undefined); }, []);

  const allRows = useMemo(() => Object.values(data).flat(), [data]);
  const kpis = [
    { label: "Employees", value: (data.employees || []).length || allRows.filter((r) => r.employee_name).length, tab: "employees" as HrTab },
    { label: "Present / Attendance", value: (data.attendance || []).length, tab: "attendance" as HrTab },
    { label: "Leave", value: (data.leave_requests || []).length, tab: "leave" as HrTab },
    { label: "Payroll", value: (data.salary_slips || []).length, tab: "payroll" as HrTab },
    { label: "Jobs", value: (data.job_openings || []).length, tab: "recruitment" as HrTab },
    { label: "Training", value: (data.training_programs || []).length, tab: "training" as HrTab },
  ];
  const currentTitle = TABS.find((t) => t.id === tab) || TABS[0];
  const deptChart = useMemo(() => {
    const rows = data.employees || [];
    const m = new Map<string, number>(); rows.forEach((r) => m.set(String(r.department || "No Department"), (m.get(String(r.department || "No Department")) || 0) + 1));
    return Array.from(m, ([name, value]) => ({ name, value })).slice(0, 8);
  }, [data.employees]);
  const attendanceChart = useMemo(() => {
    const rows = data.attendance || [];
    const m = new Map<string, number>(); rows.forEach((r) => m.set(String(r.status || "Unknown"), (m.get(String(r.status || "Unknown")) || 0) + 1));
    return Array.from(m, ([name, value]) => ({ name, value }));
  }, [data.attendance]);

  function switchTab(t: HrTab) { setTab(t); setQuery(""); history.replaceState(null, "", t === "overview" ? "/portal/hr" : `/portal/hr?tab=${t}`); }
  function filteredRows(source: Source) { const rows = data[source.key] || []; if (!query) return rows; const q = query.toLowerCase(); return rows.filter((r) => JSON.stringify(r).toLowerCase().includes(q)); }
  function exportReportPdf() { window.print(); }
  function addOptionToState(doctype: string, row: OptionRow) {
    setOptions((current) => ({ ...current, [doctype]: [...(current[doctype] || []).filter((x) => x.name !== row.name), row] }));
    setAvailable((current) => ({ ...current, [doctype]: true }));
  }

  return <div className="demo-workspace hr-workspace animate-fade-up"><style jsx global>{`
    .hr-workspace .hr-kpi-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:14px;margin-bottom:16px}.hr-kpi{background:#fff;border:1px solid var(--line);border-radius:16px;padding:16px;text-align:left;box-shadow:var(--shadow);cursor:pointer}.hr-kpi span{display:block;font-size:11px;text-transform:uppercase;color:var(--muted);font-weight:800}.hr-kpi b{font-size:28px;color:var(--navy-ink)}.hr-section-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(420px,1fr));gap:16px}.hr-table-wrap{overflow:auto}.hr-table tr{cursor:pointer}.hr-empty{padding:28px;border:1px dashed var(--line);border-radius:14px;color:var(--muted);display:grid;gap:4px}.hr-modal-backdrop{position:fixed;inset:0;background:rgba(20,20,40,.55);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px}.hr-modal{width:min(1080px,96vw);max-height:92vh;overflow:auto;background:var(--card);border-radius:20px;padding:24px;box-shadow:0 24px 80px rgba(0,0,0,.25)}.hr-modal-head{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:18px}.hr-modal-head h2{margin:0}.hr-modal-head span{font-size:11px;text-transform:uppercase;color:var(--muted);font-weight:800}.hr-modal-head button{border:0;background:transparent;font-size:26px;cursor:pointer}.hr-form-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px}.hr-form-grid label span{display:block;font-size:12px;font-weight:800;color:var(--muted);margin-bottom:5px}.hr-form-grid input,.hr-form-grid select,.hr-form-grid textarea{width:100%;border:1px solid var(--line);border-radius:10px;padding:10px 12px;background:#fff}.hr-link-field{display:flex;gap:8px;align-items:center}.hr-link-field select{flex:1}.hr-link-field .btn-small{padding:9px 10px;white-space:nowrap}.hr-modal-actions{display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap;margin-top:20px}.hr-error{color:var(--danger);background:var(--danger-bg);border-radius:10px;padding:10px;margin-top:12px}@media print{body *{visibility:hidden}.hr-report-print,.hr-report-print *{visibility:visible}.hr-report-print{position:absolute;left:0;top:0;width:100%;background:#fff}.demo-module-titlebar,.demo-tabbar,.demo-module-actions{display:none!important}}
  `}</style><section className="demo-module-titlebar"><div><div className="demo-eyebrow">People Workspace</div><h1>{currentTitle.label}</h1><p>{currentTitle.subtitle}. Same HRMS workflow, cleaner SaaS interface.</p></div><div className="demo-module-actions"><button className="btn btn-teal" onClick={() => setModal({ mode: "create", source: SOURCES.employees[0] })}>+ Employee</button><button className="btn" onClick={() => switchTab("setup")}>HR Setup</button><button className="btn" onClick={() => switchTab("recruitment")}>Job Portal</button><button className="btn" onClick={() => switchTab("reports")}>Reports</button><button className="btn" onClick={() => load(tab)}>Refresh</button></div></section>{notice && <div className="crm-banner">{notice}</div>}<section className="demo-tabbar">{TABS.map((t) => <button key={t.id} className={tab === t.id ? "active" : ""} onClick={() => switchTab(t.id)}>{t.label}</button>)}</section>{loading && <div className="crm-loading"><span /> Loading HR…</div>}{tab === "overview" && <><div className="hr-kpi-grid">{kpis.map((k) => <button key={k.label} className="hr-kpi" onClick={() => switchTab(k.tab)}><span>{k.label}</span><b>{k.value}</b><small>Open {k.label.toLowerCase()}</small></button>)}</div><div className="hr-section-grid"><ReportCard title="Employees by Department"><ResponsiveContainer width="100%" height="100%"><BarChart data={deptChart}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="name"/><YAxis/><Tooltip/><Bar dataKey="value" fill="#28A486" radius={[6,6,0,0]}/></BarChart></ResponsiveContainer></ReportCard><ReportCard title="Attendance by Status"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={attendanceChart} dataKey="value" nameKey="name" outerRadius={90} label>{attendanceChart.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}</Pie><Tooltip/><Legend/></PieChart></ResponsiveContainer></ReportCard></div></>}{tab !== "overview" && tab !== "reports" && <><div style={{display:"flex",justifyContent:"space-between",gap:12,marginBottom:14,flexWrap:"wrap"}}><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder={`Search ${currentTitle.label.toLowerCase()}…`} style={{padding:"10px 12px",border:"1px solid var(--line)",borderRadius:10,minWidth:260}}/><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{sources.map((s) => <button key={s.key} className="btn btn-teal" onClick={() => setModal({ mode: "create", source: s })}>+ {s.create || s.label}</button>)}</div></div><div className="hr-section-grid">{sources.length === 0 && <div className="hr-empty"><b>No HRMS records available for this section</b><span>This tenant does not have those HRMS DocTypes installed or enabled.</span></div>}{sources.map((s) => <section key={s.key} className="demo-panel"><div className="demo-panel-head"><div><h3>{s.label} <span style={{fontSize:12,color:"var(--muted)"}}>({filteredRows(s).length})</span></h3><p>{s.doctype}</p></div><button className="btn" onClick={() => load(tab)}>↺</button></div><DataTable source={s} rows={filteredRows(s)} onOpen={(source, row) => setModal({ mode: "edit", source, record: row })}/></section>)}</div></>}{tab === "reports" && <div className="hr-report-print"><section className="demo-module-titlebar"><div><div className="demo-eyebrow">Business Suite HR Report</div><h1>Human Resources Reports</h1><p>Attendance, leave, payroll, recruitment and performance analytics.</p></div><div className="demo-module-actions"><button className="btn btn-teal" onClick={exportReportPdf}>Export Full Report PDF</button></div></section><div className="hr-kpi-grid"><button className="hr-kpi"><span>Employees</span><b>{reports.kpis?.employees || 0}</b></button><button className="hr-kpi"><span>Active</span><b>{reports.kpis?.active || 0}</b></button><button className="hr-kpi"><span>Payroll</span><b>{money(reports.kpis?.payroll_total)}</b></button><button className="hr-kpi"><span>Expenses</span><b>{money(reports.kpis?.expense_claimed)}</b></button></div><div className="hr-section-grid"><ReportCard title="Employees by Department"><ResponsiveContainer width="100%" height="100%"><BarChart data={reports.employees_by_department || []}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="label"/><YAxis/><Tooltip/><Bar dataKey="value" fill="#28A486" radius={[6,6,0,0]}/></BarChart></ResponsiveContainer></ReportCard><ReportCard title="Leave by Type"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={reports.leave_by_type || []} dataKey="value" nameKey="label" outerRadius={90} label>{(reports.leave_by_type || []).map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}</Pie><Tooltip/><Legend/></PieChart></ResponsiveContainer></ReportCard><ReportCard title="Payroll Gross vs Net"><ResponsiveContainer width="100%" height="100%"><BarChart data={reports.payroll_by_employee || []}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="label"/><YAxis/><Tooltip/><Legend/><Bar dataKey="gross" fill="#242048"/><Bar dataKey="net" fill="#28A486"/></BarChart></ResponsiveContainer></ReportCard><ReportCard title="Attendance by Status"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={reports.attendance_by_status || []} dataKey="value" nameKey="label" outerRadius={90} label>{(reports.attendance_by_status || []).map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}</Pie><Tooltip/><Legend/></PieChart></ResponsiveContainer></ReportCard></div></div>}{modal && <Modal mode={modal.mode} source={modal.source} record={modal.record} options={options} onOptionCreated={addOptionToState} onClose={() => setModal(null)} available={available} onSaved={() => { setModal(null); void load(tab); }}/>}</div>;
}
