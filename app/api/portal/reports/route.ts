import { NextResponse } from "next/server";
import { erpList, erpMethod } from "@/lib/server/erpnext";
import { format, parseISO } from "date-fns";

type Row = Record<string, unknown>;

function monthKey(d?: unknown): string {
  if (!d) return "Unknown";
  try { return format(parseISO(String(d).split(" ")[0]), "MMM yy"); } catch { return "Unknown"; }
}

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try { return await fn(); } catch { return fallback; }
}

function unwrapRows(v: unknown): Row[] {
  const val = v as Record<string, unknown>;
  if (Array.isArray(v)) return v as Row[];
  for (const k of ["data","message","rows","employees","slips","quotations","orders","suppliers","items"]) {
    if (Array.isArray(val?.[k])) return val[k] as Row[];
  }
  return [];
}

export async function GET() {
  try {
    const [invoices, payments, tasks, issues, employees, payrollRaw, quotations, salesOrders, suppliers, purchaseOrders, items, leaveRaw] = await Promise.all([
      safe(() => erpList<Row>("Sales Invoice", { fields:["name","posting_date","grand_total","outstanding_amount","customer","status"], limit:500, orderBy:"posting_date asc" }), []),
      safe(() => erpList<Row>("Payment Entry", { fields:["name","posting_date","paid_amount","payment_type"], limit:500, orderBy:"posting_date asc" }), []),
      safe(() => erpList<Row>("Task", { fields:["name","status","priority"], limit:500 }), []),
      safe(() => erpList<Row>("Issue", { fields:["name","status","priority"], limit:500 }), []),
      safe(() => erpList<Row>("Employee", { fields:["name","department","status","designation","date_of_joining"], limit:500 }), []),
      safe(() => erpMethod<unknown>("hr.get_payroll_summary", {}), {}),
      safe(() => erpList<Row>("Quotation", { fields:["name","transaction_date","grand_total","status","customer"], limit:300, orderBy:"transaction_date asc" }), []),
      safe(() => erpList<Row>("Sales Order", { fields:["name","transaction_date","grand_total","status","customer"], limit:300, orderBy:"transaction_date asc" }), []),
      safe(() => erpList<Row>("Supplier", { fields:["name","supplier_type","supplier_group"], limit:300 }), []),
      safe(() => erpList<Row>("Purchase Order", { fields:["name","supplier","grand_total","status","transaction_date"], limit:300 }), []),
      safe(() => erpList<Row>("Item", { fields:["name","item_group","item_name","valuation_rate"], limit:300 }), []),
      safe(() => erpList<Row>("Leave Application", { fields:["name","leave_type","status","from_date"], limit:300, orderBy:"from_date asc" }), []),
    ]);

    // ── Finance ────────────────────────────────────────────────────────────
    const invMap: Record<string,{total:number;count:number}> = {};
    for (const inv of invoices) {
      const k = monthKey(inv.posting_date);
      if (!invMap[k]) invMap[k] = { total:0, count:0 };
      invMap[k].total += Number(inv.grand_total||0);
      invMap[k].count += 1;
    }
    const invoicesByMonth = Object.entries(invMap).filter(([k]) => k!=="Unknown").slice(-12).map(([month,v]) => ({ month,...v }));

    const payMap: Record<string,number> = {};
    for (const p of payments) {
      const k = monthKey(p.posting_date);
      payMap[k] = (payMap[k]||0) + Number(p.paid_amount||0);
    }
    const paymentsByMonth = Object.entries(payMap).filter(([k]) => k!=="Unknown").slice(-12).map(([month,total]) => ({ month,total }));

    const invoiceStatusMap: Record<string,number> = {};
    invoices.forEach((i) => { const s=String(i.status||"Unknown"); invoiceStatusMap[s]=(invoiceStatusMap[s]||0)+1; });
    const invoicesByStatus = Object.entries(invoiceStatusMap).map(([status,count]) => ({ status,count }));

    const outstanding = invoices.reduce((s,i) => s+Number(i.outstanding_amount||0), 0);
    const totalRevenue = invoices.reduce((s,i) => s+Number(i.grand_total||0), 0);

    // ── Customers ─────────────────────────────────────────────────────────
    const custMap: Record<string,number> = {};
    invoices.forEach((i) => { if (i.customer) { custMap[String(i.customer)]=(custMap[String(i.customer)]||0)+Number(i.grand_total||0); } });
    const topCustomers = Object.entries(custMap).sort((a,b) => b[1]-a[1]).slice(0,10).map(([name,total]) => ({ name,total }));

    const custGroupMap: Record<string,number> = {};
    // Combine quotation + invoice customers
    [...invoices,...quotations].forEach((r) => { if (r.customer) { custGroupMap[String(r.customer).slice(0,1).toUpperCase()+" Group"]=(custGroupMap[String(r.customer).slice(0,1).toUpperCase()+" Group"]||0)+1; }});
    const customersByGroup = Object.entries(custGroupMap).slice(0,6).map(([group,count]) => ({ group,count }));

    // ── HR ─────────────────────────────────────────────────────────────────
    const deptMap: Record<string,number> = {};
    employees.forEach((e) => { const d=String(e.department||"No Department"); deptMap[d]=(deptMap[d]||0)+1; });
    const employeesByDept = Object.entries(deptMap).sort((a,b) => b[1]-a[1]).slice(0,8).map(([dept,count]) => ({ dept,count }));

    const empStatusMap: Record<string,number> = {};
    employees.forEach((e) => { const s=String(e.status||"Active"); empStatusMap[s]=(empStatusMap[s]||0)+1; });
    const employeesByStatus = Object.entries(empStatusMap).map(([status,count]) => ({ status,count }));

    const leaveTypeMap: Record<string,number> = {};
    leaveRaw.forEach((l) => { const t=String(l.leave_type||"Other"); leaveTypeMap[t]=(leaveTypeMap[t]||0)+1; });
    const leaveByType = Object.entries(leaveTypeMap).map(([type,count]) => ({ type,count }));

    const payrollMeta = unwrapRows(payrollRaw);
    const payrollByMonth = payrollMeta.slice(-12).map((p,i) => ({
      month: String(p.month_name || monthKey(p.start_date) || `M${i+1}`),
      gross: Number(p.total_gross||p.gross||0),
      net: Number(p.total_net||p.net||0),
    })).filter((p) => p.gross>0 || p.net>0);

    // ── Sales pipeline ─────────────────────────────────────────────────────
    const quoteMap: Record<string,number> = {};
    quotations.forEach((q) => { const k=monthKey(q.transaction_date); if(k!=="Unknown") quoteMap[k]=(quoteMap[k]||0)+Number(q.grand_total||0); });
    const quotationsByMonth = Object.entries(quoteMap).slice(-12).map(([month,total]) => ({ month,total }));

    const salesStatusMap: Record<string,number> = {};
    salesOrders.forEach((o) => { const s=String(o.status||"Draft"); salesStatusMap[s]=(salesStatusMap[s]||0)+1; });
    const salesOrdersByStatus = Object.entries(salesStatusMap).map(([status,count]) => ({ status,count }));

    const salesRevenue = salesOrders.reduce((s,o) => s+Number(o.grand_total||0), 0);
    const quoteTotal = quotations.reduce((s,q) => s+Number(q.grand_total||0), 0);
    const conversionRate = quotations.length > 0 ? Math.round((salesOrders.length / quotations.length) * 100) : 0;

    // ── Procurement ────────────────────────────────────────────────────────
    const supplierGroupMap: Record<string,number> = {};
    suppliers.forEach((s) => { const g=String(s.supplier_group||s.supplier_type||"Other"); supplierGroupMap[g]=(supplierGroupMap[g]||0)+1; });
    const suppliersByGroup = Object.entries(supplierGroupMap).map(([group,count]) => ({ group,count }));

    const poStatusMap: Record<string,number> = {};
    purchaseOrders.forEach((o) => { const s=String(o.status||"Draft"); poStatusMap[s]=(poStatusMap[s]||0)+1; });
    const purchaseOrdersByStatus = Object.entries(poStatusMap).map(([status,count]) => ({ status,count }));

    const totalPoValue = purchaseOrders.reduce((s,o) => s+Number(o.grand_total||0), 0);

    // ── Inventory ─────────────────────────────────────────────────────────
    const itemGroupMap: Record<string,number> = {};
    items.forEach((i) => { const g=String(i.item_group||"Other"); itemGroupMap[g]=(itemGroupMap[g]||0)+1; });
    const itemsByGroup = Object.entries(itemGroupMap).slice(0,8).map(([group,count]) => ({ group,count }));

    // ── Operations ─────────────────────────────────────────────────────────
    const taskStatusMap: Record<string,number> = {};
    tasks.forEach((t) => { const s=String(t.status||"Unknown"); taskStatusMap[s]=(taskStatusMap[s]||0)+1; });
    const tasksByStatus = Object.entries(taskStatusMap).map(([status,count]) => ({ status,count }));

    const issueStatusMap: Record<string,number> = {};
    issues.forEach((i) => { const s=String(i.status||"Unknown"); issueStatusMap[s]=(issueStatusMap[s]||0)+1; });
    const supportByStatus = Object.entries(issueStatusMap).map(([status,count]) => ({ status,count }));

    return NextResponse.json({
      // Finance
      invoicesByMonth, paymentsByMonth, invoicesByStatus, outstanding, totalRevenue,
      // Customers
      topCustomers, customersByGroup,
      // HR
      employeesByDept, employeesByStatus, leaveByType, payrollByMonth,
      totalEmployees: employees.length,
      // Sales pipeline
      quotationsByMonth, salesOrdersByStatus, salesRevenue, quoteTotal, conversionRate,
      totalQuotes: quotations.length, totalSalesOrders: salesOrders.length,
      // Procurement
      suppliersByGroup, purchaseOrdersByStatus, totalPoValue,
      totalSuppliers: suppliers.length, totalPurchaseOrders: purchaseOrders.length,
      // Inventory
      itemsByGroup, totalItems: items.length,
      // Operations
      tasksByStatus, supportByStatus,
      totalTasks: tasks.length, totalIssues: issues.length,
    });
  } catch {
    return NextResponse.json(null, { status:200 });
  }
}
