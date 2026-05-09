import CrudModulePage from "@/components/crud/CrudModulePage";
import { getCrudConfig } from "@/lib/crudConfig";
import { getCrudRows } from "@/lib/server/crudData";

export default async function Page() {
  const config = getCrudConfig("hr-transfers");
  const rows = await getCrudRows("hr-transfers").catch(() => []);
  if (!config) return <div>Unknown module</div>;
  return <CrudModulePage moduleId="hr-transfers" config={config} initialRows={rows} />;
}
