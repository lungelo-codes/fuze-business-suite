import SimpleTable, { StatusCell } from "@/components/SimpleTable";
import { erpList } from "@/lib/server/erpnext";

type EventRow = {
  name: string;
  subject: string;
  starts_on: string;
  ends_on: string;
  event_type?: string;
  status?: string;
  description?: string;
  owner?: string;
  modified?: string;
};

/**
 * Appointments workspace
 *
 * Displays all events for the tenant in a simple tabular view. A calendar view
 * would be ideal, but for now the focus is on surfacing upcoming and past
 * appointments across all users. Future enhancements could integrate a
 * full calendar UI or sync external calendars once connectors are enabled.
 */
export default async function Page() {
  const rows: EventRow[] = await erpList<EventRow>("Event", {
    fields: [
      "name",
      "subject",
      "starts_on",
      "ends_on",
      "event_type",
      "status",
      "description",
      "owner",
      "modified",
    ],
    limit: 100,
    orderBy: "starts_on asc",
  }).catch(() => []);

  const columns = [
    { key: "subject", label: "Subject" },
    {
      key: "starts_on",
      label: "Start",
      render: (row: EventRow) => new Date(row.starts_on).toLocaleString("en-ZA"),
    },
    {
      key: "ends_on",
      label: "End",
      render: (row: EventRow) => new Date(row.ends_on).toLocaleString("en-ZA"),
    },
    { key: "event_type", label: "Type" },
    {
      key: "status",
      label: "Status",
      render: (row: EventRow) => <StatusCell status={row.status} />, // use existing status chip styling
    },
    { key: "owner", label: "Owner" },
    {
      key: "modified",
      label: "Updated",
      render: (row: EventRow) => row.modified?.split(" ")[0] ?? "",
    },
  ];

  return (
    <div className="demo-workspace animate-fade-up">
      <div className="demo-module-titlebar">
        <div>
          <div className="demo-eyebrow">Appointments</div>
          <h1>Calendar</h1>
          <p>View all appointments and events across your organisation. Create appointments via the CRM or projects modules.</p>
        </div>
      </div>
      <div className="demo-panel">
        <div className="demo-panel-head"><div><h3>Upcoming & Past Events</h3><p>Your calendar events</p></div></div>
        <div style={{ padding: "0 0 20px" }}>
          <SimpleTable data={rows} columns={columns as any} empty="No appointments found." />
        </div>
      </div>
    </div>
  );
}