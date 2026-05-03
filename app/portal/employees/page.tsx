import SimpleTable, { StatusCell } from "@/components/SimpleTable";
import { getModuleData } from "@/lib/server/data";

export default async function Page() {
  const data = await getModuleData("employees");

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Employees</h1>
          <div className="page-sub">Employee records from ERPNext</div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h3>Employees</h3>
        </div>
        <div className="card-body">
          <SimpleTable
            data={data}
            columns={[
              { key: "name", label: "Employee" },
{ key: "employee_name", label: "Name" },
{ key: "department", label: "Department" },
{ key: "designation", label: "Designation" },
{ key: "status", label: "Status", render: (row) => <StatusCell status={row.status} /> }
            ]}
          />
        </div>
      </div>
    </div>
  );
}
