"""
helpdesk.py  –  Support / Helpdesk module API for the Fuze Business Suite.
Supports both Frappe Helpdesk (HD Ticket) and ERPNext Issue.

Full ERPNext Support feature set:
  Issues / HD Tickets  – CRUD, comments, assignment, escalation, bulk close
  Service Level Agreements – CRUD, SLA compliance report
  Issue Types & Priorities – dropdown masters
  Warranty & Warranty Claims – CRUD
  Maintenance Visits – CRUD with purpose / activities
  Maintenance Schedules – create & manage scheduled visits
  Support Settings – read/write
  Support Reports – first-response, resolution, volume by type/customer/agent
South African businesses – default currency ZAR.
"""

import frappe
from frappe.utils import nowdate, add_days, flt, getdate
from ._saas_utils import (
    require_auth, ok, fail,
    page, parse_payload, has_doctype, pick_fields, safe_count,
)


# ─── DocType detection ────────────────────────────────────────────────────────

def _ticket_dt():
    """HD Ticket (Frappe Helpdesk) preferred; fall back to ERPNext Issue."""
    if has_doctype("HD Ticket"):
        return "HD Ticket"
    if has_doctype("Issue"):
        return "Issue"
    return None


def _sla_dt():
    if has_doctype("HD SLA"):
        return "HD SLA"
    if has_doctype("Service Level Agreement"):
        return "Service Level Agreement"
    return None


def _get_status_options(dt: str) -> list:
    try:
        meta = frappe.get_meta(dt)
        sf = meta.get_field("status")
        if sf and sf.options:
            return [o.strip() for o in sf.options.split("\n") if o.strip()]
    except Exception:
        pass
    return []


def _avg_resolution_days(dt: str) -> float:
    try:
        result = frappe.db.sql(
            f"""SELECT AVG(DATEDIFF(modified, creation)) AS avg_days
                FROM `tab{dt}` WHERE status IN ('Closed','Resolved')
                AND creation >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)""",
            as_dict=True,
        )
        return round(float(result[0].avg_days or 0), 1) if result else 0
    except Exception:
        return 0


# ─── Dashboard ───────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_dashboard():
    require_auth()
    dt = _ticket_dt()

    if not dt:
        return ok({
            "cards": {
                "open": 0, "in_progress": 0, "resolved": 0, "closed": 0,
                "high_priority": 0, "overdue_sla": 0, "total": 0,
            },
            "available": False,
        })

    open_count  = frappe.db.count(dt, {"status": ["not in", ["Closed", "Resolved"]]})
    status_opts = _get_status_options(dt)

    in_progress = frappe.db.count(dt, {"status": "In Progress"}) \
        if "In Progress" in status_opts else 0
    on_hold     = frappe.db.count(dt, {"status": "On Hold"}) \
        if "On Hold" in status_opts else 0
    resolved    = frappe.db.count(dt, {"status": "Resolved"})
    closed      = frappe.db.count(dt, {"status": "Closed"})

    high_prio = 0
    if "priority" in pick_fields(dt, ["priority"]):
        high_prio = frappe.db.count(dt, {
            "priority": ["in", ["High", "Urgent"]],
            "status": ["not in", ["Closed", "Resolved"]],
        })

    # SLA overdue — tickets past response_by / resolution_by
    overdue_sla = 0
    today = nowdate()
    try:
        for date_field in ("response_by", "resolution_by", "resolution_date"):
            if date_field in pick_fields(dt, [date_field]):
                overdue_sla = frappe.db.count(dt, {
                    "status": ["not in", ["Closed", "Resolved"]],
                    date_field: ["<", today],
                })
                break
    except Exception:
        pass

    # Warranty claims open
    open_warranty_claims = 0
    if has_doctype("Warranty Claim"):
        open_warranty_claims = safe_count("Warranty Claim",
                                          {"status": ["not in", ["Closed", "Cancelled"]]})

    # Maintenance visits due today or overdue
    maintenance_due = 0
    if has_doctype("Maintenance Visit"):
        maintenance_due = safe_count("Maintenance Visit", {
            "maintenance_date": ["<=", today],
            "docstatus": 0,
        })

    return ok({
        "cards": {
            "open":                 open_count,
            "in_progress":          in_progress,
            "on_hold":              on_hold,
            "resolved":             resolved,
            "closed":               closed,
            "high_priority":        high_prio,
            "overdue_sla":          overdue_sla,
            "total":                open_count + resolved + closed,
            "open_warranty_claims": open_warranty_claims,
            "maintenance_due":      maintenance_due,
        },
        "avg_resolution_days": _avg_resolution_days(dt),
        "available": True,
        "backend": dt,
    })


