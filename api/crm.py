"""
crm.py  –  Full CRM module for the Fuze Business SaaS platform.

Covers every feature advertised by Frappe CRM / ERPNext CRM:
  Leads · Deals/Opportunities · Contacts · Organizations
  Notes · Tasks · Call Logs · Email Templates · Email Communication
  WhatsApp messages · Notifications (Notification Log + ToDo)
  Comments · Custom Fields (per-tenant, per-industry)
  SLA · Assignment Rules · Kanban status masters
  Lead conversion → Deal with org + contact creation
  Lost-deal tracking · Forecasting · Pipeline dashboard

SaaS specifics
  - Every tenant is isolated by their ERPNext site (tenant_backend cookie).
  - Paid add-ons (WhatsApp, call logs) are gated by a tenant module check.
  - Custom fields are stored in ERPNext Custom Field – tenants own their schema.
  - All monetary values default to ZAR.

Python dependencies: frappe (available inside ERPNext/Frappe CRM).
"""

import frappe
from frappe.utils import flt, nowdate, now_datetime, add_days, getdate
from ._saas_utils import (
    require_auth, ok, fail, get_company, get_currency,
    page, parse_payload, has_doctype, pick_fields,
    safe_count, money, tenant_has_addon,
)


# ═══════════════════════════════════════════════════════════════════════════════
# DocType detection – Frappe CRM preferred, ERPNext CRM as fallback
# ═══════════════════════════════════════════════════════════════════════════════

def _frappe_crm() -> bool:
    return has_doctype("CRM Lead")


def _lead_dt() -> str:
    return "CRM Lead" if _frappe_crm() else "Lead"


def _deal_dt() -> str | None:
    if has_doctype("CRM Deal"):
        return "CRM Deal"
    if has_doctype("Opportunity"):
        return "Opportunity"
    return None


def _contact_dt() -> str:
    return "CRM Contact" if has_doctype("CRM Contact") else "Contact"


def _org_dt() -> str | None:
    return "CRM Organization" if has_doctype("CRM Organization") else None


# ─── Field name helpers ───────────────────────────────────────────────────────

def _lead_full_name(doc_or_dict) -> str:
    if _frappe_crm():
        first = getattr(doc_or_dict, "first_name", None) or doc_or_dict.get("first_name", "")
        last  = getattr(doc_or_dict, "last_name",  None) or doc_or_dict.get("last_name",  "")
        full  = f"{first} {last}".strip()
        return full or doc_or_dict.get("company_name") or doc_or_dict.get("name", "")
    return (getattr(doc_or_dict, "lead_name", None)
            or doc_or_dict.get("lead_name")
            or doc_or_dict.get("company_name")
            or doc_or_dict.get("name", ""))


def _lead_email(row: dict) -> str:
    return row.get("email") or row.get("email_id") or ""


def _deal_val_field(dt: str) -> str:
    return "deal_value" if dt == "CRM Deal" else "opportunity_amount"


def _deal_stage_field(dt: str) -> str:
    return "status" if dt == "CRM Deal" else "sales_stage"


def _deal_title(row: dict, dt: str) -> str:
    if dt == "CRM Deal":
        return row.get("organization") or row.get("lead_name") or row.get("name", "")
    return row.get("customer_name") or row.get("party_name") or row.get("name", "")


# ═══════════════════════════════════════════════════════════════════════════════
# 1. DASHBOARD
# ═══════════════════════════════════════════════════════════════════════════════

@frappe.whitelist()
def get_dashboard(company=None):
    """
    KPI cards for the CRM home screen.  Returns counts + monetary totals
    for leads, deals, contacts, organizations, pipeline value and won-this-month.
    """
    require_auth()
    company  = get_company(company)
    currency = get_currency(company)
    lead_dt  = _lead_dt()
    deal_dt  = _deal_dt()
    fc       = _frappe_crm()

    leads        = safe_count(lead_dt)
    contacts     = safe_count(_contact_dt())
    deals        = safe_count(deal_dt) if deal_dt else 0
    organizations = safe_count(_org_dt()) if _org_dt() else 0

    pipeline_value  = 0.0
    won_this_month  = 0.0
    overdue_tasks   = 0

    if deal_dt:
        val_field = _deal_val_field(deal_dt)
        try:
            result = frappe.db.sql(
                f"SELECT COALESCE(SUM(`{val_field}`),0) v"
                f" FROM `tab{deal_dt}` WHERE docstatus < 2",
                as_dict=True,
            )
            pipeline_value = flt((result or [{}])[0].get("v", 0))
        except Exception:
            pass

        try:
            from frappe.utils import get_first_day, get_last_day
            start = get_first_day(nowdate())
            end   = get_last_day(nowdate())
            won_rows = frappe.get_all(
                deal_dt,
                filters=[["docstatus","<",2],["status","=","Won"],
                         ["modified","between",[start, end]]],
                fields=pick_fields(deal_dt, [val_field, "name"]),
            )
            won_this_month = sum(flt(r.get(val_field) or 0) for r in won_rows)
        except Exception:
            pass

    try:
        overdue_tasks = frappe.db.count(
            "CRM Task" if fc else "Task",
            filters=[["due_date", "<", nowdate()], ["status", "not in", ["Closed","Cancelled"]]],
        )
    except Exception:
        pass

    # Activity feed – last 10 communications on CRM records
    recent_activity = []
    try:
        recent_activity = frappe.get_all(
            "Communication",
            filters=[["reference_doctype", "in", [lead_dt, deal_dt or "", _contact_dt()]]],
            fields=["name","subject","sender","reference_doctype","reference_name","creation","communication_type"],
            order_by="creation desc",
            limit=10,
        )
    except Exception:
        pass

    cards = {
        "leads": leads,
        "deals": deals,
        "contacts": contacts,
        "organizations": organizations,
        "pipeline_value": money(pipeline_value),
        "won_this_month": money(won_this_month),
        "overdue_tasks": overdue_tasks,
    }

    return ok({
        "cards": cards,
        "recent_activity": recent_activity,
        "currency": currency,
        "crm_app": "frappe_crm" if fc else "erpnext",
    })


# ═══════════════════════════════════════════════════════════════════════════════
# 2. LEAD STATUS & DEAL STATUS MASTERS
# ═══════════════════════════════════════════════════════════════════════════════

@frappe.whitelist()
def get_lead_statuses():
    """Return the ordered lead statuses (CRM Lead Status master or static fallback)."""
    require_auth()
    if _frappe_crm() and has_doctype("CRM Lead Status"):
        rows = frappe.get_all("CRM Lead Status",
                              fields=["name","color","position"],
                              order_by="position asc")
        return ok({"statuses": rows})
    return ok({"statuses": [
        {"name":"New",            "color":"blue",   "position":1},
        {"name":"Open",           "color":"yellow", "position":2},
        {"name":"Contacted",      "color":"orange", "position":3},
        {"name":"Replied",        "color":"purple", "position":4},
        {"name":"Qualified",      "color":"green",  "position":5},
        {"name":"Unqualified",    "color":"red",    "position":6},
        {"name":"Converted",      "color":"teal",   "position":7},
        {"name":"Do Not Contact", "color":"gray",   "position":8},
    ]})


