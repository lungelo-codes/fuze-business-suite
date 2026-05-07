import CrudModulePage from "@/components/crud/CrudModulePage";
import { getCrudConfig } from "@/lib/crudConfig";
import { getCrudRows } from "@/lib/server/crudData";
export default async function Page() { const config = getCrudConfig("payroll"); const rows = await getCrudRows("payroll"); if (!config) return <div>Unknown module</div>; return <CrudModulePage moduleId="payroll" config={config} initialRows={rows} />; }