# ─── Tickets / Issues ────────────────────────────────────────────────────────

@frappe.whitelist()
def get_tickets(status=None, priority=None, customer=None,
                assigned_to=None, issue_type=None, search=None,
                from_date=None, to_date=None, limit=50, offset=0):
    require_auth()
    dt = _ticket_dt()
    limit, offset = page(limit, offset)

    if not dt:
        return ok({"tickets": []}, meta={"total": 0})

    filters = {}
    if status and status != "all":
        filters["status"] = status
    if priority and priority != "all":
        if "priority" in pick_fields(dt, ["priority"]):
            filters["priority"] = priority
    if customer:
        filters["customer"] = customer
    if assigned_to:
        filters["_assign"] = ["like", f"%{assigned_to}%"]
    if issue_type:
        for f in ("issue_type", "ticket_type"):
            if f in pick_fields(dt, [f]):
                filters[f] = issue_type
                break
    if from_date:
        filters["creation"] = [">=", from_date]
    if to_date:
        filters["creation"] = ["<=", to_date]

    if dt == "HD Ticket":
        field_candidates = [
            "name", "subject", "raised_by", "customer", "status",
            "priority", "creation", "modified", "agent_group",
            "ticket_type", "resolution_by", "first_response_time",
            "contact", "company", "_assign",
        ]
    else:
        field_candidates = [
            "name", "subject", "raised_by", "customer", "status",
            "priority", "issue_type", "creation", "modified",
            "response_by", "resolution_date", "service_level_agreement",
            "contact", "company", "lead", "_assign",
        ]

    fields = pick_fields(dt, field_candidates)

    rows = frappe.get_all(
        dt,
        filters=filters,
        fields=fields,
        order_by="modified desc",
        limit_start=offset,
        limit_page_length=limit,
    )

    if search:
        s = search.lower()
        rows = [r for r in rows if s in (r.get("subject") or "").lower()
                or s in (r.get("customer") or "").lower()
                or s in (r.get("raised_by") or "").lower()]

    tickets = [
        {
            "id":          r.name,
            "subject":     r.get("subject") or r.name,
            "customer":    r.get("customer"),
            "raised_by":   r.get("raised_by"),
            "status":      r.get("status") or "Open",
            "priority":    r.get("priority") or "Medium",
            "type":        r.get("ticket_type") or r.get("issue_type"),
            "assigned_to": r.get("_assign"),
            "company":     r.get("company"),
            "contact":     r.get("contact"),
            "sla_date":    str(r.get("resolution_by") or r.get("resolution_date") or ""),
            "created":     str(r.get("creation") or ""),
            "updated":     str(r.get("modified") or ""),
        }
        for r in rows
    ]

    total = frappe.db.count(dt, filters)
    return ok({"tickets": tickets}, meta={"total": total, "limit": limit, "offset": offset})


@frappe.whitelist()
def get_ticket(ticket_id):
    require_auth()
    dt = _ticket_dt()
    if not dt:
        return fail("No helpdesk DocType installed")
    doc = frappe.get_doc(dt, ticket_id)

    # Fetch communication thread
    communications = []
    try:
        communications = frappe.get_all(
            "Communication",
            filters={"reference_doctype": dt, "reference_name": ticket_id},
            fields=["name", "sender", "recipients", "subject", "content",
                    "sent_or_received", "creation", "communication_type"],
            order_by="creation asc",
        )
    except Exception:
        pass

    data = doc.as_dict()
    data["communications"] = communications
    return ok({"ticket": data})


@frappe.whitelist()
def create_ticket(data=None, **kwargs):
    require_auth()
    p = parse_payload(data, **kwargs)
    dt = _ticket_dt()

    if not dt:
        return fail("No helpdesk DocType installed – enable Frappe Helpdesk or ERPNext")

    doc = frappe.new_doc(dt)
    doc.subject = (p.get("subject") or "").strip()
    if not doc.subject:
        return fail("subject is required")

    settable = pick_fields(dt, [
        "description", "customer", "priority", "status",
        "raised_by", "ticket_type", "issue_type", "agent_group",
        "contact", "company", "lead", "service_level_agreement",
        "issue_split_from",
    ])
    for k in settable:
        if k in p:
            doc.set(k, p[k])

    if "status" in settable and not doc.get("status"):
        doc.status = "Open"
    if "priority" in settable and not doc.get("priority"):
        doc.priority = "Medium"

    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    return ok({"ticket": {"id": doc.name, "subject": doc.subject}}, "Ticket created")