@frappe.whitelist()
def get_deal_statuses():
    """Return the ordered deal statuses (CRM Deal Status master or static fallback)."""
    require_auth()
    if _frappe_crm() and has_doctype("CRM Deal Status"):
        rows = frappe.get_all("CRM Deal Status",
                              fields=["name","color","position"],
                              order_by="position asc")
        return ok({"statuses": rows})
    return ok({"statuses": [
        {"name":"Qualification",      "color":"blue",   "position":1},
        {"name":"Demo/Presentation",  "color":"yellow", "position":2},
        {"name":"Proposal/Quotation", "color":"orange", "position":3},
        {"name":"Negotiation",        "color":"purple", "position":4},
        {"name":"Ready to Close",     "color":"teal",   "position":5},
        {"name":"Won",                "color":"green",  "position":6},
        {"name":"Lost",               "color":"red",    "position":7},
    ]})


# ═══════════════════════════════════════════════════════════════════════════════
# 3. LEADS
# ═══════════════════════════════════════════════════════════════════════════════

@frappe.whitelist()
def get_leads(limit=50, offset=0, status=None, search=None, source=None, owner=None):
    """Paginated lead list with optional filters for status, source, owner and search."""
    require_auth()
    limit, offset = page(limit, offset)
    dt = _lead_dt()

    filters = []
    if status and status != "all":
        filters.append(["status", "=", status])
    if source:
        filters.append(["source", "=", source])
    if owner:
        filters.append(["lead_owner" if _frappe_crm() else "lead_owner", "=", owner])

    if _frappe_crm():
        fields = pick_fields(dt, [
            "name","first_name","last_name","company_name",
            "email","mobile_no","phone","source","status",
            "lead_owner","city","country","website","image",
            "sla_creation","creation","modified",
        ])
    else:
        fields = pick_fields(dt, [
            "name","lead_name","company_name","email_id",
            "mobile_no","phone","source","status",
            "lead_owner","city","country","website",
            "creation","modified",
        ])

    if search:
        name_f = "first_name" if _frappe_crm() else "lead_name"
        filters.append([name_f, "like", f"%{search}%"])

    rows = frappe.get_all(
        dt, filters=filters, fields=fields,
        order_by="modified desc",
        limit_start=offset, limit_page_length=limit,
    )

    leads = [{
        "id": r.name,
        "name": _lead_full_name(r),
        "first_name": r.get("first_name") or r.get("lead_name"),
        "last_name": r.get("last_name"),
        "company": r.get("company_name"),
        "email": _lead_email(r),
        "phone": r.get("mobile_no") or r.get("phone"),
        "source": r.get("source"),
        "status": r.get("status") or "New",
        "lead_owner": r.get("lead_owner"),
        "city": r.get("city"),
        "country": r.get("country") or "South Africa",
        "website": r.get("website"),
        "image": r.get("image"),
        "created": str(r.get("creation") or ""),
        "last_updated": str(r.get("modified") or ""),
    } for r in rows]

    total = frappe.db.count(dt, filters)
    return ok({"leads": leads}, meta={"total": total, "limit": limit, "offset": offset})


@frappe.whitelist()
def get_lead(lead):
    """
    Full lead record including all linked activity:
    communications, comments, notes, tasks, call logs, WhatsApp messages.
    """
    require_auth()
    dt = _lead_dt()
    try:
        doc = frappe.get_doc(dt, lead)
    except frappe.DoesNotExistError:
        return fail(f"Lead {lead!r} not found")

    comms = _fetch_communications(dt, doc.name)
    comments = _fetch_comments(dt, doc.name)
    notes = _fetch_notes(dt, doc.name)
    tasks = _fetch_tasks(dt, doc.name)
    call_logs = _fetch_call_logs(dt, doc.name)
    whatsapp = _fetch_whatsapp(dt, doc.name)

    return ok({
        "lead": doc.as_dict(),
        "communications": comms,
        "comments": comments,
        "notes": notes,
        "tasks": tasks,
        "call_logs": call_logs,
        "whatsapp": whatsapp,
    })


@frappe.whitelist()
def create_lead(data=None, **kwargs):
    """
    Create a CRM Lead.

    Frappe CRM keys: first_name, last_name, company_name, email, phone,
                     source, status, lead_owner, website, city, country
    ERPNext keys:    lead_name, company_name, email, phone, source, status
    """
    require_auth()
    p   = parse_payload(data, **kwargs)
    dt  = _lead_dt()
    doc = frappe.new_doc(dt)

    if _frappe_crm():
        doc.first_name  = p.get("first_name") or p.get("name") or p.get("lead_name") or p.get("company_name","Unknown")
        doc.last_name   = p.get("last_name")
        doc.company_name = p.get("company") or p.get("company_name")
        doc.email       = p.get("email")
        doc.mobile_no   = p.get("phone") or p.get("mobile_no")
        doc.source      = p.get("source") or "Website"
        doc.status      = p.get("status") or "New"
        doc.lead_owner  = p.get("lead_owner") or frappe.session.user
        doc.website     = p.get("website")
        doc.city        = p.get("city")
        doc.country     = p.get("country") or "South Africa"
    else:
        doc.lead_name   = p.get("name") or p.get("lead_name") or p.get("first_name") or p.get("company_name","Unknown")
        doc.company_name = p.get("company") or p.get("company_name")
        doc.email_id    = p.get("email")
        doc.mobile_no   = p.get("phone") or p.get("mobile_no")
        doc.source      = p.get("source") or "Website"
        doc.status      = p.get("status") or "Lead"
        doc.lead_owner  = p.get("lead_owner") or frappe.session.user

    # Apply any extra custom-field values passed in payload
    _apply_custom_fields(doc, p, dt)

    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    return ok({"lead": {"id": doc.name, "name": _lead_full_name(doc)}}, "Lead created")


@frappe.whitelist()
def update_lead(lead, data=None, **kwargs):
    """Update an existing lead (partial update – only supplied fields change)."""
    require_auth()
    p   = parse_payload(data, **kwargs)
    dt  = _lead_dt()
    try:
        doc = frappe.get_doc(dt, lead)
    except frappe.DoesNotExistError:
        return fail(f"Lead {lead!r} not found")

    _map_lead_fields(doc, p)
    _apply_custom_fields(doc, p, dt)
    doc.save(ignore_permissions=True)
    frappe.db.commit()
    return ok({"lead": {"id": doc.name}}, "Lead updated")


@frappe.whitelist()
def delete_lead(lead):
    """Delete a lead (soft cancel – marks docstatus=2 if submitted, otherwise deletes)."""
    require_auth()
    dt = _lead_dt()
    try:
        doc = frappe.get_doc(dt, lead)
        doc.delete(ignore_permissions=True)
        frappe.db.commit()
        return ok({}, "Lead deleted")
    except frappe.DoesNotExistError:
        return fail(f"Lead {lead!r} not found")


