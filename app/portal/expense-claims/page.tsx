import CrudModulePage from "@/components/crud/CrudModulePage";
import { getCrudConfig } from "@/lib/crudConfig";
import { getCrudRows } from "@/lib/server/crudData";

export default async function Page() {
  const config = getCrudConfig("expense-claims");
  const rows = await getCrudRows("expense-claims").catch(() => []);
  if (!config) return <div>Unknown module</div>;
  return <CrudModulePage moduleId="expense-claims" config={config} initialRows={rows} />;
}