@frappe.whitelist()
def update_ticket(ticket_id, data=None, **kwargs):
    require_auth()
    dt = _ticket_dt()
    if not dt:
        return fail("No helpdesk DocType installed")

    p = parse_payload(data, **kwargs)
    doc = frappe.get_doc(dt, ticket_id)

    settable = pick_fields(dt, [
        "status", "priority", "description", "resolution",
        "customer", "contact", "company", "issue_type",
        "ticket_type", "agent_group", "service_level_agreement",
    ])
    for k in settable:
        if k in p:
            doc.set(k, p[k])

    doc.save(ignore_permissions=True)
    frappe.db.commit()
    return ok({"ticket": {"id": doc.name, "status": doc.get("status")}}, "Ticket updated")


@frappe.whitelist()
def delete_ticket(ticket_id):
    require_auth()
    dt = _ticket_dt()
    if not dt:
        return fail("No helpdesk DocType installed")
    frappe.delete_doc(dt, ticket_id, ignore_permissions=True)
    frappe.db.commit()
    return ok({"deleted": ticket_id}, "Ticket deleted")


@frappe.whitelist()
def close_ticket(ticket_id, resolution=None):
    """Set status to Closed and optionally record resolution text."""
    require_auth()
    dt = _ticket_dt()
    if not dt:
        return fail("No helpdesk DocType installed")

    doc = frappe.get_doc(dt, ticket_id)
    doc.status = "Closed"
    if resolution:
        if "resolution" in pick_fields(dt, ["resolution"]):
            doc.resolution = resolution
    doc.save(ignore_permissions=True)
    frappe.db.commit()
    return ok({"ticket": {"id": doc.name, "status": "Closed"}}, "Ticket closed")


@frappe.whitelist()
def reopen_ticket(ticket_id):
    """Reopen a Closed or Resolved ticket."""
    require_auth()
    dt = _ticket_dt()
    if not dt:
        return fail("No helpdesk DocType installed")

    doc = frappe.get_doc(dt, ticket_id)
    if doc.status not in ("Closed", "Resolved"):
        return fail("Only Closed or Resolved tickets can be reopened")
    doc.status = "Open"
    doc.save(ignore_permissions=True)
    frappe.db.commit()
    return ok({"ticket": {"id": doc.name, "status": "Open"}}, "Ticket reopened")


@frappe.whitelist()
def escalate_ticket(ticket_id, priority=None):
    """Escalate a ticket to the next priority level."""
    require_auth()
    dt = _ticket_dt()
    if not dt:
        return fail("No helpdesk DocType installed")

    priority_ladder = ["Low", "Medium", "High", "Urgent"]
    doc = frappe.get_doc(dt, ticket_id)
    current = doc.get("priority") or "Medium"

    if priority:
        new_priority = priority
    else:
        idx = priority_ladder.index(current) if current in priority_ladder else 1
        new_priority = priority_ladder[min(idx + 1, len(priority_ladder) - 1)]

    if "priority" in pick_fields(dt, ["priority"]):
        doc.priority = new_priority
        doc.save(ignore_permissions=True)
        frappe.db.commit()

    return ok({"ticket": {"id": doc.name, "priority": new_priority}}, "Ticket escalated")


@frappe.whitelist()
def assign_ticket(ticket_id, assign_to):
    """Assign a ticket to a user."""
    require_auth()
    dt = _ticket_dt()
    if not dt:
        return fail("No helpdesk DocType installed")

    try:
        frappe.share.add(dt, ticket_id, assign_to, write=1)
        frappe.db.set_value(dt, ticket_id, "_assign",
                            frappe.json.dumps([assign_to]))
        frappe.db.commit()
    except Exception as e:
        return fail(str(e))

    return ok({"ticket": {"id": ticket_id, "assigned_to": assign_to}}, "Ticket assigned")


@frappe.whitelist()
def bulk_close_tickets(ticket_ids, resolution=None):
    """Close multiple tickets in one call."""
    require_auth()
    dt = _ticket_dt()
    if not dt:
        return fail("No helpdesk DocType installed")

    if isinstance(ticket_ids, str):
        import json
        ticket_ids = json.loads(ticket_ids)

    closed = []
    for tid in ticket_ids:
        try:
            update = {"status": "Closed"}
            if resolution and "resolution" in pick_fields(dt, ["resolution"]):
                update["resolution"] = resolution
            frappe.db.set_value(dt, tid, update)
            closed.append(tid)
        except Exception:
            pass

    frappe.db.commit()
    return ok({"closed": closed, "count": len(closed)}, f"{len(closed)} ticket(s) closed")


