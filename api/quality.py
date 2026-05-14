"""
quality.py  –  Quality Management module API for the Fuze Business Suite.
Covers Quality Goals, Quality Meetings, Quality Procedures, Quality Reviews,
Quality Action Plans, and the Quality dashboard.

ERPNext Quality Management workflow:
    Quality Goal → Quality Meeting → Quality Review → Quality Action Plan
"""

import frappe
from frappe.utils import flt, nowdate, get_first_day, get_last_day
from ._saas_utils import (
    require_auth, ok, fail, get_company, get_currency,
    page, parse_payload, has_doctype, pick_fields,
    safe_count, safe_sql_sum,
)


# ─── Dashboard ────────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_dashboard(company=None):
    """
    Return a summary of key Quality Management metrics including
    open goals, pending reviews, overdue actions, and recent meetings.

    Args:
        company (str, optional): Filter by company.

    Returns:
        dict: Dashboard card data.
    """
    require_auth()
    company = get_company(company)

    goals = safe_count("Quality Goal", {"company": company}) if has_doctype("Quality Goal") else 0
    meetings = safe_count("Quality Meeting", {"company": company}) if has_doctype("Quality Meeting") else 0
    procedures = safe_count("Quality Procedure", {"company": company}) if has_doctype("Quality Procedure") else 0

    pending_reviews = safe_count("Quality Review", {
        "company": company,
        "status": ["in", ["Draft", "Open"]],
    }) if has_doctype("Quality Review") else 0

    open_actions = safe_count("Quality Action", {
        "company": company,
        "status": "Open",
    }) if has_doctype("Quality Action") else 0

    overdue_actions = safe_count("Quality Action", {
        "company": company,
        "status": "Open",
        "date": ["<", nowdate()],
    }) if has_doctype("Quality Action") else 0

    return ok({
        "cards": {
            "quality_goals": goals,
            "quality_meetings": meetings,
            "quality_procedures": procedures,
            "pending_reviews": pending_reviews,
            "open_actions": open_actions,
            "overdue_actions": overdue_actions,
        },
        "period": {"today": nowdate()},
    })


# ─── Quality Goals ────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_quality_goals(company=None, limit=50, offset=0):
    """
    List all Quality Goals for the company. Goals define measurable
    targets that the organisation aims to achieve.

    Args:
        company (str, optional): Company filter.
        limit (int): Page size.
        offset (int): Page offset.

    Returns:
        dict: Paginated list of Quality Goals.
    """
    require_auth()
    limit, offset = page(limit, offset)
    company = get_company(company)

    if not has_doctype("Quality Goal"):
        return ok({"quality_goals": []}, meta={"total": 0})

    filters = {"company": company}
    fields = pick_fields("Quality Goal", [
        "name", "goal", "frequency", "date",
        "monitoring_by", "revision",
    ])

    rows = frappe.get_all(
        "Quality Goal",
        filters=filters,
        fields=fields,
        order_by="date desc",
        limit_start=offset,
        limit_page_length=limit,
    )

    total = frappe.db.count("Quality Goal", filters)
    return ok({"quality_goals": rows}, meta={"total": total, "limit": limit, "offset": offset})


@frappe.whitelist()
def get_quality_goal(name):
    """
    Fetch a single Quality Goal document with all objective rows.

    Args:
        name (str): Quality Goal name/ID.

    Returns:
        dict: Full Quality Goal document.
    """
    require_auth()
    if not has_doctype("Quality Goal"):
        return fail("Quality Goal DocType not installed")
    doc = frappe.get_doc("Quality Goal", name)
    return ok({"quality_goal": doc.as_dict()})


