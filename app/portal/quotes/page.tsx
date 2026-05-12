import CrudModulePage from "@/components/crud/CrudModulePage";
import { getCrudConfig } from "@/lib/crudConfig";
import { getCrudRows } from "@/lib/server/crudData";

export default async function Page() {
  const config = getCrudConfig("quotes");
  const rows = await getCrudRows("quotes");
  if (!config) return <div>Unknown module</div>;
  return <CrudModulePage moduleId="quotes" config={config} initialRows={rows} />;
}