# ─── Ticket Comments / Replies ────────────────────────────────────────────────

@frappe.whitelist()
def add_ticket_comment(ticket_id, message, sent_or_received="Sent"):
    """Add a comment/reply to a ticket via a Communication record."""
    require_auth()
    dt = _ticket_dt()
    if not dt:
        return fail("No helpdesk DocType installed")

    if not message or not message.strip():
        return fail("message is required")

    comm = frappe.new_doc("Communication")
    comm.communication_type  = "Comment"
    comm.reference_doctype   = dt
    comm.reference_name      = ticket_id
    comm.content             = message
    comm.sent_or_received    = sent_or_received
    comm.sender              = frappe.session.user
    comm.insert(ignore_permissions=True)
    frappe.db.commit()

    return ok({"comment": {"id": comm.name}}, "Comment added")


@frappe.whitelist()
def get_ticket_comments(ticket_id):
    """Return the full communication thread for a ticket."""
    require_auth()
    dt = _ticket_dt()
    if not dt:
        return fail("No helpdesk DocType installed")

    comments = frappe.get_all(
        "Communication",
        filters={"reference_doctype": dt, "reference_name": ticket_id},
        fields=["name", "sender", "recipients", "content",
                "sent_or_received", "communication_type", "creation"],
        order_by="creation asc",
    )
    return ok({"comments": comments, "ticket": ticket_id})


# ─── Issue Types & Priorities ─────────────────────────────────────────────────

@frappe.whitelist()
def get_issue_types():
    require_auth()
    dt = _ticket_dt()
    if not dt:
        return ok({"issue_types": []})

    # HD Ticket uses "HD Ticket Type"; Issue uses "Issue Type"
    type_dt = "HD Ticket Type" if dt == "HD Ticket" else "Issue Type"
    if not has_doctype(type_dt):
        return ok({"issue_types": []})

    name_field = "ticket_type" if type_dt == "HD Ticket Type" else "issue_type"
    rows = frappe.get_all(type_dt, fields=["name", name_field], order_by="name asc")
    return ok({"issue_types": rows, "backend": type_dt})


@frappe.whitelist()
def get_issue_priorities():
    """Return priority options from the DocType meta."""
    require_auth()
    dt = _ticket_dt()
    if not dt:
        return ok({"priorities": ["Low", "Medium", "High", "Urgent"]})

    # Try to get from Issue Priority master first
    if has_doctype("Issue Priority"):
        rows = frappe.get_all("Issue Priority", fields=["name"], order_by="name asc")
        return ok({"priorities": [r.name for r in rows]})

    # Fall back to Select field options
    opts = _get_status_options(dt)
    # Re-read priority field options
    try:
        meta = frappe.get_meta(dt)
        pf   = meta.get_field("priority")
        if pf and pf.options:
            opts = [o.strip() for o in pf.options.split("\n") if o.strip()]
    except Exception:
        pass

    return ok({"priorities": opts or ["Low", "Medium", "High", "Urgent"]})


@frappe.whitelist()
def get_status_options():
    """Return valid status values for tickets."""
    require_auth()
    dt = _ticket_dt()
    if not dt:
        return ok({"statuses": []})
    return ok({"statuses": _get_status_options(dt), "backend": dt})


# ─── Service Level Agreements ─────────────────────────────────────────────────

@frappe.whitelist()
def get_slas(limit=50, offset=0):
    require_auth()
    dt = _sla_dt()
    if not dt:
        return ok({"slas": []})

    fields = pick_fields(dt, [
        "name", "enabled", "entity_type", "entity",
        "default_priority", "holiday_list",
        "start_date", "end_date",
    ])

    rows = frappe.get_all(
        dt,
        fields=fields,
        order_by="modified desc",
        limit_page_length=int(limit or 50),
    )
    return ok({"slas": rows, "backend": dt})


@frappe.whitelist()
def get_sla(sla_id):
    require_auth()
    dt = _sla_dt()
    if not dt:
        return fail("No SLA DocType installed")
    doc = frappe.get_doc(dt, sla_id)
    return ok({"sla": doc.as_dict()})