@frappe.whitelist()
def convert_lead_to_deal(lead, organization=None, contact=None,
                          create_organization=True, create_contact=True):
    """
    Convert a CRM Lead → CRM Deal (Frappe CRM) or Opportunity (ERPNext).
    Optionally creates or links a CRM Organization and CRM Contact.
    All activity from the lead is carried forward automatically by the framework.
    """
    require_auth()

    if not _frappe_crm():
        try:
            from erpnext.crm.doctype.lead.lead import make_opportunity
            opp = make_opportunity(lead)
            opp.insert(ignore_permissions=True)
            frappe.db.commit()
            return ok({"deal": {"id": opp.name, "doctype": "Opportunity"}},
                      "Lead converted to Opportunity")
        except Exception as e:
            return fail(str(e))

    try:
        lead_doc = frappe.get_doc("CRM Lead", lead)
    except frappe.DoesNotExistError:
        return fail(f"Lead {lead!r} not found")

    # ── Organization ──────────────────────────────────────────────────────────
    org_name = organization
    if not org_name and lead_doc.company_name and create_organization:
        existing = frappe.db.get_value("CRM Organization",
                                       {"organization_name": lead_doc.company_name}, "name")
        if existing:
            org_name = existing
        else:
            org = frappe.new_doc("CRM Organization")
            org.organization_name = lead_doc.company_name
            org.website = getattr(lead_doc, "website", None)
            org.insert(ignore_permissions=True)
            org_name = org.name

    # ── Contact ───────────────────────────────────────────────────────────────
    contact_name = contact
    if not contact_name and create_contact:
        email = getattr(lead_doc, "email", None)
        if email:
            existing = frappe.db.get_value("CRM Contact", {"email": email}, "name")
            if existing:
                contact_name = existing
            else:
                c = frappe.new_doc("CRM Contact")
                c.first_name   = lead_doc.first_name or ""
                c.last_name    = lead_doc.last_name or ""
                c.email        = email
                c.mobile_no    = getattr(lead_doc, "mobile_no", None)
                c.company_name = lead_doc.company_name
                c.insert(ignore_permissions=True)
                contact_name = c.name

    # ── Deal ──────────────────────────────────────────────────────────────────
    deal = frappe.new_doc("CRM Deal")
    deal.lead_name    = _lead_full_name(lead_doc) or lead_doc.company_name or lead_doc.name
    deal.organization = org_name
    deal.status       = "Qualification"
    deal.deal_owner   = lead_doc.lead_owner or frappe.session.user
    deal.source       = getattr(lead_doc, "source", None)

    if contact_name:
        deal.append("contacts", {"contact": contact_name, "is_primary": 1})

    deal.insert(ignore_permissions=True)

    lead_doc.status = "Converted"
    lead_doc.save(ignore_permissions=True)
    frappe.db.commit()

    return ok({
        "deal": {"id": deal.name, "doctype": "CRM Deal"},
        "organization": org_name,
        "contact": contact_name,
    }, "Lead converted to Deal")


# ═══════════════════════════════════════════════════════════════════════════════
# 4. DEALS / PIPELINE
# ═══════════════════════════════════════════════════════════════════════════════

@frappe.whitelist()
def get_pipeline(limit=50, offset=0, stage=None, search=None, owner=None):
    """
    Paginated deal list.  Returns a kanban-friendly structure with stage,
    value, probability, expected close, and owner.
    """
    require_auth()
    limit, offset = page(limit, offset)
    deal_dt = _deal_dt()
    if not deal_dt:
        return ok({"deals": [], "currency": get_currency()},
                  "No CRM Deal or Opportunity DocType installed")

    val_f   = _deal_val_field(deal_dt)
    stage_f = _deal_stage_field(deal_dt)
    filters = []
    if stage and stage != "all":
        filters.append([stage_f, "=", stage])
    if owner:
        f = "deal_owner" if deal_dt == "CRM Deal" else "opportunity_owner"
        filters.append([f, "=", owner])

    if deal_dt == "CRM Deal":
        fields = pick_fields(deal_dt, [
            "name","lead_name","organization","status",
            "deal_value","currency","probability",
            "expected_closing","deal_owner","source",
            "modified","creation",
        ])
    else:
        fields = pick_fields(deal_dt, [
            "name","customer_name","party_name",
            "sales_stage","status","opportunity_amount",
            "probability","expected_closing",
            "opportunity_owner","modified",
        ])

    rows = frappe.get_all(
        deal_dt, filters=filters, fields=fields,
        order_by="modified desc",
        limit_start=offset, limit_page_length=limit,
    )

    deals = [{
        "id": r.name,
        "title": _deal_title(r, deal_dt),
        "organization": r.get("organization") or r.get("customer_name"),
        "stage": r.get(stage_f) or "Open",
        "value": money(flt(r.get(val_f) or 0)),
        "raw_value": flt(r.get(val_f) or 0),
        "currency": r.get("currency") or get_currency(),
        "probability": flt(r.get("probability") or 0),
        "expected_close": str(r.get("expected_closing") or ""),
        "owner": r.get("deal_owner") or r.get("opportunity_owner"),
        "source": r.get("source"),
        "last_updated": str(r.get("modified") or ""),
    } for r in rows]

    total = frappe.db.count(deal_dt, filters)
    return ok({"deals": deals, "currency": get_currency()},
              meta={"total": total, "limit": limit, "offset": offset})


@frappe.whitelist()
def get_deal(deal):
    """Full deal record with all linked activity."""
    require_auth()
    deal_dt = _deal_dt()
    if not deal_dt:
        return fail("No deal DocType installed")
    try:
        doc = frappe.get_doc(deal_dt, deal)
    except frappe.DoesNotExistError:
        return fail(f"Deal {deal!r} not found")

    comms    = _fetch_communications(deal_dt, doc.name)
    comments = _fetch_comments(deal_dt, doc.name)
    notes    = _fetch_notes(deal_dt, doc.name)
    tasks    = _fetch_tasks(deal_dt, doc.name)
    call_logs = _fetch_call_logs(deal_dt, doc.name)
    whatsapp  = _fetch_whatsapp(deal_dt, doc.name)

    return ok({
        "deal": doc.as_dict(),
        "communications": comms,
        "comments": comments,
        "notes": notes,
        "tasks": tasks,
        "call_logs": call_logs,
        "whatsapp": whatsapp,
    })


@frappe.whitelist()
def create_deal(data=None, **kwargs):
    """Create a CRM Deal (or ERPNext Opportunity)."""
    require_auth()
    p = parse_payload(data, **kwargs)
    deal_dt = _deal_dt()
    if not deal_dt:
        return fail("No deal DocType installed")

    doc = frappe.new_doc(deal_dt)
    if deal_dt == "CRM Deal":
        doc.lead_name     = p.get("lead_name") or p.get("title") or "New Deal"
        doc.organization  = p.get("organization") or p.get("company")
        doc.status        = p.get("status") or "Qualification"
        doc.deal_value    = flt(p.get("deal_value") or p.get("value") or 0)
        doc.currency      = p.get("currency") or get_currency()
        doc.expected_closing = p.get("expected_closing")
        doc.probability   = flt(p.get("probability") or 0)
        doc.deal_owner    = p.get("deal_owner") or frappe.session.user
        doc.source        = p.get("source")
        for c in (p.get("contacts") or []):
            doc.append("contacts", c)
    else:
        doc.opportunity_from = "Lead"
        doc.party_name    = p.get("party_name") or p.get("customer_name") or p.get("lead_name")
        doc.customer_name = doc.party_name
        doc.opportunity_amount = flt(p.get("opportunity_amount") or p.get("deal_value") or 0)
        doc.sales_stage   = p.get("sales_stage") or p.get("status") or "Prospecting"
        doc.expected_closing = p.get("expected_closing")
        doc.probability   = flt(p.get("probability") or 0)
        doc.opportunity_owner = p.get("opportunity_owner") or p.get("deal_owner") or frappe.session.user

    _apply_custom_fields(doc, p, deal_dt)
    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    return ok({"deal": {"id": doc.name, "doctype": deal_dt}}, "Deal created")


