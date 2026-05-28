import AIAssistantPanel from "@/components/ai/AIAssistantPanel";
import HRWorkspaceClient from "@/components/hr/HRWorkspaceClient";

export default function HRPage({ searchParams }: { searchParams?: { tab?: string } }) {
  return <><AIAssistantPanel moduleName="hr" title="HR AI Analyst" /><HRWorkspaceClient initialTab={searchParams?.tab} /></>;
}
