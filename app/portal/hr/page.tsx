import HRWorkspaceClient from "@/components/hr/HRWorkspaceClient";

export default function HRPage({ searchParams }: { searchParams?: { tab?: string } }) {
  return <HRWorkspaceClient initialTab={searchParams?.tab} />;
}
