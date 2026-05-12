/**
 * /api/compliance/dashboard
 * Unified compliance dashboard: VAT + CIPC + SARS in one response.
 * Powered by fuze_suite.api.compliance
 */
import { NextResponse } from "next/server";
import {
  compGetDashboard,
  compGetSarsProfile,
  compListVatReturns,
  compListCipcReturns,
  compListPayeReturns,
  compListTasks,
  compListReminders,
  compGetCompanyCompliance,
} from "@/lib/server/apiClient";

type AnyRecord = Record<string, unknown>;

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try { return await fn(); } catch { return fallback; }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const company = searchParams.get("company") || undefined;

    const [
      overview,
      sarsProfile,
      vatReturns,
      cipcReturns,
      payeReturns,
      tasks,
      reminders,
      companyCompliance,
    ] = await Promise.all([
      safe(() => compGetDashboard(company), {} as AnyRecord),
      safe(() => compGetSarsProfile(company), {} as AnyRecord),
      safe(() => compListVatReturns({ company, limit: 20 }), {} as AnyRecord),
      safe(() => compListCipcReturns({ company, limit: 20 }), {} as AnyRecord),
      safe(() => compListPayeReturns({ company, limit: 20 }), {} as AnyRecord),
      safe(() => compListTasks({ company, limit: 50 }), {} as AnyRecord),
      safe(() => compListReminders(company, 20), {} as AnyRecord),
      safe(() => compGetCompanyCompliance(company), {} as AnyRecord),
    ]);

    return NextResponse.json({
      overview,
      sarsProfile,
      vatReturns,
      cipcReturns,
      payeReturns,
      tasks,
      reminders,
      companyCompliance,
      _source: "fuze_api",
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load compliance dashboard" },
      { status: 500 }
    );
  }
}