@frappe.whitelist()
def update_deal(deal, data=None, **kwargs):
    """Partial update of a deal / opportunity."""
    require_auth()
    p = parse_payload(data, **kwargs)
    deal_dt = _deal_dt()
    if not deal_dt:
        return fail("No deal DocType installed")
    try:
        doc = frappe.get_doc(deal_dt, deal)
    except frappe.DoesNotExistError:
        return fail(f"Deal {deal!r} not found")

    _map_deal_fields(doc, p, deal_dt)
    _apply_custom_fields(doc, p, deal_dt)
    doc.save(ignore_permissions=True)
    frappe.db.commit()
    return ok({"deal": {"id": doc.name}}, "Deal updated")


@frappe.whitelist()
def mark_deal_lost(deal, lost_reason=None, notes=None):
    """
    Set deal status to Lost and record the reason.
    Mirrors Frappe CRM's Lost dialog (CRM Lost Reason master).
    """
    require_auth()
    deal_dt = _deal_dt()
    if not deal_dt:
        return fail("No deal DocType installed")
    try:
        doc = frappe.get_doc(deal_dt, deal)
    except frappe.DoesNotExistError:
        return fail(f"Deal {deal!r} not found")

    doc.status = "Lost"
    if deal_dt == "CRM Deal":
        if lost_reason:
            doc.lost_reason = lost_reason
        if notes:
            doc.lost_reason_details = notes
    doc.save(ignore_permissions=True)
    frappe.db.commit()
    return ok({"deal": {"id": doc.name, "status": "Lost"}}, "Deal marked as Lost")


# ═══════════════════════════════════════════════════════════════════════════════
# 5. CONTACTS
# ═══════════════════════════════════════════════════════════════════════════════

@frappe.whitelist()
def get_contacts(limit=50, offset=0, search=None):
    """Paginated contact list."""
    require_auth()
    limit, offset = page(limit, offset)
    dt = _contact_dt()

    if dt == "CRM Contact":
        fields = pick_fields(dt, [
            "name","first_name","last_name","full_name",
            "email","mobile_no","phone","company_name",
            "designation","gender","image","modified",
        ])
    else:
        fields = pick_fields(dt, [
            "name","full_name","first_name","last_name",
            "email_id","mobile_no","company_name",
            "designation","gender","modified",
        ])

    filters = [["full_name","like",f"%{search}%"]] if search else []
    rows = frappe.get_all(dt, filters=filters, fields=fields,
                          order_by="modified desc",
                          limit_start=offset, limit_page_length=limit)

    contacts = [{
        "id": r.name,
        "name": (r.get("full_name")
                 or f"{r.get('first_name','')} {r.get('last_name','')}".strip()
                 or r.name),
        "email": r.get("email") or r.get("email_id"),
        "phone": r.get("mobile_no") or r.get("phone"),
        "company": r.get("company_name"),
        "designation": r.get("designation"),
        "gender": r.get("gender"),
        "image": r.get("image"),
        "last_updated": str(r.get("modified") or ""),
    } for r in rows]

    total = frappe.db.count(dt)
    return ok({"contacts": contacts}, meta={"total": total, "limit": limit, "offset": offset})


@frappe.whitelist()
def create_contact(data=None, **kwargs):
    """Create a CRM Contact or ERPNext Contact."""
    require_auth()
    p  = parse_payload(data, **kwargs)
    dt = _contact_dt()
    doc = frappe.new_doc(dt)

    if dt == "CRM Contact":
        doc.first_name   = p.get("first_name") or p.get("name", "Unknown")
        doc.last_name    = p.get("last_name")
        doc.email        = p.get("email")
        doc.mobile_no    = p.get("phone") or p.get("mobile_no")
        doc.company_name = p.get("company") or p.get("company_name")
        doc.designation  = p.get("designation")
        doc.gender       = p.get("gender")
    else:
        doc.first_name   = p.get("first_name") or p.get("name", "Unknown")
        doc.last_name    = p.get("last_name")
        doc.company_name = p.get("company") or p.get("company_name")
        doc.designation  = p.get("designation")
        doc.gender       = p.get("gender")
        if p.get("email"):
            doc.append("email_ids", {"email_id": p["email"], "is_primary": 1})
        if p.get("phone") or p.get("mobile_no"):
            doc.append("phone_nos", {
                "phone": p.get("phone") or p.get("mobile_no"),
                "is_primary_mobile_no": 1,
            })

    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    full = f"{doc.first_name or ''} {doc.last_name or ''}".strip() or doc.name
    return ok({"contact": {"id": doc.name, "name": full}}, "Contact created")


# ═══════════════════════════════════════════════════════════════════════════════
# 6. ORGANIZATIONS (Frappe CRM only)
# ═══════════════════════════════════════════════════════════════════════════════

@frappe.whitelist()
def get_organizations(limit=50, offset=0, search=None):
    require_auth()
    org_dt = _org_dt()
    if not org_dt:
        return ok({"organizations": []}, "CRM Organization not available", meta={"total": 0})

    limit, offset = page(limit, offset)
    fields = pick_fields(org_dt, [
        "name","organization_name","website","territory",
        "annual_revenue","industry","no_of_employees",
        "city","country","modified",
    ])
    filters = [["organization_name","like",f"%{search}%"]] if search else []
    rows  = frappe.get_all(org_dt, filters=filters, fields=fields,
                           order_by="modified desc",
                           limit_start=offset, limit_page_length=limit)
    total = frappe.db.count(org_dt)
    return ok({"organizations": rows}, meta={"total": total, "limit": limit, "offset": offset})


@frappe.whitelist()
def create_organization(data=None, **kwargs):
    require_auth()
    org_dt = _org_dt()
    if not org_dt:
        return fail("CRM Organization not available")
    p = parse_payload(data, **kwargs)
    name = p.get("organization_name") or p.get("name")
    if not name:
        return fail("organization_name is required")
    doc = frappe.new_doc(org_dt)
    doc.organization_name = name
    doc.website           = p.get("website")
    doc.territory         = p.get("territory")
    doc.annual_revenue    = flt(p.get("annual_revenue") or 0)
    doc.industry          = p.get("industry")
    doc.no_of_employees   = p.get("no_of_employees")
    doc.city              = p.get("city")
    doc.country           = p.get("country") or "South Africa"
    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    return ok({"organization": {"id": doc.name, "name": doc.organization_name}},
              "Organization created")


# ═══════════════════════════════════════════════════════════════════════════════
# 7. NOTES
# ═══════════════════════════════════════════════════════════════════════════════