@frappe.whitelist()
def create_quality_goal(data=None, **kwargs):
    """
    Create a new Quality Goal. Goals should have measurable objectives
    tracked over a defined frequency (Daily, Weekly, Monthly, Quarterly, etc.).

    Payload fields:
        goal (str): Short title of the goal (required).
        frequency (str): Monitoring frequency — Daily, Weekly, Monthly,
                         Quarterly, Half-Yearly, Yearly.
        date (str, optional): Target date (YYYY-MM-DD). Defaults to today.
        monitoring_by (str, optional): User responsible for monitoring.
        objectives (list[dict]): Rows with ``objective``, ``target``,
                                  ``uom``, ``monitoring_frequency``.
        company (str, optional): Company override.

    Returns:
        dict: Name of the created Quality Goal.
    """
    require_auth()
    p = parse_payload(data, **kwargs)
    try:
        if not has_doctype("Quality Goal"):
            return fail("Quality Goal DocType not installed")

        doc = frappe.new_doc("Quality Goal")
        doc.company = get_company(p.get("company"))
        doc.goal = p.get("goal")
        doc.frequency = p.get("frequency") or "Monthly"
        doc.date = p.get("date") or nowdate()
        doc.monitoring_by = p.get("monitoring_by") or None
        doc.revision = p.get("revision") or 0

        for obj in (p.get("objectives") or []):
            if not isinstance(obj, dict):
                continue
            doc.append("objectives", {
                "objective": obj.get("objective"),
                "target": obj.get("target"),
                "uom": obj.get("uom"),
                "monitoring_frequency": obj.get("monitoring_frequency"),
            })

        doc.insert(ignore_permissions=True)
        frappe.db.commit()
        return ok({"quality_goal": {"id": doc.name}}, "Quality Goal created")
    except Exception as e:
        return fail(str(e))


@frappe.whitelist()
def update_quality_goal(name, data=None, **kwargs):
    """
    Update an existing Quality Goal.

    Args:
        name (str): Quality Goal ID.
        data (dict): Fields to update.

    Returns:
        dict: Success response.
    """
    require_auth()
    p = parse_payload(data, **kwargs)
    try:
        if not has_doctype("Quality Goal"):
            return fail("Quality Goal DocType not installed")
        doc = frappe.get_doc("Quality Goal", name)
        allowed = ["goal", "frequency", "date", "monitoring_by", "revision"]
        for field in allowed:
            if field in p:
                setattr(doc, field, p[field])
        doc.save(ignore_permissions=True)
        frappe.db.commit()
        return ok({"quality_goal": {"id": doc.name}}, "Quality Goal updated")
    except Exception as e:
        return fail(str(e))


# ─── Quality Meetings ─────────────────────────────────────────────────────────

@frappe.whitelist()
def get_quality_meetings(company=None, status=None, limit=50, offset=0):
    """
    List Quality Meetings. These are formal recorded sessions to review
    quality goals, procedures, and action items.

    Args:
        company (str, optional): Company filter.
        status (str, optional): Meeting status filter.
        limit (int): Page size.
        offset (int): Page offset.

    Returns:
        dict: Paginated list of Quality Meetings.
    """
    require_auth()
    limit, offset = page(limit, offset)
    company = get_company(company)

    if not has_doctype("Quality Meeting"):
        return ok({"quality_meetings": []}, meta={"total": 0})

    filters = {"company": company}
    if status and status != "all":
        filters["status"] = status

    fields = pick_fields("Quality Meeting", [
        "name", "date", "status", "minutes",
    ])

    rows = frappe.get_all(
        "Quality Meeting",
        filters=filters,
        fields=fields,
        order_by="date desc",
        limit_start=offset,
        limit_page_length=limit,
    )

    total = frappe.db.count("Quality Meeting", filters)
    return ok({"quality_meetings": rows}, meta={"total": total, "limit": limit, "offset": offset})


@frappe.whitelist()
def get_quality_meeting(name):
    """
    Fetch a single Quality Meeting with agenda and minutes rows.

    Args:
        name (str): Quality Meeting ID.

    Returns:
        dict: Full Quality Meeting document.
    """
    require_auth()
    if not has_doctype("Quality Meeting"):
        return fail("Quality Meeting DocType not installed")
    doc = frappe.get_doc("Quality Meeting", name)
    return ok({"quality_meeting": doc.as_dict()})


@frappe.whitelist()
def create_quality_meeting(data=None, **kwargs):
    """
    Create a new Quality Meeting record.

    Payload fields:
        date (str, optional): Meeting date (YYYY-MM-DD). Defaults to today.
        status (str, optional): Open / Closed.
        minutes (list[dict]): Agenda/minutes rows with ``topic``,
                               ``discussion``, ``action``, ``responsible``.
        company (str, optional): Company override.

    Returns:
        dict: Name of the created Quality Meeting.
    """
    require_auth()
    p = parse_payload(data, **kwargs)
    try:
        if not has_doctype("Quality Meeting"):
            return fail("Quality Meeting DocType not installed")

        doc = frappe.new_doc("Quality Meeting")
        doc.company = get_company(p.get("company"))
        doc.date = p.get("date") or nowdate()
        doc.status = p.get("status") or "Open"

        for row in (p.get("minutes") or []):
            if not isinstance(row, dict):
                continue
            doc.append("minutes", {
                "topic": row.get("topic"),
                "discussion": row.get("discussion"),
                "action": row.get("action"),
                "responsible": row.get("responsible"),
                "completion_date": row.get("completion_date"),
            })

        doc.insert(ignore_permissions=True)
        frappe.db.commit()
        return ok({"quality_meeting": {"id": doc.name}}, "Quality Meeting created")
    except Exception as e:
        return fail(str(e))


