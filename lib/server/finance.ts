import { erpCreate, erpList, erpMethod, erpPatch, erpPost } from "@/lib/server/erpnext";

type Row = Record<string, any>;
const n = (v: any) => Number.isFinite(Number(v ?? 0)) ? Number(v ?? 0) : 0;
async function safeList<T extends Row>(doctype: string, opts: any, fallback: T[] = []): Promise<T[]> { try { return await erpList<T>(doctype, opts); } catch { return fallback; } }
const today = () => new Date().toISOString().slice(0, 10);
const month = (v?: string) => { const d = new Date(v || ""); return Number.isNaN(d.getTime()) ? String(v || "Unknown").slice(0, 7) : d.toLocaleDateString("en-ZA", { month: "short", year: "2-digit" }); };
const age = (v?: string) => { const d = new Date(v || ""); return Number.isNaN(d.getTime()) ? 0 : Math.floor((Date.now() - d.getTime()) / 86400000); };
function add(map: Map<string, Row>, date: string | undefined, key: string, amount: number) { const label = month(date); const r = map.get(label) || { label }; r[key] = n(r[key]) + amount; map.set(label, r); }

export async function getFinancialDashboard() {
  const [sales, purchases, payments, accounts, subs] = await Promise.all([
    safeList<Row>("Sales Invoice", { fields: ["name", "customer", "posting_date", "due_date", "grand_total", "outstanding_amount", "status", "docstatus"], limit: 500, orderBy: "posting_date asc" }),
    safeList<Row>("Purchase Invoice", { fields: ["name", "supplier", "posting_date", "due_date", "grand_total", "outstanding_amount", "status", "docstatus"], limit: 500, orderBy: "posting_date asc" }),
    safeList<Row>("Payment Entry", { fields: ["name", "posting_date", "payment_type", "party", "paid_amount", "received_amount", "reference_no", "clearance_date", "status"], limit: 500, orderBy: "posting_date asc" }),
    safeList<Row>("Account", { fields: ["name", "account_name", "account_type", "root_type", "is_group"], limit: 500 }),
    safeList<Row>("Subscription", { fields: ["name", "party", "status", "current_invoice_start", "current_invoice_end", "next_schedule_date", "end_date", "trial_period_end"], limit: 100, orderBy: "modified desc" }),
  ]);
  const revenue = sales.reduce((s, x) => s + n(x.grand_total), 0), expenses = purchases.reduce((s, x) => s + n(x.grand_total), 0);
  const receivables = sales.reduce((s, x) => s + n(x.outstanding_amount), 0), payables = purchases.reduce((s, x) => s + n(x.outstanding_amount), 0);
  const cashIn = payments.filter((p) => String(p.payment_type || "").toLowerCase().includes("receive")).reduce((s, p) => s + n(p.paid_amount || p.received_amount), 0);
  const cashOut = payments.filter((p) => String(p.payment_type || "").toLowerCase().includes("pay")).reduce((s, p) => s + n(p.paid_amount), 0);
  const monthly = new Map<string, Row>();
  sales.forEach((x) => add(monthly, x.posting_date, "income", n(x.grand_total)));
  purchases.forEach((x) => add(monthly, x.posting_date, "expense", n(x.grand_total)));
  payments.forEach((x) => add(monthly, x.posting_date, String(x.payment_type || "").toLowerCase().includes("receive") ? "cashIn" : "cashOut", n(x.paid_amount || x.received_amount)));
  const aging = ["Current", "1-30", "31-60", "61-90", "90+"].map((bucket) => ({ bucket, receivable: 0, payable: 0 }));
  const bi = (due?: string) => { const a = age(due); return a <= 0 ? 0 : a <= 30 ? 1 : a <= 60 ? 2 : a <= 90 ? 3 : 4; };
  sales.forEach((x) => aging[bi(x.due_date)].receivable += n(x.outstanding_amount));
  purchases.forEach((x) => aging[bi(x.due_date)].payable += n(x.outstanding_amount));
  return { kpis: { revenue, expenses, profit: revenue - expenses, cashBalance: cashIn - cashOut, receivables, payables, cashIn, cashOut }, monthly: Array.from(monthly.values()).slice(-12), aging, overdueInvoices: sales.filter((x) => n(x.outstanding_amount) > 0 && String(x.due_date || today()) < today()).slice(0, 12), accountsSummary: { totalAccounts: accounts.length, incomeAccounts: accounts.filter((a) => a.root_type === "Income").length, expenseAccounts: accounts.filter((a) => a.root_type === "Expense").length, bankAccounts: accounts.filter((a) => String(a.account_type || "").toLowerCase().includes("bank")).length }, subscriptions: subs.slice(0, 12) };
}
export async function runFinancialReport(report_name: string, filters: Row = {}) { return await erpMethod<Row>("frappe.desk.query_report.run", { report_name, filters, ignore_prepared_report: true }) || { columns: [], result: [] }; }
export async function getVATDashboard() {
  const vatReturns = await safeList<Row>("Fuze VAT Return", { fields: ["name", "company", "status", "from_date", "to_date", "submission_date", "total_sales", "output_vat", "sales_count", "total_purchases", "input_vat", "purchases_count", "net_vat", "vat_payable", "vat_refundable", "efiling_reference", "payment_reference", "modified"], limit: 500, orderBy: "to_date asc" });
  const outputVat = vatReturns.reduce((s, r) => s + n(r.output_vat), 0);
  const inputVat = vatReturns.reduce((s, r) => s + n(r.input_vat), 0);
  const netVat = vatReturns.reduce((s, r) => s + n(r.net_vat), 0) || (outputVat - inputVat);
  const monthly = vatReturns.map((r) => ({ label: month(r.to_date || r.submission_date || r.modified), vatOutput: n(r.output_vat), vatInput: n(r.input_vat), netVat: n(r.net_vat) || n(r.output_vat) - n(r.input_vat), payable: n(r.vat_payable), refundable: n(r.vat_refundable), status: r.status, name: r.name })).slice(-12);
  const byStatus = vatReturns.reduce((acc: Row, r) => { const key = String(r.status || "Unknown"); acc[key] = n(acc[key]) + 1; return acc; }, {});
  return { outputVat, inputVat, netVat, standardRate: 15, monthly, returns: vatReturns.slice(-30).reverse(), byStatus, latest: vatReturns[vatReturns.length - 1] || null };
}
export async function getBankReconciliation() {
  const [bankAccounts, payments, journals] = await Promise.all([safeList<Row>("Account", { fields: ["name", "account_name", "account_type", "account_currency"], filters: [["account_type", "=", "Bank"]], limit: 100 }), safeList<Row>("Payment Entry", { fields: ["name", "posting_date", "payment_type", "party", "paid_amount", "reference_no", "clearance_date", "status"], limit: 200, orderBy: "posting_date desc" }), safeList<Row>("Journal Entry", { fields: ["name", "posting_date", "cheque_no", "total_debit", "total_credit", "clearance_date", "docstatus"], limit: 100, orderBy: "posting_date desc" })]);
  const unreconciledPayments = payments.filter((p) => !p.clearance_date), unreconciledJournals = journals.filter((j) => !j.clearance_date);
  return { bankAccounts, unreconciledPayments, unreconciledJournals, totals: { unreconciledCount: unreconciledPayments.length + unreconciledJournals.length, unreconciledAmount: unreconciledPayments.reduce((s, p) => s + n(p.paid_amount), 0) + unreconciledJournals.reduce((s, j) => s + Math.max(n(j.total_debit), n(j.total_credit)), 0) } };
}
export async function getAuditTrail() { return safeList<Row>("Fuze Audit Log", { fields: ["name", "user", "action", "timestamp", "reference_doctype", "reference_name", "ip_address", "details", "modified"], limit: 200, orderBy: "timestamp desc" }); }
export async function getPayrollDashboard() {
  const [employees, salarySlips, payrollEntries] = await Promise.all([safeList<Row>("Employee", { fields: ["name", "employee_name", "status", "department", "designation"], limit: 300 }), safeList<Row>("Salary Slip", { fields: ["name", "employee", "employee_name", "start_date", "end_date", "gross_pay", "total_deduction", "net_pay", "status", "docstatus"], limit: 300, orderBy: "end_date desc" }), safeList<Row>("Payroll Entry", { fields: ["name", "posting_date", "status", "salary_slips_created", "salary_slips_submitted", "total_amount"], limit: 100, orderBy: "posting_date desc" })]);
  return { employees, salarySlips, payrollEntries, totals: { employees: employees.length, gross: salarySlips.reduce((s, r) => s + n(r.gross_pay), 0), deductions: salarySlips.reduce((s, r) => s + n(r.total_deduction), 0), net: salarySlips.reduce((s, r) => s + n(r.net_pay), 0) } };
}
export async function listPaymentProofs(status?: string) { return erpList<Row>("Payment Proof", { fields: ["name", "tenant", "invoice", "sales_invoice", "amount", "reference_number", "attachment", "proof_of_payment", "status", "owner", "creation", "modified"], filters: status ? [["status", "=", status]] : undefined, limit: 200, orderBy: "creation desc" }); }
export async function submitPaymentProof(input: Row) { try { const r = await erpMethod<Row>("fuze_suite.api.saas.submit_payment_proof", input); if (r) return r; } catch {} const proof = await erpCreate<Row>("Payment Proof", { tenant: input.tenant, invoice: input.invoice, sales_invoice: input.invoice, amount: n(input.amount), reference_number: input.reference_number || input.reference, status: "Pending" }); if (proof?.name && input.filedata && input.filename) { try { await erpPost("/api/method/upload_file", { doctype: "Payment Proof", docname: proof.name, filename: String(input.filename), filedata: String(input.filedata), is_private: 1 }); } catch {} } return proof; }
export async function approvePaymentProof(name: string, input: Row) { try { const r = await erpMethod<Row>("fuze_suite.api.saas.approve_payment_proof", { name, ...input }); if (r) return r; } catch {} const proof = await erpPatch<Row>("Payment Proof", name, { status: "Approved" }); const invoice = String(input.invoice || input.sales_invoice || ""); if (invoice) { try { const inv = await erpMethod<{ data?: Row } | Row>("business_crud.get_doctype", { doctype: "Sales Invoice", name: invoice }); const boxed = inv as { data?: Row }; const doc = boxed?.data || (inv as Row) || {}; const amount = n(input.amount || doc.outstanding_amount || doc.grand_total); await erpMethod("business_crud.create_doctype", { doctype: "Payment Entry", values: { payment_type: "Receive", party_type: "Customer", party: doc.customer, paid_amount: amount, received_amount: amount, reference_no: input.reference_number || name, reference_date: today(), references: [{ reference_doctype: "Sales Invoice", reference_name: invoice, allocated_amount: amount }] } }); } catch {} } return proof; }
export async function rejectPaymentProof(name: string, reason?: string) { try { const r = await erpMethod<Row>("fuze_suite.api.saas.reject_payment_proof", { name, reason }); if (r) return r; } catch {} return erpPatch<Row>("Payment Proof", name, { status: "Rejected", rejection_reason: reason || "Rejected" }); }