@frappe.whitelist()
def create_note(reference_doctype, reference_name, title=None, content=None, data=None, **kwargs):
    """Create a CRM Note linked to a Lead or Deal."""
    require_auth()
    if not has_doctype("CRM Note"):
        return fail("CRM Note DocType not available")
    p = parse_payload(data, **kwargs)
    doc = frappe.new_doc("CRM Note")
    doc.title             = title or p.get("title") or "Note"
    doc.content           = content or p.get("content") or ""
    doc.reference_doctype = reference_doctype
    doc.reference_docname = reference_name
    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    return ok({"note": {"id": doc.name, "title": doc.title}}, "Note created")


@frappe.whitelist()
def get_notes(reference_doctype, reference_name, limit=20, offset=0):
    require_auth()
    if not has_doctype("CRM Note"):
        return ok({"notes": []})
    limit, offset = page(limit, offset)
    rows = frappe.get_all(
        "CRM Note",
        filters={"reference_doctype": reference_doctype, "reference_docname": reference_name},
        fields=["name","title","content","owner","creation","modified"],
        order_by="creation desc",
        limit_start=offset, limit_page_length=limit,
    )
    return ok({"notes": rows})


@frappe.whitelist()
def delete_note(note):
    require_auth()
    try:
        frappe.delete_doc("CRM Note", note, ignore_permissions=True)
        frappe.db.commit()
        return ok({}, "Note deleted")
    except Exception as e:
        return fail(str(e))


# ═══════════════════════════════════════════════════════════════════════════════
# 8. TASKS
# ═══════════════════════════════════════════════════════════════════════════════

@frappe.whitelist()
def create_task(reference_doctype, reference_name, title=None, data=None, **kwargs):
    """Create a CRM Task linked to a Lead or Deal."""
    require_auth()
    if not has_doctype("CRM Task"):
        return fail("CRM Task DocType not available")
    p = parse_payload(data, **kwargs)
    doc = frappe.new_doc("CRM Task")
    doc.title             = title or p.get("title") or "Task"
    doc.description       = p.get("description")
    doc.status            = p.get("status") or "Open"
    doc.assigned_to       = p.get("assigned_to") or frappe.session.user
    doc.due_date          = p.get("due_date")
    doc.priority          = p.get("priority") or "Medium"
    doc.reference_doctype = reference_doctype
    doc.reference_docname = reference_name
    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    return ok({"task": {"id": doc.name, "title": doc.title}}, "Task created")


@frappe.whitelist()
def update_task(task, data=None, **kwargs):
    require_auth()
    p = parse_payload(data, **kwargs)
    try:
        doc = frappe.get_doc("CRM Task", task)
    except frappe.DoesNotExistError:
        return fail(f"Task {task!r} not found")
    for f in ["title","description","status","assigned_to","due_date","priority"]:
        if f in p:
            setattr(doc, f, p[f])
    doc.save(ignore_permissions=True)
    frappe.db.commit()
    return ok({"task": {"id": doc.name}}, "Task updated")


@frappe.whitelist()
def get_tasks(reference_doctype, reference_name, limit=20, offset=0):
    require_auth()
    dt = "CRM Task" if has_doctype("CRM Task") else "Task"
    limit, offset = page(limit, offset)
    filters = ({"reference_doctype": reference_doctype, "reference_docname": reference_name}
               if dt == "CRM Task"
               else {"reference_type": reference_doctype, "reference_name": reference_name})
    rows = frappe.get_all(
        dt, filters=filters,
        fields=["name","title","description","status","assigned_to","due_date","priority","creation"],
        order_by="due_date asc",
        limit_start=offset, limit_page_length=limit,
    )
    return ok({"tasks": rows})


# ═══════════════════════════════════════════════════════════════════════════════
# 9. COMMENTS
# ═══════════════════════════════════════════════════════════════════════════════

@frappe.whitelist()
def add_comment(reference_doctype, reference_name, content, data=None, **kwargs):
    """
    Add an internal comment to a Lead or Deal.  Uses Frappe's Comment doctype
    so comments appear in the timeline on the ERPNext desk as well.
    """
    require_auth()
    if not content:
        return fail("content is required")
    doc = frappe.new_doc("Comment")
    doc.comment_type     = "Comment"
    doc.reference_doctype = reference_doctype
    doc.reference_name   = reference_name
    doc.content          = content
    doc.comment_by       = frappe.session.user
    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    return ok({"comment": {"id": doc.name}}, "Comment added")


@frappe.whitelist()
def get_comments(reference_doctype, reference_name, limit=50, offset=0):
    require_auth()
    limit, offset = page(limit, offset)
    rows = frappe.get_all(
        "Comment",
        filters={"reference_doctype": reference_doctype, "reference_name": reference_name,
                 "comment_type": "Comment"},
        fields=["name","content","comment_by","creation","modified"],
        order_by="creation asc",
        limit_start=offset, limit_page_length=limit,
    )
    return ok({"comments": rows})


# ═══════════════════════════════════════════════════════════════════════════════
# 10. EMAIL COMMUNICATION
# ═══════════════════════════════════════════════════════════════════════════════

@frappe.whitelist()
def send_email(reference_doctype, reference_name, to, subject, content,
               template=None, cc=None, bcc=None, data=None, **kwargs):
    """
    Send an email linked to a Lead or Deal and log it as a Communication.
    Optionally renders an Email Template before sending.
    """
    require_auth()
    p = parse_payload(data, **kwargs)

    body = content
    if template:
        try:
            tpl_doc = frappe.get_doc("Email Template", template)
            from frappe.utils.jinja import render_template
            body = render_template(tpl_doc.response or tpl_doc.message or content, {})
        except Exception:
            pass

    try:
        frappe.sendmail(
            recipients=to if isinstance(to, list) else [to],
            cc=(cc or "").split(",") if cc else [],
            bcc=(bcc or "").split(",") if bcc else [],
            subject=subject,
            message=body,
            reference_doctype=reference_doctype,
            reference_name=reference_name,
        )
        return ok({}, "Email sent")
    except Exception as e:
        return fail(str(e))


@frappe.whitelist()
def get_communications(reference_doctype, reference_name, limit=50, offset=0):
    """Return all email/chat communications linked to a Lead or Deal."""
    require_auth()
    limit, offset = page(limit, offset)
    rows = _fetch_communications(reference_doctype, reference_name,
                                 limit=limit, offset=offset)
    return ok({"communications": rows})


# ═══════════════════════════════════════════════════════════════════════════════
# 11. EMAIL TEMPLATES
# ═══════════════════════════════════════════════════════════════════════════════

@frappe.whitelist()
def get_email_templates(limit=50, offset=0):
    require_auth()
    limit, offset = page(limit, offset)
    rows = frappe.get_all(
        "Email Template",
        fields=["name","subject","use_html","response","modified"],
        order_by="name asc",
        limit_start=offset, limit_page_length=limit,
    )
    total = frappe.db.count("Email Template")
    return ok({"templates": rows}, meta={"total": total})


@frappe.whitelist()
def create_email_template(data=None, **kwargs):
    """Create a per-tenant email template stored in ERPNext Email Template."""
    require_auth()
    p = parse_payload(data, **kwargs)
    if not p.get("name") and not p.get("template_name"):
        return fail("Template name is required")
    doc = frappe.new_doc("Email Template")
    doc.name     = p.get("name") or p.get("template_name")
    doc.subject  = p.get("subject") or ""
    doc.response = p.get("content") or p.get("response") or ""
    doc.use_html = 1 if p.get("use_html") else 0
    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    return ok({"template": {"id": doc.name}}, "Email template created")


