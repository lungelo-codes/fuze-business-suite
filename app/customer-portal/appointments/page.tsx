import PortalDocumentView from "@/components/customer-portal/PortalDocumentView";

export default function AppointmentsPage({ searchParams }: { searchParams?: Record<string, string> }) {
  const appointment = searchParams?.appointment || "APP-NEW";
  const doc = { name: appointment, subject: "Customer appointment", status: "Scheduled", appointment_date: "Next available slot", customer: searchParams?.customer || "Customer" };
  return <PortalDocumentView type="appointment" title="Appointments" subtitle="Customer appointment page for bookings, follow-ups and meeting status." document={doc} actions={[{ label: "Request appointment", href: "/customer-portal", primary: true }, { label: "Back to portal", href: "/customer-portal" }]} />;
}
