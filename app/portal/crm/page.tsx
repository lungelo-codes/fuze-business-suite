import CrmWorkspaceClient from "@/components/crm/CrmWorkspaceClient";
import AIAssistantPanel from "@/components/ai/AIAssistantPanel";

/**
 * CRM Workspace page.
 *
 * Leads and Opportunities now live inside this workspace as tabs, so the
 * sidebar keeps the same clean system UI while the CRM flow remains unified.
 */
export default function CRMPage({ searchParams }: { searchParams?: { tab?: string } }) {
  return <><AIAssistantPanel moduleName="crm" title="CRM AI Coach" /><CrmWorkspaceClient initialTab={searchParams?.tab} /></>;
}