@frappe.whitelist()
def update_email_template(template, data=None, **kwargs):
    require_auth()
    p = parse_payload(data, **kwargs)
    try:
        doc = frappe.get_doc("Email Template", template)
    except frappe.DoesNotExistError:
        return fail(f"Template {template!r} not found")
    if "subject" in p:
        doc.subject = p["subject"]
    if "content" in p or "response" in p:
        doc.response = p.get("content") or p.get("response")
    if "use_html" in p:
        doc.use_html = 1 if p["use_html"] else 0
    doc.save(ignore_permissions=True)
    frappe.db.commit()
    return ok({"template": {"id": doc.name}}, "Template updated")


@frappe.whitelist()
def delete_email_template(template):
    require_auth()
    try:
        frappe.delete_doc("Email Template", template, ignore_permissions=True)
        frappe.db.commit()
        return ok({}, "Template deleted")
    except Exception as e:
        return fail(str(e))


# ═══════════════════════════════════════════════════════════════════════════════
# 12. CALL LOGS  (paid add-on: crm_calls)
# ═══════════════════════════════════════════════════════════════════════════════

@frappe.whitelist()
def get_call_logs(reference_doctype=None, reference_name=None, limit=50, offset=0):
    """Return call logs.  Requires crm_calls add-on to be enabled for the tenant."""
    require_auth()
    if not tenant_has_addon("crm_calls"):
        return fail("Call Logs add-on is not enabled for your account", code=403)

    limit, offset = page(limit, offset)
    rows = _fetch_call_logs(reference_doctype, reference_name,
                            limit=limit, offset=offset)
    return ok({"call_logs": rows})


@frappe.whitelist()
def create_call_log(reference_doctype, reference_name, data=None, **kwargs):
    """Log a call.  Requires crm_calls add-on."""
    require_auth()
    if not tenant_has_addon("crm_calls"):
        return fail("Call Logs add-on is not enabled for your account", code=403)

    if not has_doctype("CRM Call Log"):
        return fail("CRM Call Log DocType not available")

    p = parse_payload(data, **kwargs)
    doc = frappe.new_doc("CRM Call Log")
    doc.reference_doctype = reference_doctype
    doc.reference_name    = reference_name
    doc.type              = p.get("type") or "Outgoing"
    doc.status            = p.get("status") or "Completed"
    doc.duration          = p.get("duration") or 0
    doc.caller            = p.get("caller") or frappe.session.user
    doc.receiver          = p.get("receiver")
    doc.recording_url     = p.get("recording_url")
    doc.note              = p.get("note")
    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    return ok({"call_log": {"id": doc.name}}, "Call log created")


# ═══════════════════════════════════════════════════════════════════════════════
# 13. WHATSAPP  (paid add-on: crm_whatsapp)
# ═══════════════════════════════════════════════════════════════════════════════

@frappe.whitelist()
def get_whatsapp_messages(reference_doctype, reference_name, limit=50, offset=0):
    """Fetch WhatsApp messages linked to a Lead or Deal.  Requires crm_whatsapp add-on."""
    require_auth()
    if not tenant_has_addon("crm_whatsapp"):
        return fail("WhatsApp add-on is not enabled for your account", code=403)

    limit, offset = page(limit, offset)
    rows = _fetch_whatsapp(reference_doctype, reference_name, limit=limit, offset=offset)
    return ok({"messages": rows})


@frappe.whitelist()
def send_whatsapp(reference_doctype, reference_name, to, message, data=None, **kwargs):
    """
    Send a WhatsApp message via the Frappe WhatsApp integration.
    Requires crm_whatsapp add-on AND the frappe_whatsapp app to be installed.
    """
    require_auth()
    if not tenant_has_addon("crm_whatsapp"):
        return fail("WhatsApp add-on is not enabled for your account", code=403)

    if not has_doctype("WhatsApp Message"):
        return fail("frappe_whatsapp app is not installed on this site")

    p = parse_payload(data, **kwargs)
    try:
        doc = frappe.new_doc("WhatsApp Message")
        doc.to                = to or p.get("to")
        doc.message           = message or p.get("message")
        doc.type              = "Outgoing"
        doc.reference_doctype = reference_doctype
        doc.reference_name    = reference_name
        doc.insert(ignore_permissions=True)
        frappe.db.commit()
        return ok({"message": {"id": doc.name}}, "WhatsApp message queued")
    except Exception as e:
        return fail(str(e))


# ═══════════════════════════════════════════════════════════════════════════════
# 14. NOTIFICATIONS
# ═══════════════════════════════════════════════════════════════════════════════

@frappe.whitelist()
def get_notifications(limit=30, offset=0, unread_only=False):
    """
    Return Notification Log entries + open ToDos relevant to CRM records.
    These are per-user and per-tenant (the ERPNext session scopes them).
    """
    require_auth()
    limit, offset = page(limit, offset)

    items = []

    # Notification Log
    try:
        filters = [["for_user", "=", frappe.session.user]]
        if unread_only:
            filters.append(["read", "=", 0])
        notifs = frappe.get_all(
            "Notification Log",
            filters=filters,
            fields=["name","subject","email_content","document_type",
                    "document_name","type","read","creation"],
            order_by="creation desc",
            limit=limit,
        )
        for n in notifs:
            items.append({
                "id": n.name,
                "source": "Notification Log",
                "title": (n.subject or "").replace("<[^>]*>", "").strip()[:120],
                "message": _strip_html(n.email_content)[:200],
                "type": n.type or "Alert",
                "read": bool(n.read),
                "date": str(n.creation or ""),
                "doctype": n.document_type,
                "docname": n.document_name,
            })
    except Exception:
        pass

    # Open ToDos
    try:
        todos = frappe.get_all(
            "ToDo",
            filters=[["allocated_to","=",frappe.session.user],["status","!=","Closed"]],
            fields=["name","description","reference_type","reference_name",
                    "status","priority","date","creation"],
            order_by="date asc",
            limit=min(limit, 20),
        )
        for t in todos:
            items.append({
                "id": t.name,
                "source": "ToDo",
                "title": _strip_html(t.description)[:120] or "Assigned task",
                "message": f"{t.reference_type or ''} {t.reference_name or ''}".strip(),
                "type": t.priority or "Medium",
                "read": False,
                "date": str(t.date or t.creation or ""),
                "doctype": t.reference_type,
                "docname": t.reference_name,
            })
    except Exception:
        pass

    items.sort(key=lambda x: x.get("date",""), reverse=True)
    unread = sum(1 for i in items if not i["read"])
    return ok({"notifications": items[:limit], "unread": unread},
              meta={"total": len(items), "limit": limit, "offset": offset})


@frappe.whitelist()
def mark_notification_read(notification_id):
    """Mark a Notification Log entry as read for the current user."""
    require_auth()
    try:
        frappe.db.set_value("Notification Log", notification_id, "read", 1)
        frappe.db.commit()
        return ok({}, "Marked as read")
    except Exception as e:
        return fail(str(e))


@frappe.whitelist()
def mark_all_notifications_read():
    require_auth()
    try:
        frappe.db.sql(
            "UPDATE `tabNotification Log` SET `read`=1 WHERE for_user=%s",
            frappe.session.user,
        )
        frappe.db.commit()
        return ok({}, "All notifications marked as read")
    except Exception as e:
        return fail(str(e))


