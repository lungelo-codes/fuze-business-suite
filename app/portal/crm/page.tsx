import CrmWorkspace from "@/components/crm/CrmWorkspace";
import {
  crmGetDashboard,
  insightsGetPipelineSummary,
  crmGetLeads,
  crmGetCustomers,
} from "@/lib/server/apiClient";
import { getCrudRows } from "@/lib/server/crudData";

type AnyRecord = Record<string, unknown>;

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

export default async function CRMPage() {
  const [dashData, pipelineData, leadsData, customersData, opportunities] = await Promise.all([
    safe(() => crmGetDashboard(), {} as AnyRecord),
    safe(() => insightsGetPipelineSummary(), {} as AnyRecord),
    safe(() => crmGetLeads({ limit: 200 }), {} as AnyRecord),
    safe(() => crmGetCustomers({ limit: 50 }), {} as AnyRecord),
    safe(() => getCrudRows("opportunities"), [] as AnyRecord[]),
  ]);

  const dashboard = (dashData as AnyRecord) ?? {};
  const pipelineSummary = (pipelineData as AnyRecord) ?? {};
  const leads = ((leadsData as AnyRecord)?.leads as AnyRecord[]) ?? [];
  const customers = ((customersData as AnyRecord)?.customers as AnyRecord[]) ?? [];

  return (
    <CrmWorkspace
      dashboard={dashboard}
      pipelineSummary={pipelineSummary}
      leads={leads}
      customers={customers}
      opportunities={opportunities}
    />
  );
}
