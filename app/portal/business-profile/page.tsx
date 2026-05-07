import CrudModulePage from "@/components/crud/CrudModulePage";
import { getCrudConfig } from "@/lib/crudConfig";
import { getCrudRows } from "@/lib/server/crudData";
export default async function Page() { const config = getCrudConfig("business-profile"); const rows = await getCrudRows("business-profile"); if (!config) return <div>Unknown module</div>; return <CrudModulePage moduleId="business-profile" config={config} initialRows={rows} />; }
