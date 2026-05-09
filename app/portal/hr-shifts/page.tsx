import CrudModulePage from "@/components/crud/CrudModulePage";
import { getCrudConfig } from "@/lib/crudConfig";
import { getCrudRows } from "@/lib/server/crudData";

export default async function Page() {
  const config = getCrudConfig("hr-shifts");
  const rows = await getCrudRows("hr-shifts").catch(() => []);
  if (!config) return <div>Unknown module</div>;
  return <CrudModulePage moduleId="hr-shifts" config={config} initialRows={rows} />;
}