# ─── Quality Procedures ───────────────────────────────────────────────────────

@frappe.whitelist()
def get_quality_procedures(company=None, limit=50, offset=0):
    """
    List Quality Procedures. These are documented step-by-step processes
    that define how to achieve a quality standard.

    Args:
        company (str, optional): Company filter.
        limit (int): Page size.
        offset (int): Page offset.

    Returns:
        dict: Paginated list of Quality Procedures.
    """
    require_auth()
    limit, offset = page(limit, offset)
    company = get_company(company)

    if not has_doctype("Quality Procedure"):
        return ok({"quality_procedures": []}, meta={"total": 0})

    filters = {"company": company}
    fields = pick_fields("Quality Procedure", [
        "name", "quality_procedure_name", "parent_quality_procedure",
        "is_group",
    ])

    rows = frappe.get_all(
        "Quality Procedure",
        filters=filters,
        fields=fields,
        order_by="quality_procedure_name asc",
        limit_start=offset,
        limit_page_length=limit,
    )

    total = frappe.db.count("Quality Procedure", filters)
    return ok({"quality_procedures": rows}, meta={"total": total, "limit": limit, "offset": offset})


@frappe.whitelist()
def get_quality_procedure(name):
    """
    Fetch a single Quality Procedure including all process steps.

    Args:
        name (str): Quality Procedure ID.

    Returns:
        dict: Full Quality Procedure document.
    """
    require_auth()
    if not has_doctype("Quality Procedure"):
        return fail("Quality Procedure DocType not installed")
    doc = frappe.get_doc("Quality Procedure", name)
    return ok({"quality_procedure": doc.as_dict()})


@frappe.whitelist()
def create_quality_procedure(data=None, **kwargs):
    """
    Create a new Quality Procedure with process steps.

    Payload fields:
        quality_procedure_name (str): Name of the procedure (required).
        parent_quality_procedure (str, optional): Parent procedure for hierarchy.
        is_group (int, optional): 1 if this is a parent/group procedure.
        processes (list[dict]): Steps with ``process_description``,
                                 ``responsible``, ``link_to_document``.
        company (str, optional): Company override.

    Returns:
        dict: Name of the created Quality Procedure.
    """
    require_auth()
    p = parse_payload(data, **kwargs)
    try:
        if not has_doctype("Quality Procedure"):
            return fail("Quality Procedure DocType not installed")

        doc = frappe.new_doc("Quality Procedure")
        doc.company = get_company(p.get("company"))
        doc.quality_procedure_name = p.get("quality_procedure_name")
        doc.parent_quality_procedure = p.get("parent_quality_procedure") or None
        doc.is_group = p.get("is_group") or 0

        for step in (p.get("processes") or []):
            if not isinstance(step, dict):
                continue
            doc.append("processes", {
                "process_description": step.get("process_description"),
                "responsible": step.get("responsible"),
                "link_to_document": step.get("link_to_document"),
            })

        doc.insert(ignore_permissions=True)
        frappe.db.commit()
        return ok({"quality_procedure": {"id": doc.name}}, "Quality Procedure created")
    except Exception as e:
        return fail(str(e))


# ─── Quality Reviews ──────────────────────────────────────────────────────────

@frappe.whitelist()
def get_quality_reviews(company=None, status=None, limit=50, offset=0):
    """
    List Quality Reviews. Reviews are periodic evaluations of whether
    Quality Goals are being met.

    Args:
        company (str, optional): Company filter.
        status (str, optional): Draft / Open / Closed.
        limit (int): Page size.
        offset (int): Page offset.

    Returns:
        dict: Paginated list of Quality Reviews.
    """
    require_auth()
    limit, offset = page(limit, offset)
    company = get_company(company)

    if not has_doctype("Quality Review"):
        return ok({"quality_reviews": []}, meta={"total": 0})

    filters = {"company": company}
    if status and status != "all":
        filters["status"] = status

    fields = pick_fields("Quality Review", [
        "name", "date", "status", "goal", "review_by",
    ])

    rows = frappe.get_all(
        "Quality Review",
        filters=filters,
        fields=fields,
        order_by="date desc",
        limit_start=offset,
        limit_page_length=limit,
    )

    total = frappe.db.count("Quality Review", filters)
    return ok({"quality_reviews": rows}, meta={"total": total, "limit": limit, "offset": offset})