@frappe.whitelist()
def create_sla(data=None, **kwargs):
    require_auth()
    dt = _sla_dt()
    if not dt:
        return fail("No SLA DocType installed")

    p = parse_payload(data, **kwargs)
    doc = frappe.new_doc(dt)

    settable = pick_fields(dt, [
        "enabled", "entity_type", "entity", "default_priority",
        "holiday_list", "start_date", "end_date",
    ])
    for k in settable:
        if k in p:
            doc.set(k, p[k])

    # Priority-level response/resolution targets (child table)
    if p.get("priorities") and hasattr(doc, "priorities"):
        for pr in p["priorities"]:
            doc.append("priorities", pr)

    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    return ok({"sla": {"id": doc.name}}, "SLA created")


@frappe.whitelist()
def update_sla(sla_id, data=None, **kwargs):
    require_auth()
    dt = _sla_dt()
    if not dt:
        return fail("No SLA DocType installed")

    p = parse_payload(data, **kwargs)
    doc = frappe.get_doc(dt, sla_id)

    settable = pick_fields(dt, [
        "enabled", "default_priority", "holiday_list",
        "start_date", "end_date",
    ])
    for k in settable:
        if k in p:
            doc.set(k, p[k])

    doc.save(ignore_permissions=True)
    frappe.db.commit()
    return ok({"sla": {"id": doc.name}}, "SLA updated")


@frappe.whitelist()
def get_sla_compliance(from_date=None, to_date=None, customer=None, limit=50, offset=0):
    """Report: tickets with SLA breach status."""
    require_auth()
    dt = _ticket_dt()
    limit, offset = page(limit, offset)

    if not dt:
        return ok({"tickets": []}, meta={"total": 0})

    filters = {}
    if customer:
        filters["customer"] = customer
    if from_date:
        filters["creation"] = [">=", from_date]
    if to_date:
        filters["creation"] = ["<=", to_date]

    date_field = None
    for f in ("resolution_by", "response_by", "resolution_date"):
        if f in pick_fields(dt, [f]):
            date_field = f
            break

    fields = pick_fields(dt, [
        "name", "subject", "customer", "status", "priority",
        "creation", "modified", "resolution_by", "response_by",
        "resolution_date", "first_responded_on",
        "service_level_agreement", "agreement_status",
    ])

    rows = frappe.get_all(
        dt, filters=filters, fields=fields,
        order_by="creation desc",
        limit_start=offset, limit_page_length=limit,
    )

    today = nowdate()
    result = []
    for r in rows:
        due = r.get("resolution_by") or r.get("resolution_date")
        breached = (
            r.get("status") not in ("Closed", "Resolved")
            and due and str(due) < today
        )
        result.append({
            "id":          r.name,
            "subject":     r.get("subject"),
            "customer":    r.get("customer"),
            "status":      r.get("status"),
            "priority":    r.get("priority"),
            "sla_due":     str(due or ""),
            "breached":    breached,
            "agreement_status": r.get("agreement_status"),
            "created":     str(r.get("creation") or ""),
        })

    total = frappe.db.count(dt, filters)
    return ok({"tickets": result}, meta={"total": total, "limit": limit, "offset": offset})


# ─── Warranty ─────────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_warranties(item=None, customer=None, limit=50, offset=0):
    require_auth()
    limit, offset = page(limit, offset)

    if not has_doctype("Warranty Claim"):
        return ok({"warranties": []}, meta={"total": 0})

    filters = {}
    if item:
        filters["item_code"] = item
    if customer:
        filters["customer"] = customer

    fields = pick_fields("Warranty Claim", [
        "name", "customer", "customer_name", "item_code", "item_name",
        "serial_no", "status", "warranty_amc_status", "issue_date",
        "resolution_date", "modified",
    ])

    rows = frappe.get_all(
        "Warranty Claim",
        filters=filters,
        fields=fields,
        order_by="modified desc",
        limit_start=offset,
        limit_page_length=limit,
    )
    total = frappe.db.count("Warranty Claim", filters)
    return ok({"warranties": rows}, meta={"total": total, "limit": limit, "offset": offset})


@frappe.whitelist()
def get_warranty_claim(claim_id):
    require_auth()
    if not has_doctype("Warranty Claim"):
        return fail("Warranty Claim DocType not installed")
    doc = frappe.get_doc("Warranty Claim", claim_id)
    return ok({"warranty_claim": doc.as_dict()})


@frappe.whitelist()
def create_warranty_claim(data=None, **kwargs):
    require_auth()
    p = parse_payload(data, **kwargs)

    if not has_doctype("Warranty Claim"):
        return fail("Warranty Claim DocType not installed")

    doc = frappe.new_doc("Warranty Claim")

    settable = pick_fields("Warranty Claim", [
        "customer", "customer_name", "customer_address",
        "item_code", "item_name", "serial_no",
        "description", "issue_date", "status",
        "warranty_amc_status", "complaint", "complaint_date",
    ])
    for k in settable:
        if k in p:
            doc.set(k, p[k])

    doc.status      = doc.get("status") or "Open"
    doc.issue_date  = doc.get("issue_date") or nowdate()

    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    return ok({"warranty_claim": {"id": doc.name}}, "Warranty claim created")


