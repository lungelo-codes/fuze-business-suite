import SimpleTable, { StatusCell } from "@/components/SimpleTable";
import { getModuleData } from "@/lib/server/data";

export default async function Page() {
  const data = await getModuleData("projects");

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Projects</h1>
          <div className="page-sub">Project records from ERPNext</div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h3>Projects</h3>
        </div>
        <div className="card-body">
          <SimpleTable
            data={data}
            columns={[
              { key: "name", label: "Project" },
{ key: "project_name", label: "Name" },
{ key: "status", label: "Status", render: (row) => <StatusCell status={row.status} /> },
{ key: "expected_start_date", label: "Start" },
{ key: "expected_end_date", label: "End" }
            ]}
          />
        </div>
      </div>
    </div>
  );
}
