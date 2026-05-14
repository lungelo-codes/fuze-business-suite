import CrmWorkspaceClient from "@/components/crm/CrmWorkspaceClient";

/**
 * CRM Workspace page.
 *
 * All data fetching is done client-side in CrmWorkspaceClient via the
 * API routes that proxy to the crm.py backend module:
 *
 *   GET  /api/crm/dashboard          → crm.get_dashboard
 *   GET  /api/crm/statuses           → crm.get_lead_statuses / crm.get_deal_statuses
 *   GET  /api/crm/sources            → crm.get_lead_sources
 *   GET  /api/crm/leads              → crm.get_leads
 *   POST /api/crm/leads              → crm.create_lead
 *   GET  /api/crm/leads/[id]         → crm.get_lead  (notes, tasks, comments, comms)
 *   PUT  /api/crm/leads/[id]         → crm.update_lead
 *   POST /api/crm/leads/[id]/convert → crm.convert_lead_to_deal
 *   GET  /api/crm/deals              → crm.get_pipeline
 *   POST /api/crm/deals              → crm.create_deal
 *   GET  /api/crm/deals/[id]         → crm.get_deal
 *   PUT  /api/crm/deals/[id]         → crm.update_deal / crm.mark_deal_lost
 *   GET  /api/crm/contacts           → crm.get_contacts
 *   POST /api/crm/contacts           → crm.create_contact
 *   GET  /api/crm/organizations      → crm.get_organizations
 *   GET  /api/crm/notes              → crm.get_notes
 *   POST /api/crm/notes              → crm.create_note
 *   DELETE /api/crm/notes/[id]       → crm.delete_note
 *   GET  /api/crm/tasks              → crm.get_tasks
 *   POST /api/crm/tasks              → crm.create_task
 *   PUT  /api/crm/tasks/[id]         → crm.update_task
 *   GET  /api/crm/comments           → crm.get_comments
 *   POST /api/crm/comments           → crm.add_comment
 *   GET  /api/crm/emails             → crm.get_communications
 *   POST /api/crm/emails             → crm.send_email
 */
export default function CRMPage() {
  return <CrmWorkspaceClient />;
}
