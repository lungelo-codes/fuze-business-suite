import SimpleTable, { StatusCell } from "@/components/SimpleTable";
import { getModuleData } from "@/lib/server/data";

export default async function Page() {
  const data = await getModuleData("chat");

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Chat</h1>
          <div className="page-sub">Communication records from ERPNext</div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h3>Chat</h3>
        </div>
        <div className="card-body">
          <SimpleTable
            data={data}
            columns={[
              { key: "name", label: "Message" },
{ key: "subject", label: "Subject" },
{ key: "sender", label: "Sender" },
{ key: "communication_type", label: "Type" },
{ key: "creation", label: "Created" }
            ]}
          />
        </div>
      </div>
    </div>
  );
}
