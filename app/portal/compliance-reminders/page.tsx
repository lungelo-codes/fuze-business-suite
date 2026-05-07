import CrudModulePage from "@/components/crud/CrudModulePage";
import { getCrudConfig } from "@/lib/crudConfig";
import { getCrudRows } from "@/lib/server/crudData";
export default async function Page() { const config = getCrudConfig("compliance-reminders"); const rows = await getCrudRows("compliance-reminders"); if (!config) return <div>Unknown module</div>; return <CrudModulePage moduleId="compliance-reminders" config={config} initialRows={rows} />; }
