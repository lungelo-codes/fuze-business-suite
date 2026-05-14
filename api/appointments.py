"""
appointments.py  –  Appointments module API for the Fuze Business Suite.
Provides a sanitized list of calendar events (appointments) with controlled fields.
"""

import frappe
from ._saas_utils import require_auth, ok, page, has_doctype, pick_fields


@frappe.whitelist()
def get_appointments(from_date=None, to_date=None, status=None, limit=100, offset=0):
    """
    Return a paginated list of appointments/events scoped to the authenticated tenant.

    :param from_date: (optional) ISO date string for the start of the date range.
    :param to_date: (optional) ISO date string for the end of the date range.
    :param status: (optional) filter by event status (e.g. 'Open', 'Closed');
                   pass 'all' or omit to fetch all statuses.
    :param limit: (optional) maximum number of records to return (default: 100).
    :param offset: (optional) record offset for pagination.
    :return: dict with appointments list and meta information.
    """
    require_auth()
    # Normalise pagination params
    limit, offset = page(limit, offset)
    # Ensure Event DocType exists
    if not has_doctype("Event"):
        return ok({"appointments": []}, meta={"total": 0})

    # Build filters for the Frappe query
    filters = {}
    if from_date and to_date:
        filters["starts_on"] = ["between", [from_date, to_date]]
    elif from_date:
        filters["starts_on"] = [">=", from_date]
    elif to_date:
        filters["starts_on"] = ["<=", to_date]
    if status and status.lower() != "all":
        filters["status"] = status

    # Select only needed fields using pick_fields helper
    fields = pick_fields("Event", [
        "name", "subject", "starts_on", "ends_on", "event_type",
        "status", "all_day", "description", "owner", "modified",
    ])

    # Fetch the events
    rows = frappe.get_all(
        "Event",
        filters=filters,
        fields=fields,
        order_by="starts_on asc",
        limit_start=offset,
        limit_page_length=limit,
    )
    total = frappe.db.count("Event", filters)
    return ok({"appointments": rows}, meta={"total": total, "limit": limit, "offset": offset})