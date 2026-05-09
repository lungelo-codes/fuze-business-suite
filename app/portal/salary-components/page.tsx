import CrudModulePage from "@/components/crud/CrudModulePage";
import { getCrudConfig } from "@/lib/crudConfig";
import { getCrudRows } from "@/lib/server/crudData";

export default async function Page() {
  const config = getCrudConfig("salary-component");
  const rows = await getCrudRows("salary-component").catch(() => []);
  if (!config) return <div>Unknown module</div>;
  return <CrudModulePage moduleId="salary-component" config={config} initialRows={rows} />;
}
