import CrudModulePage from "@/components/crud/CrudModulePage";
import { getCrudConfig } from "@/lib/crudConfig";
import { getCrudRows } from "@/lib/server/crudData";

export default async function Page() {
  const config = getCrudConfig("exit-interviews");
  const rows = await getCrudRows("exit-interviews").catch(() => []);
  if (!config) return <div>Unknown module</div>;
  return <CrudModulePage moduleId="exit-interviews" config={config} initialRows={rows} />;
}