@frappe.whitelist()
def update_warranty_claim(claim_id, data=None, **kwargs):
    require_auth()
    if not has_doctype("Warranty Claim"):
        return fail("Warranty Claim DocType not installed")

    p = parse_payload(data, **kwargs)
    doc = frappe.get_doc("Warranty Claim", claim_id)

    settable = pick_fields("Warranty Claim", [
        "status", "resolution_details", "resolution_date",
        "warranty_amc_status", "description",
    ])
    for k in settable:
        if k in p:
            doc.set(k, p[k])

    doc.save(ignore_permissions=True)
    frappe.db.commit()
    return ok({"warranty_claim": {"id": doc.name, "status": doc.status}}, "Warranty claim updated")


@frappe.whitelist()
def delete_warranty_claim(claim_id):
    require_auth()
    if not has_doctype("Warranty Claim"):
        return fail("Warranty Claim DocType not installed")
    frappe.delete_doc("Warranty Claim", claim_id, ignore_permissions=True)
    frappe.db.commit()
    return ok({"deleted": claim_id}, "Warranty claim deleted")


# ─── Maintenance Visits ───────────────────────────────────────────────────────

@frappe.whitelist()
def get_maintenance_visits(customer=None, status=None,
                           from_date=None, to_date=None,
                           limit=50, offset=0):
    require_auth()
    limit, offset = page(limit, offset)

    if not has_doctype("Maintenance Visit"):
        return ok({"visits": []}, meta={"total": 0})

    filters = {}
    if customer:
        filters["customer"] = customer
    if status:
        filters["maintenance_type"] = status
    if from_date:
        filters["maintenance_date"] = [">=", from_date]
    if to_date:
        filters["maintenance_date"] = ["<=", to_date]

    fields = pick_fields("Maintenance Visit", [
        "name", "customer", "customer_name", "maintenance_date",
        "maintenance_type", "status", "completion_status",
        "customer_feedback", "warranty_claim", "modified",
    ])

    rows = frappe.get_all(
        "Maintenance Visit",
        filters=filters,
        fields=fields,
        order_by="maintenance_date desc",
        limit_start=offset,
        limit_page_length=limit,
    )
    total = frappe.db.count("Maintenance Visit", filters)
    return ok({"visits": rows}, meta={"total": total, "limit": limit, "offset": offset})


@frappe.whitelist()
def get_maintenance_visit(visit_id):
    require_auth()
    if not has_doctype("Maintenance Visit"):
        return fail("Maintenance Visit DocType not installed")
    doc = frappe.get_doc("Maintenance Visit", visit_id)
    return ok({"visit": doc.as_dict()})


@frappe.whitelist()
def create_maintenance_visit(data=None, **kwargs):
    require_auth()
    p = parse_payload(data, **kwargs)

    if not has_doctype("Maintenance Visit"):
        return fail("Maintenance Visit DocType not installed")

    doc = frappe.new_doc("Maintenance Visit")

    settable = pick_fields("Maintenance Visit", [
        "customer", "customer_name", "customer_address",
        "maintenance_date", "maintenance_type", "status",
        "completion_status", "warranty_claim",
        "customer_feedback",
    ])
    for k in settable:
        if k in p:
            doc.set(k, p[k])

    doc.maintenance_date = doc.get("maintenance_date") or nowdate()
    doc.completion_status = doc.get("completion_status") or "Partially Completed"

    # Purpose / activities (child table)
    for purpose in p.get("purposes") or []:
        doc.append("purposes", {
            "item_code":    purpose.get("item_code"),
            "item_name":    purpose.get("item_name"),
            "serial_no":    purpose.get("serial_no"),
            "description":  purpose.get("description"),
            "work_done":    purpose.get("work_done"),
        })

    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    return ok({"visit": {"id": doc.name}}, "Maintenance visit created")


