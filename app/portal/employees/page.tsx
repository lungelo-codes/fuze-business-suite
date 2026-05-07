import CrudModulePage from "@/components/crud/CrudModulePage";
import { getCrudConfig } from "@/lib/crudConfig";
import { getCrudRows } from "@/lib/server/crudData";
export default async function Page() { const config = getCrudConfig("employees"); const rows = await getCrudRows("employees"); if (!config) return <div>Unknown module</div>; return <CrudModulePage moduleId="employees" config={config} initialRows={rows} />; }
