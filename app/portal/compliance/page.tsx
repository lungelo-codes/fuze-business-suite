import ComplianceDashboard from "@/components/compliance/ComplianceDashboard";
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

export default async function CompliancePage() {
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
    safe(() => compGetDashboard(), {} as AnyRecord),
    safe(() => compGetSarsProfile(), {} as AnyRecord),
    safe(() => compListVatReturns({ limit: 20 }), {} as AnyRecord),
    safe(() => compListCipcReturns({ limit: 20 }), {} as AnyRecord),
    safe(() => compListPayeReturns({ limit: 20 }), {} as AnyRecord),
    safe(() => compListTasks({ limit: 50 }), {} as AnyRecord),
    safe(() => compListReminders(undefined, 20), {} as AnyRecord),
    safe(() => compGetCompanyCompliance(), {} as AnyRecord),
  ]);

  return (
    <ComplianceDashboard
      overview={overview as AnyRecord}
      sarsProfile={sarsProfile as AnyRecord}
      vatReturns={vatReturns as AnyRecord}
      cipcReturns={cipcReturns as AnyRecord}
      payeReturns={payeReturns as AnyRecord}
      tasks={tasks as AnyRecord}
      reminders={reminders as AnyRecord}
      companyCompliance={companyCompliance as AnyRecord}
    />
  );
}
