import CrudModulePage from "@/components/crud/CrudModulePage";
import { getCrudConfig } from "@/lib/crudConfig";
import { getCrudRows } from "@/lib/server/crudData";

export default async function Page() {
  const config = getCrudConfig("hr-onboarding");
  const rows = await getCrudRows("hr-onboarding").catch(() => []);
  if (!config) return <div>Unknown module</div>;
  return <CrudModulePage moduleId="hr-onboarding" config={config} initialRows={rows} />;
}