@frappe.whitelist()
def update_maintenance_visit(visit_id, data=None, **kwargs):
    require_auth()
    if not has_doctype("Maintenance Visit"):
        return fail("Maintenance Visit DocType not installed")

    p = parse_payload(data, **kwargs)
    doc = frappe.get_doc("Maintenance Visit", visit_id)

    settable = pick_fields("Maintenance Visit", [
        "maintenance_date", "maintenance_type", "status",
        "completion_status", "customer_feedback",
    ])
    for k in settable:
        if k in p:
            doc.set(k, p[k])

    doc.save(ignore_permissions=True)
    frappe.db.commit()
    return ok({"visit": {"id": doc.name, "completion_status": doc.completion_status}},
              "Maintenance visit updated")


@frappe.whitelist()
def delete_maintenance_visit(visit_id):
    require_auth()
    if not has_doctype("Maintenance Visit"):
        return fail("Maintenance Visit DocType not installed")
    frappe.delete_doc("Maintenance Visit", visit_id, ignore_permissions=True)
    frappe.db.commit()
    return ok({"deleted": visit_id}, "Maintenance visit deleted")


# ─── Maintenance Schedules ────────────────────────────────────────────────────

@frappe.whitelist()
def get_maintenance_schedules(customer=None, status=None, limit=50, offset=0):
    require_auth()
    limit, offset = page(limit, offset)

    if not has_doctype("Maintenance Schedule"):
        return ok({"schedules": []}, meta={"total": 0})

    filters = {}
    if customer:
        filters["customer"] = customer
    if status:
        filters["status"] = status

    fields = pick_fields("Maintenance Schedule", [
        "name", "customer", "customer_name", "status",
        "transaction_date", "docstatus", "modified",
    ])

    rows = frappe.get_all(
        "Maintenance Schedule",
        filters=filters,
        fields=fields,
        order_by="transaction_date desc",
        limit_start=offset,
        limit_page_length=limit,
    )
    total = frappe.db.count("Maintenance Schedule", filters)
    return ok({"schedules": rows}, meta={"total": total, "limit": limit, "offset": offset})


@frappe.whitelist()
def get_maintenance_schedule(schedule_id):
    require_auth()
    if not has_doctype("Maintenance Schedule"):
        return fail("Maintenance Schedule DocType not installed")
    doc = frappe.get_doc("Maintenance Schedule", schedule_id)
    return ok({"schedule": doc.as_dict()})


@frappe.whitelist()
def create_maintenance_schedule(data=None, **kwargs):
    require_auth()
    p = parse_payload(data, **kwargs)

    if not has_doctype("Maintenance Schedule"):
        return fail("Maintenance Schedule DocType not installed")

    doc = frappe.new_doc("Maintenance Schedule")

    settable = pick_fields("Maintenance Schedule", [
        "customer", "customer_name", "customer_address",
        "transaction_date", "company", "sales_order",
    ])
    for k in settable:
        if k in p:
            doc.set(k, p[k])

    doc.transaction_date = doc.get("transaction_date") or nowdate()

    # Items to schedule (child table: items)
    for item in p.get("items") or []:
        doc.append("items", {
            "item_code":        item.get("item_code"),
            "item_name":        item.get("item_name"),
            "serial_no":        item.get("serial_no"),
            "start_date":       item.get("start_date"),
            "end_date":         item.get("end_date"),
            "periodicity":      item.get("periodicity") or "Monthly",
            "no_of_visits":     item.get("no_of_visits") or 1,
            "sales_person":     item.get("sales_person"),
        })

    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    return ok({"schedule": {"id": doc.name}}, "Maintenance schedule created")


# ─── Support Settings ─────────────────────────────────────────────────────────

@frappe.whitelist()
def get_support_settings():
    require_auth()
    if not has_doctype("Support Settings"):
        return ok({"settings": {}})
    try:
        doc = frappe.get_single("Support Settings")
        return ok({"settings": doc.as_dict()})
    except Exception:
        return ok({"settings": {}})


@frappe.whitelist()
def update_support_settings(data=None, **kwargs):
    require_auth()
    p = parse_payload(data, **kwargs)

    if not has_doctype("Support Settings"):
        return fail("Support Settings DocType not installed")

    doc = frappe.get_single("Support Settings")
    settable = [
        "track_service_level_agreement", "allow_resetting_service_level_agreement",
        "close_issue_after_days", "auto_close_tickets",
    ]
    for k in settable:
        if k in p:
            doc.set(k, p[k])

    doc.save(ignore_permissions=True)
    frappe.db.commit()
    return ok({"settings": {"saved": True}}, "Support settings updated")


# ─── Support Reports ──────────────────────────────────────────────────────────