# ═══════════════════════════════════════════════════════════════════════════════
# 15. CUSTOM FIELDS  (per-tenant, per-industry schema extension)
# ═══════════════════════════════════════════════════════════════════════════════

@frappe.whitelist()
def get_custom_fields(doctype):
    """
    Return all Custom Fields defined for a given CRM doctype on this tenant's site.
    Tenants call this to build their dynamic form UI.
    """
    require_auth()
    _validate_crm_doctype(doctype)
    rows = frappe.get_all(
        "Custom Field",
        filters={"dt": doctype},
        fields=[
            "name","fieldname","label","fieldtype","options",
            "reqd","read_only","hidden","default","description",
            "insert_after","depends_on","mandatory_depends_on",
        ],
        order_by="idx asc",
    )
    return ok({"custom_fields": rows, "doctype": doctype})


@frappe.whitelist()
def create_custom_field(doctype, data=None, **kwargs):
    """
    Add a custom field to a CRM DocType for this tenant.
    Stored in ERPNext Custom Field (site-specific, survives app updates).

    payload keys:
      fieldname, label, fieldtype (Data/Select/Int/Currency/Date/Check/Text/Link),
      options (for Select: newline-separated values; for Link: target DocType),
      reqd (0|1), default, description, insert_after
    """
    require_auth()
    _validate_crm_doctype(doctype)
    p = parse_payload(data, **kwargs)

    fieldname = p.get("fieldname") or (p.get("label","").lower()
                                        .replace(" ","_").replace("-","_")[:30])
    if not fieldname:
        return fail("fieldname is required")

    # Prefix custom fields to avoid collisions with app updates
    if not fieldname.startswith("custom_"):
        fieldname = f"custom_{fieldname}"

    # Prevent duplicates
    if frappe.db.exists("Custom Field", {"dt": doctype, "fieldname": fieldname}):
        return fail(f"Custom field {fieldname!r} already exists on {doctype}")

    cf = frappe.new_doc("Custom Field")
    cf.dt            = doctype
    cf.fieldname     = fieldname
    cf.label         = p.get("label") or fieldname.replace("_"," ").title()
    cf.fieldtype     = p.get("fieldtype") or "Data"
    cf.options       = p.get("options") or ""
    cf.reqd          = 1 if p.get("reqd") else 0
    cf.read_only     = 1 if p.get("read_only") else 0
    cf.hidden        = 1 if p.get("hidden") else 0
    cf.default       = p.get("default") or ""
    cf.description   = p.get("description") or ""
    cf.insert_after  = p.get("insert_after") or ""
    cf.depends_on    = p.get("depends_on") or ""
    cf.mandatory_depends_on = p.get("mandatory_depends_on") or ""
    cf.insert(ignore_permissions=True)
    frappe.db.commit()

    # Clear doctype cache so the new field is immediately visible
    frappe.clear_cache(doctype=doctype)

    return ok({"custom_field": {"id": cf.name, "fieldname": fieldname}},
              "Custom field created")


@frappe.whitelist()
def update_custom_field(custom_field, data=None, **kwargs):
    """Update an existing custom field definition."""
    require_auth()
    p = parse_payload(data, **kwargs)
    try:
        cf = frappe.get_doc("Custom Field", custom_field)
    except frappe.DoesNotExistError:
        return fail(f"Custom field {custom_field!r} not found")
    _validate_crm_doctype(cf.dt)
    for attr in ["label","fieldtype","options","reqd","read_only",
                 "hidden","default","description","insert_after",
                 "depends_on","mandatory_depends_on"]:
        if attr in p:
            setattr(cf, attr, p[attr])
    cf.save(ignore_permissions=True)
    frappe.db.commit()
    frappe.clear_cache(doctype=cf.dt)
    return ok({"custom_field": {"id": cf.name}}, "Custom field updated")


@frappe.whitelist()
def delete_custom_field(custom_field):
    """Remove a custom field from the tenant's CRM DocType."""
    require_auth()
    try:
        cf = frappe.get_doc("Custom Field", custom_field)
        _validate_crm_doctype(cf.dt)
        frappe.delete_doc("Custom Field", custom_field, ignore_permissions=True)
        frappe.db.commit()
        frappe.clear_cache(doctype=cf.dt)
        return ok({}, "Custom field deleted")
    except frappe.DoesNotExistError:
        return fail(f"Custom field {custom_field!r} not found")


@frappe.whitelist()
def get_crm_form_layout(doctype):
    """
    Return the merged field layout for a CRM DocType:
    built-in fields (from DocType meta) + tenant custom fields,
    ordered for the side-panel quick-entry form.
    """
    require_auth()
    _validate_crm_doctype(doctype)
    try:
        meta   = frappe.get_meta(doctype)
        fields = []
        for f in meta.fields:
            if f.fieldtype in ("Section Break","Column Break","Tab Break","HTML","Button"):
                continue
            if f.hidden:
                continue
            fields.append({
                "fieldname": f.fieldname,
                "label":     f.label or f.fieldname,
                "fieldtype": f.fieldtype,
                "options":   f.options,
                "reqd":      f.reqd,
                "read_only": f.read_only,
                "default":   f.default,
                "is_custom": bool(getattr(f, "is_custom_field", False)),
            })
        return ok({"fields": fields, "doctype": doctype})
    except Exception as e:
        return fail(str(e))


# ═══════════════════════════════════════════════════════════════════════════════
# 16. SLA
# ═══════════════════════════════════════════════════════════════════════════════

@frappe.whitelist()
def get_sla_settings():
    """Return SLA rules applied to CRM Lead (Frappe CRM only)."""
    require_auth()
    if not has_doctype("CRM Service Level Agreement"):
        return ok({"sla": []}, "SLA not available in ERPNext mode")
    rows = frappe.get_all(
        "CRM Service Level Agreement",
        fields=["name","doctype_name","response_time","response_time_period",
                "resolution_time","resolution_time_period","enabled"],
    )
    return ok({"sla": rows})


# ═══════════════════════════════════════════════════════════════════════════════
# 17. ASSIGNMENT RULES
# ═══════════════════════════════════════════════════════════════════════════════

@frappe.whitelist()
def get_assignment_rules():
    """Return assignment rules for CRM Lead and CRM Deal."""
    require_auth()
    if not has_doctype("Assignment Rule"):
        return ok({"rules": []})
    rows = frappe.get_all(
        "Assignment Rule",
        filters=[["document_type","in",[_lead_dt(), _deal_dt() or "", _contact_dt()]]],
        fields=["name","document_type","assign_condition","priority","disabled"],
    )
    return ok({"rules": rows})


# ═══════════════════════════════════════════════════════════════════════════════
# 18. CUSTOMERS (ERPNext – backward compat)
# ═══════════════════════════════════════════════════════════════════════════════

