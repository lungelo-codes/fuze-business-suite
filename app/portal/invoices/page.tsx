import SimpleTable, { StatusCell } from "@/components/SimpleTable";
import { getModuleData } from "@/lib/server/data";

export default async function Page() {
  const data = await getModuleData("invoices");

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Invoices</h1>
          <div className="page-sub">Sales Invoice records from ERPNext</div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h3>Invoices</h3>
        </div>
        <div className="card-body">
          <SimpleTable
            data={data}
            columns={[
              { key: "name", label: "Invoice" },
{ key: "customer", label: "Customer" },
{ key: "posting_date", label: "Date" },
{ key: "grand_total", label: "Total" },
{ key: "status", label: "Status", render: (row) => <StatusCell status={row.status} /> }
            ]}
          />
        </div>
      </div>
    </div>
  );
}