@frappe.whitelist()
def get_quality_review(name):
    """
    Fetch a single Quality Review with all objective rows and attachments.

    Args:
        name (str): Quality Review ID.

    Returns:
        dict: Full Quality Review document.
    """
    require_auth()
    if not has_doctype("Quality Review"):
        return fail("Quality Review DocType not installed")
    doc = frappe.get_doc("Quality Review", name)
    return ok({"quality_review": doc.as_dict()})


@frappe.whitelist()
def create_quality_review(data=None, **kwargs):
    """
    Create a new Quality Review to evaluate progress against a Quality Goal.

    Payload fields:
        goal (str): The Quality Goal being reviewed (required).
        date (str, optional): Review date. Defaults to today.
        review_by (str, optional): User conducting the review.
        status (str, optional): Open / Closed.
        reviews (list[dict]): Objective rows with ``objective``,
                               ``target``, ``achieved``, ``uom``.
        company (str, optional): Company override.

    Returns:
        dict: Name of the created Quality Review.
    """
    require_auth()
    p = parse_payload(data, **kwargs)
    try:
        if not has_doctype("Quality Review"):
            return fail("Quality Review DocType not installed")

        doc = frappe.new_doc("Quality Review")
        doc.company = get_company(p.get("company"))
        doc.goal = p.get("goal")
        doc.date = p.get("date") or nowdate()
        doc.review_by = p.get("review_by") or None
        doc.status = p.get("status") or "Open"

        for row in (p.get("reviews") or []):
            if not isinstance(row, dict):
                continue
            doc.append("reviews", {
                "objective": row.get("objective"),
                "target": row.get("target"),
                "achieved": row.get("achieved"),
                "uom": row.get("uom"),
            })

        doc.insert(ignore_permissions=True)
        frappe.db.commit()
        return ok({"quality_review": {"id": doc.name}}, "Quality Review created")
    except Exception as e:
        return fail(str(e))


# ─── Quality Actions ──────────────────────────────────────────────────────────

@frappe.whitelist()
def get_quality_actions(company=None, status=None, limit=50, offset=0):
    """
    List Quality Actions (corrective or preventive actions arising from
    reviews or non-conformances).

    Args:
        company (str, optional): Company filter.
        status (str, optional): Open / Closed.
        limit (int): Page size.
        offset (int): Page offset.

    Returns:
        dict: Paginated list of Quality Actions.
    """
    require_auth()
    limit, offset = page(limit, offset)
    company = get_company(company)

    if not has_doctype("Quality Action"):
        return ok({"quality_actions": []}, meta={"total": 0})

    filters = {"company": company}
    if status and status != "all":
        filters["status"] = status

    fields = pick_fields("Quality Action", [
        "name", "date", "status", "action", "action_type",
        "responsible", "goal", "review",
    ])

    rows = frappe.get_all(
        "Quality Action",
        filters=filters,
        fields=fields,
        order_by="date desc",
        limit_start=offset,
        limit_page_length=limit,
    )

    total = frappe.db.count("Quality Action", filters)
    return ok({"quality_actions": rows}, meta={"total": total, "limit": limit, "offset": offset})


@frappe.whitelist()
def get_quality_action(name):
    """
    Fetch a single Quality Action document.

    Args:
        name (str): Quality Action ID.

    Returns:
        dict: Full Quality Action document.
    """
    require_auth()
    if not has_doctype("Quality Action"):
        return fail("Quality Action DocType not installed")
    doc = frappe.get_doc("Quality Action", name)
    return ok({"quality_action": doc.as_dict()})


