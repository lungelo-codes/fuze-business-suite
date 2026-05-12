import CrudModulePage from "@/components/crud/CrudModulePage";
import { getCrudConfig } from "@/lib/crudConfig";
import { getCrudRows } from "@/lib/server/crudData";
export default async function Page() { const config = getCrudConfig("company-compliance"); const rows = await getCrudRows("company-compliance"); if (!config) return <div>Unknown module</div>; return <CrudModulePage moduleId="company-compliance" config={config} initialRows={rows} />; }
