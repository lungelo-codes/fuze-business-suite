import SimpleTable, { StatusCell } from "@/components/SimpleTable";
import { getModuleData } from "@/lib/server/data";

export default async function Page() {
  const data = await getModuleData("payments");

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Payments</h1>
          <div className="page-sub">Payment Entry records from ERPNext</div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h3>Payments</h3>
        </div>
        <div className="card-body">
          <SimpleTable
            data={data}
            columns={[
              { key: "name", label: "Payment" },
{ key: "party", label: "Party" },
{ key: "posting_date", label: "Date" },
{ key: "paid_amount", label: "Amount" },
{ key: "payment_type", label: "Type" },
{ key: "status", label: "Status", render: (row) => <StatusCell status={row.status} /> }
            ]}
          />
        </div>
      </div>
    </div>
  );
}