@frappe.whitelist()
def create_quality_action(data=None, **kwargs):
    """
    Create a new Quality Action (Corrective or Preventive).

    Payload fields:
        action (str): Title/description of the action (required).
        action_type (str): 'Corrective' or 'Preventive'.
        date (str, optional): Target completion date.
        responsible (str, optional): User responsible.
        status (str, optional): Open / Closed.
        goal (str, optional): Linked Quality Goal.
        review (str, optional): Linked Quality Review.
        resolutions (list[dict]): Rows with ``resolution``, ``responsible``,
                                   ``completion_date``.
        company (str, optional): Company override.

    Returns:
        dict: Name of the created Quality Action.
    """
    require_auth()
    p = parse_payload(data, **kwargs)
    try:
        if not has_doctype("Quality Action"):
            return fail("Quality Action DocType not installed")

        doc = frappe.new_doc("Quality Action")
        doc.company = get_company(p.get("company"))
        doc.action = p.get("action")
        doc.action_type = p.get("action_type") or "Corrective"
        doc.date = p.get("date") or nowdate()
        doc.responsible = p.get("responsible") or None
        doc.status = p.get("status") or "Open"
        doc.goal = p.get("goal") or None
        doc.review = p.get("review") or None

        for row in (p.get("resolutions") or []):
            if not isinstance(row, dict):
                continue
            doc.append("resolutions", {
                "resolution": row.get("resolution"),
                "responsible": row.get("responsible"),
                "completion_date": row.get("completion_date"),
            })

        doc.insert(ignore_permissions=True)
        frappe.db.commit()
        return ok({"quality_action": {"id": doc.name}}, "Quality Action created")
    except Exception as e:
        return fail(str(e))


@frappe.whitelist()
def close_quality_action(name):
    """
    Mark a Quality Action as Closed.

    Args:
        name (str): Quality Action ID.

    Returns:
        dict: Updated status.
    """
    require_auth()
    try:
        if not has_doctype("Quality Action"):
            return fail("Quality Action DocType not installed")
        doc = frappe.get_doc("Quality Action", name)
        doc.status = "Closed"
        doc.save(ignore_permissions=True)
        frappe.db.commit()
        return ok({"quality_action": {"id": doc.name, "status": "Closed"}}, "Quality Action closed")
    except Exception as e:
        return fail(str(e))


# ─── Quality Feedback ─────────────────────────────────────────────────────────

@frappe.whitelist()
def get_quality_feedbacks(company=None, limit=50, offset=0):
    """
    List Quality Feedback records submitted by customers or internal staff.

    Args:
        company (str, optional): Company filter.
        limit (int): Page size.
        offset (int): Page offset.

    Returns:
        dict: Paginated list of Quality Feedback records.
    """
    require_auth()
    limit, offset = page(limit, offset)
    company = get_company(company)

    if not has_doctype("Quality Feedback"):
        return ok({"quality_feedbacks": []}, meta={"total": 0})

    filters = {"company": company}
    fields = pick_fields("Quality Feedback", [
        "name", "date", "template", "document_type",
        "document_name", "feedback",
    ])

    rows = frappe.get_all(
        "Quality Feedback",
        filters=filters,
        fields=fields,
        order_by="date desc",
        limit_start=offset,
        limit_page_length=limit,
    )

    total = frappe.db.count("Quality Feedback", filters)
    return ok({"quality_feedbacks": rows}, meta={"total": total, "limit": limit, "offset": offset})


@frappe.whitelist()
def create_quality_feedback(data=None, **kwargs):
    """
    Submit a new Quality Feedback entry.

    Payload fields:
        template (str): Quality Feedback Template name.
        document_type (str, optional): Linked DocType (e.g. 'Customer').
        document_name (str, optional): Linked document ID.
        date (str, optional): Defaults to today.
        feedback (str, optional): General feedback notes.
        parameters (list[dict]): Rows with ``parameter``, ``rating``.
        company (str, optional): Company override.

    Returns:
        dict: Name of the created Quality Feedback.
    """
    require_auth()
    p = parse_payload(data, **kwargs)
    try:
        if not has_doctype("Quality Feedback"):
            return fail("Quality Feedback DocType not installed")

        doc = frappe.new_doc("Quality Feedback")
        doc.company = get_company(p.get("company"))
        doc.template = p.get("template")
        doc.document_type = p.get("document_type") or None
        doc.document_name = p.get("document_name") or None
        doc.date = p.get("date") or nowdate()
        doc.feedback = p.get("feedback") or None

        for row in (p.get("parameters") or []):
            if not isinstance(row, dict):
                continue
            doc.append("parameters", {
                "parameter": row.get("parameter"),
                "rating": row.get("rating"),
            })

        doc.insert(ignore_permissions=True)
        frappe.db.commit()
        return ok({"quality_feedback": {"id": doc.name}}, "Quality Feedback submitted")
    except Exception as e:
        return fail(str(e))