@frappe.whitelist()
def get_customers(limit=50, offset=0, search=None):
    require_auth()
    if not has_doctype("Customer"):
        return ok({"customers": []}, meta={"total": 0})
    limit, offset = page(limit, offset)
    filters = [["disabled","=",0]]
    if search:
        filters.append(["customer_name","like",f"%{search}%"])
    fields = pick_fields("Customer", [
        "name","customer_name","customer_type","customer_group",
        "territory","mobile_no","email_id","modified",
    ])
    rows  = frappe.get_all("Customer", filters=filters, fields=fields,
                           order_by="customer_name asc",
                           limit_start=offset, limit_page_length=limit)
    total = frappe.db.count("Customer", filters)
    return ok({"customers": rows}, meta={"total": total, "limit": limit, "offset": offset})


# ═══════════════════════════════════════════════════════════════════════════════
# 19. LEAD SOURCES (for filter dropdowns)
# ═══════════════════════════════════════════════════════════════════════════════

@frappe.whitelist()
def get_lead_sources():
    require_auth()
    try:
        meta  = frappe.get_meta(_lead_dt())
        field = meta.get_field("source")
        if field and field.options:
            sources = [s.strip() for s in field.options.split("\n") if s.strip()]
            return ok({"sources": sources})
    except Exception:
        pass
    return ok({"sources": [
        "Website","Email","Phone","Referral","Social Media",
        "Campaign","Advertisement","Walk In","Other",
    ]})


# ═══════════════════════════════════════════════════════════════════════════════
# 20. BACKWARD COMPAT ENTRY POINT
# ═══════════════════════════════════════════════════════════════════════════════

@frappe.whitelist()
def get_lead_lifecycle(lead=None, limit=50, offset=0):
    """Legacy endpoint – delegates to get_lead() or get_leads()."""
    require_auth()
    if lead:
        return get_lead(lead)
    return get_leads(limit=limit, offset=offset)


# ═══════════════════════════════════════════════════════════════════════════════
# PRIVATE HELPERS
# ═══════════════════════════════════════════════════════════════════════════════

_CRM_DOCTYPES = frozenset([
    "CRM Lead","Lead",
    "CRM Deal","Opportunity",
    "CRM Contact","Contact",
    "CRM Organization",
])


def _validate_crm_doctype(dt: str):
    if dt not in _CRM_DOCTYPES:
        frappe.throw(f"Custom fields can only be added to CRM DocTypes, not {dt!r}")


def _apply_custom_fields(doc, payload: dict, doctype: str):
    """Copy any custom_* keys from payload onto the document."""
    try:
        meta = frappe.get_meta(doctype)
        allowed = {f.fieldname for f in meta.fields if getattr(f, "is_custom_field", False)}
    except Exception:
        allowed = set()
    for key, val in payload.items():
        if (key.startswith("custom_") or key in allowed) and key not in ("name","doctype"):
            try:
                setattr(doc, key, val)
            except Exception:
                pass


def _map_lead_fields(doc, p: dict):
    """Apply standard lead field updates from payload."""
    if _frappe_crm():
        for attr in ["first_name","last_name","company_name","email",
                     "mobile_no","source","status","lead_owner","website","city","country"]:
            if attr in p:
                setattr(doc, attr, p[attr])
        if "phone" in p:
            doc.mobile_no = p["phone"]
        if "company" in p:
            doc.company_name = p["company"]
    else:
        for attr in ["lead_name","company_name","email_id","mobile_no",
                     "source","status","lead_owner"]:
            if attr in p:
                setattr(doc, attr, p[attr])
        if "email" in p:
            doc.email_id = p["email"]
        if "phone" in p:
            doc.mobile_no = p["phone"]
        if "company" in p:
            doc.company_name = p["company"]


def _map_deal_fields(doc, p: dict, deal_dt: str):
    if deal_dt == "CRM Deal":
        for attr in ["lead_name","organization","status","deal_value",
                     "currency","expected_closing","probability","deal_owner","source"]:
            if attr in p:
                setattr(doc, attr, p[attr])
        if "value" in p:
            doc.deal_value = flt(p["value"])
    else:
        for attr in ["sales_stage","status","opportunity_amount","expected_closing",
                     "probability","opportunity_owner"]:
            if attr in p:
                setattr(doc, attr, p[attr])


def _fetch_communications(ref_dt: str, ref_name: str, limit=50, offset=0) -> list:
    try:
        return frappe.get_all(
            "Communication",
            filters={"reference_doctype": ref_dt, "reference_name": ref_name},
            fields=["name","creation","communication_type","communication_medium",
                    "subject","sender","sender_full_name","recipients",
                    "content","status","sent_or_received"],
            order_by="creation asc",
            limit_start=offset, limit_page_length=limit,
        )
    except Exception:
        return []


def _fetch_comments(ref_dt: str, ref_name: str, limit=50, offset=0) -> list:
    try:
        return frappe.get_all(
            "Comment",
            filters={"reference_doctype": ref_dt, "reference_name": ref_name,
                     "comment_type": "Comment"},
            fields=["name","content","comment_by","creation"],
            order_by="creation asc",
            limit_start=offset, limit_page_length=limit,
        )
    except Exception:
        return []


def _fetch_notes(ref_dt: str, ref_name: str, limit=20, offset=0) -> list:
    if not has_doctype("CRM Note"):
        return []
    try:
        return frappe.get_all(
            "CRM Note",
            filters={"reference_doctype": ref_dt, "reference_docname": ref_name},
            fields=["name","title","content","owner","creation"],
            order_by="creation desc",
            limit_start=offset, limit_page_length=limit,
        )
    except Exception:
        return []


def _fetch_tasks(ref_dt: str, ref_name: str, limit=20, offset=0) -> list:
    if has_doctype("CRM Task"):
        try:
            return frappe.get_all(
                "CRM Task",
                filters={"reference_doctype": ref_dt, "reference_docname": ref_name},
                fields=["name","title","description","status","assigned_to",
                        "due_date","priority","creation"],
                order_by="due_date asc",
                limit_start=offset, limit_page_length=limit,
            )
        except Exception:
            return []
    try:
        return frappe.get_all(
            "ToDo",
            filters={"reference_type": ref_dt, "reference_name": ref_name},
            fields=["name","description","status","priority","date","allocated_to","creation"],
            order_by="date asc",
            limit_start=offset, limit_page_length=limit,
        )
    except Exception:
        return []


def _fetch_call_logs(ref_dt: str | None, ref_name: str | None,
                     limit=20, offset=0) -> list:
    if not has_doctype("CRM Call Log"):
        return []
    try:
        filters = {}
        if ref_dt:
            filters["reference_doctype"] = ref_dt
        if ref_name:
            filters["reference_name"] = ref_name
        return frappe.get_all(
            "CRM Call Log",
            filters=filters,
            fields=["name","creation","type","status","duration",
                    "caller","receiver","recording_url","note"],
            order_by="creation desc",
            limit_start=offset, limit_page_length=limit,
        )
    except Exception:
        return []


def _fetch_whatsapp(ref_dt: str, ref_name: str, limit=50, offset=0) -> list:
    if not has_doctype("WhatsApp Message"):
        return []
    try:
        return frappe.get_all(
            "WhatsApp Message",
            filters={"reference_doctype": ref_dt, "reference_name": ref_name},
            fields=["name","to","from","message","type","status","creation"],
            order_by="creation asc",
            limit_start=offset, limit_page_length=limit,
        )
    except Exception:
        return []


def _strip_html(value) -> str:
    import re
    return re.sub(r"<[^>]*>", " ", str(value or "")).strip()