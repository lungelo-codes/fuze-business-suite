import CrudModulePage from "@/components/crud/CrudModulePage";
import { getCrudConfig } from "@/lib/crudConfig";
import { getCrudRows } from "@/lib/server/crudData";

export default async function Page() {
  const config = getCrudConfig("salary-structure");
  const rows = await getCrudRows("salary-structure").catch(() => []);
  if (!config) return <div>Unknown module</div>;
  return <CrudModulePage moduleId="salary-structure" config={config} initialRows={rows} />;
}
