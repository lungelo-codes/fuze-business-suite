import CrudModulePage from "@/components/crud/CrudModulePage";
import { getCrudConfig } from "@/lib/crudConfig";
import { getCrudRows } from "@/lib/server/crudData";
export default async function Page() { const config = getCrudConfig("purchase-orders"); const rows = await getCrudRows("purchase-orders"); if (!config) return <div>Unknown module</div>; return <CrudModulePage moduleId="purchase-orders" config={config} initialRows={rows} />; }
