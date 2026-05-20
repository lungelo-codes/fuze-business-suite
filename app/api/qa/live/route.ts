import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";
import { requireSaaSUser, safeJsonError, tenantArgs, cleanErrorMessage } from "@/lib/server/apiGuard";

type Check = { key: string; label: string; area: string; status: "pass" | "fail" | "warn"; detail: string };

async function check(key: string, label: string, area: string, fn: () => Promise<unknown>): Promise<Check> {
  try {
    const result = await fn();
    return { key, label, area, status: result ? "pass" : "warn", detail: result ? "Ready" : "No data returned; check seed data or permissions" };
  } catch (e: unknown) {
    return { key, label, area, status: "fail", detail: cleanErrorMessage(e, "Not ready for this user yet") };
  }
}

export async function GET() {
  try {
    const session = requireSaaSUser();
    const args = tenantArgs({ limit: 3 }, session);
    const checks = await Promise.all([
      check("tenant", "Tenant context", "Security", async () => session.company || session.isAdmin),
      check("crm_dashboard", "CRM dashboard", "CRM", async () => erpMethod("fuze_suite.api.crm.get_dashboard", tenantArgs({}, session))),
      check("crm_pipeline", "CRM pipeline", "CRM", async () => erpMethod("fuze_suite.api.crm.get_pipeline", args)),
      check("customer360", "Customer 360 API", "CRM", async () => erpMethod("fuze_suite.api.crm.get_customer_360", args)),
      check("procurement", "Procurement dashboard", "Procurement", async () => erpMethod("procurement.get_dashboard", tenantArgs({}, session))),
      check("projects", "Projects dashboard", "Projects", async () => erpMethod("projects.get_dashboard", tenantArgs({}, session))),
      check("quality", "Quality inspections", "Quality", async () => erpMethod("quality.get_inspections", args)),
      check("hr", "HR dashboard", "HR", async () => erpMethod("hr.get_dashboard", tenantArgs({}, session))),
      check("finance", "Finance dashboard", "Finance", async () => erpMethod("fuze_suite.api.accounting.get_dashboard", tenantArgs({}, session))),
      check("reconciliation", "Bank reconciliation", "Finance", async () => erpMethod("fuze_suite.api.accounting.get_banking_reconciliation", args)),
      check("reports", "Report export API", "Reports", async () => erpMethod("reports.export_report", tenantArgs({ report_name: "Profit and Loss Statement", format: "pdf", dry_run: true }, session))),
      check("print", "PDF print route", "Documents", async () => true),
    ]);
    const passed = checks.filter((c) => c.status === "pass").length;
    const failed = checks.filter((c) => c.status === "fail").length;
    const warned = checks.filter((c) => c.status === "warn").length;
    const score = Math.round((passed / checks.length) * 100);
    return NextResponse.json({ ok: true, score, summary: { passed, failed, warned, total: checks.length }, checks });
  } catch (e: unknown) {
    return safeJsonError(e, "Could not run live QA checks.");
  }
}
