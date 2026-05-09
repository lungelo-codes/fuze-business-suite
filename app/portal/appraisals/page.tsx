import CrudModulePage from "@/components/crud/CrudModulePage";
import { getCrudConfig } from "@/lib/crudConfig";
import { getCrudRows } from "@/lib/server/crudData";

export default async function Page() {
  const config = getCrudConfig("appraisals");
  const rows = await getCrudRows("appraisals").catch(() => []);
  if (!config) return <div>Unknown module</div>;
  return <CrudModulePage moduleId="appraisals" config={config} initialRows={rows} />;
}