@frappe.whitelist()
def get_first_response_report(from_date=None, to_date=None, customer=None):
    """Average first-response time per ticket, segmented by priority."""
    require_auth()
    dt = _ticket_dt()
    if not dt:
        return ok({"data": []})

    conditions = ["status IN ('Closed','Resolved')"]
    values: list = []

    if from_date:
        conditions.append("creation >= %s")
        values.append(from_date)
    if to_date:
        conditions.append("creation <= %s")
        values.append(to_date)
    if customer:
        conditions.append("customer = %s")
        values.append(customer)

    where = " AND ".join(conditions)

    first_resp_field = None
    for f in ("first_responded_on", "first_response_time"):
        if f in pick_fields(dt, [f]):
            first_resp_field = f
            break

    if not first_resp_field:
        return ok({"data": [], "note": "first_responded_on field not present on this DocType"})

    try:
        result = frappe.db.sql(
            f"""SELECT priority,
                       COUNT(*) AS total,
                       AVG(TIMESTAMPDIFF(HOUR, creation, {first_resp_field})) AS avg_response_hours
                FROM `tab{dt}`
                WHERE {where} AND {first_resp_field} IS NOT NULL
                GROUP BY priority
                ORDER BY avg_response_hours""",
            values, as_dict=True,
        )
        return ok({"data": result})
    except Exception as e:
        return ok({"data": [], "error": str(e)})


@frappe.whitelist()
def get_resolution_report(from_date=None, to_date=None, customer=None):
    """Average resolution time per ticket type/priority."""
    require_auth()
    dt = _ticket_dt()
    if not dt:
        return ok({"data": []})

    conditions = ["status IN ('Closed','Resolved')"]
    values: list = []

    if from_date:
        conditions.append("creation >= %s")
        values.append(from_date)
    if to_date:
        conditions.append("creation <= %s")
        values.append(to_date)
    if customer:
        conditions.append("customer = %s")
        values.append(customer)

    where = " AND ".join(conditions)

    try:
        result = frappe.db.sql(
            f"""SELECT priority,
                       COUNT(*) AS total,
                       AVG(DATEDIFF(modified, creation)) AS avg_resolution_days
                FROM `tab{dt}`
                WHERE {where}
                GROUP BY priority
                ORDER BY avg_resolution_days""",
            values, as_dict=True,
        )
        return ok({"data": result})
    except Exception as e:
        return ok({"data": [], "error": str(e)})


@frappe.whitelist()
def get_ticket_volume_report(from_date=None, to_date=None,
                              group_by="status", customer=None):
    """Ticket volume grouped by status, priority, type, or customer."""
    require_auth()
    dt = _ticket_dt()
    if not dt:
        return ok({"data": []})

    allowed_groups = {"status", "priority", "customer"}
    # Add type field based on backend
    type_field = "ticket_type" if dt == "HD Ticket" else "issue_type"
    if type_field in pick_fields(dt, [type_field]):
        allowed_groups.add(type_field)

    if group_by not in allowed_groups:
        group_by = "status"

    conditions = ["1=1"]
    values: list = []

    if from_date:
        conditions.append("creation >= %s")
        values.append(from_date)
    if to_date:
        conditions.append("creation <= %s")
        values.append(to_date)
    if customer:
        conditions.append("customer = %s")
        values.append(customer)

    where = " AND ".join(conditions)

    try:
        result = frappe.db.sql(
            f"""SELECT {group_by} AS label, COUNT(*) AS count
                FROM `tab{dt}`
                WHERE {where}
                GROUP BY {group_by}
                ORDER BY count DESC""",
            values, as_dict=True,
        )
        return ok({"data": result, "group_by": group_by})
    except Exception as e:
        return ok({"data": [], "error": str(e)})


@frappe.whitelist()
def get_agent_performance_report(from_date=None, to_date=None):
    """Tickets resolved per agent within a date range."""
    require_auth()
    dt = _ticket_dt()
    if not dt:
        return ok({"data": []})

    conditions = ["status IN ('Closed','Resolved')"]
    values: list = []

    if from_date:
        conditions.append("creation >= %s")
        values.append(from_date)
    if to_date:
        conditions.append("creation <= %s")
        values.append(to_date)

    where = " AND ".join(conditions)

    try:
        result = frappe.db.sql(
            f"""SELECT _assign AS agent, COUNT(*) AS resolved_count,
                       AVG(DATEDIFF(modified, creation)) AS avg_days
                FROM `tab{dt}`
                WHERE {where} AND _assign IS NOT NULL AND _assign != ''
                GROUP BY _assign
                ORDER BY resolved_count DESC""",
            values, as_dict=True,
        )
        return ok({"data": result})
    except Exception as e:
        return ok({"data": [], "error": str(e)})