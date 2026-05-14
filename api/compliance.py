"""
compliance.py  –  South African Compliance module for the Fuze Business Suite.
Covers VAT, PAYE, UIF, SDL, CIPC, and the general compliance calendar.
Uses 'Fuze' prefixed DocTypes (from business_crud.py ALLOWED_DOCTYPES).
Falls back gracefully when custom DocTypes are not yet installed.
"""

import frappe
from frappe import _
from frappe.utils import nowdate, getdate, add_days, flt, cint
from ._saas_utils import (
    require_auth, ok, fail, get_company, get_currency,
    page, parse_payload, has_doctype, money,
)

# DocType names used in this module  (matches ALLOWED_DOCTYPES in business_crud.py)
_DT_SARS_PROFILE = "Fuze SARS Profile"
_DT_VAT = "Fuze VAT Return"
_DT_PAYE = "Fuze PAYE Return"
_DT_UIF = "Fuze UIF Declaration"
_DT_SDL = "Fuze SDL Declaration"
_DT_CIPC = "Fuze CIPC Annual Return"
_DT_COMPANY_COMPLIANCE = "Fuze Company Compliance"
_DT_CALENDAR = "Fuze Compliance Calendar"
_DT_REMINDER = "Fuze Compliance Reminder"
_DT_AUDIT_LOG = "Fuze Audit Log"

# Legacy / alternative DocType names
_LEGACY_VAT = "SA VAT Return"
_LEGACY_CIPC = "SA CIPC Return"
_LEGACY_PAYE = "SA PAYE Return"
_LEGACY_TASK = "SA Compliance Task"


def _vat_dt():
    return _DT_VAT if has_doctype(_DT_VAT) else (_LEGACY_VAT if has_doctype(_LEGACY_VAT) else None)


def _paye_dt():
    return _DT_PAYE if has_doctype(_DT_PAYE) else (_LEGACY_PAYE if has_doctype(_LEGACY_PAYE) else None)


def _cipc_dt():
    return _DT_CIPC if has_doctype(_DT_CIPC) else (_LEGACY_CIPC if has_doctype(_LEGACY_CIPC) else None)


def _calendar_dt():
    return _DT_CALENDAR if has_doctype(_DT_CALENDAR) else (_LEGACY_TASK if has_doctype(_LEGACY_TASK) else None)


def _installed_modules() -> dict:
    return {
        "sars_profile": has_doctype(_DT_SARS_PROFILE),
        "vat": _vat_dt() is not None,
        "paye": _paye_dt() is not None,
        "uif": has_doctype(_DT_UIF),
        "sdl": has_doctype(_DT_SDL),
        "cipc": _cipc_dt() is not None,
        "company_compliance": has_doctype(_DT_COMPANY_COMPLIANCE),
        "calendar": _calendar_dt() is not None,
        "reminder": has_doctype(_DT_REMINDER),
        "audit_log": has_doctype(_DT_AUDIT_LOG),
    }


# ─── Dashboard ───────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_dashboard(company=None):
    require_auth()
    company = get_company(company)
    currency = get_currency(company)
    today = nowdate()
    installed = _installed_modules()

    # VAT
    vat_due = 0
    vat_overdue = 0
    vat_dt = _vat_dt()
    if vat_dt:
        vat_due = frappe.db.count(vat_dt, {"company": company, "status": ["in", ["Draft", "Ready"]]})
        vat_overdue = frappe.db.count(vat_dt, {
            "company": company, "due_date": ["<", today],
            "status": ["not in", ["Submitted", "Paid"]],
        }) if "due_date" in _get_fields(vat_dt) else 0

    # PAYE
    paye_due = 0
    paye_dt = _paye_dt()
    if paye_dt:
        paye_due = frappe.db.count(paye_dt, {"company": company, "status": ["in", ["Draft", "Ready"]]})

    # CIPC
    cipc_due = 0
    cipc_dt = _cipc_dt()
    if cipc_dt:
        cipc_due = frappe.db.count(cipc_dt, {"company": company, "status": ["in", ["Due", "Overdue"]]})

    # Upcoming deadlines from calendar / tasks
    upcoming = []
    cal_dt = _calendar_dt()
    if cal_dt:
        cal_fields = _get_fields(cal_dt)
        wanted = [f for f in ["name", "title", "task_type", "due_date", "status", "priority"] if f in cal_fields]
        if not wanted:
            wanted = ["name"]
        upcoming = frappe.get_all(
            cal_dt,
            filters={"company": company, "status": ["not in", ["Completed", "Submitted", "Paid"]]},
            fields=wanted,
            order_by="due_date asc",
            limit_page_length=10,
        )

    return ok({
        "company": company,
        "currency": currency,
        "cards": {
            "vat_returns_due": vat_due,
            "vat_overdue": vat_overdue,
            "paye_due": paye_due,
            "cipc_due": cipc_due,
            "upcoming_deadlines": len(upcoming),
        },
        "upcoming": upcoming,
        "installed": installed,
    }, "Compliance dashboard loaded")


def _get_fields(doctype: str) -> set:
    try:
        meta = frappe.get_meta(doctype)
        fields = {df.fieldname for df in meta.fields}
        fields.update({"name", "creation", "modified", "owner", "docstatus"})
        return fields
    except Exception:
        return {"name"}


# ─── SARS Profile ────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_sars_profile(company=None):
    require_auth()
    company = get_company(company)

    if not has_doctype(_DT_SARS_PROFILE):
        return ok({"exists": False, "company": company,
                   "message": f"{_DT_SARS_PROFILE} DocType not installed"})

    name = frappe.db.get_value(_DT_SARS_PROFILE, {"company": company}, "name")
    if not name:
        return ok({"exists": False, "company": company})

    doc = frappe.get_doc(_DT_SARS_PROFILE, name)
    return ok({"exists": True, "profile": doc.as_dict()})


@frappe.whitelist()
def save_sars_profile(data=None, **kwargs):
    require_auth()
    p = parse_payload(data, **kwargs)
    company = get_company(p.get("company"))

    if not has_doctype(_DT_SARS_PROFILE):
        return fail(f"{_DT_SARS_PROFILE} DocType not installed. Run setup script first.")

    name = frappe.db.get_value(_DT_SARS_PROFILE, {"company": company}, "name")
    doc = frappe.get_doc(_DT_SARS_PROFILE, name) if name else frappe.new_doc(_DT_SARS_PROFILE)
    doc.company = company

    settable_fields = [
        "vat_number", "paye_number", "uif_number", "sdl_number",
        "tax_number", "trading_name", "registered_name",
        "efiling_username", "vat_period", "vat_category",
        "bee_level", "compliance_status", "notes",
    ]
    fields = _get_fields(_DT_SARS_PROFILE)
    for f in settable_fields:
        if f in fields and f in p:
            doc.set(f, p.get(f))

    doc.save(ignore_permissions=True)
    frappe.db.commit()
    return ok({"profile": doc.as_dict()}, "SARS profile saved")


# ─── VAT Returns ─────────────────────────────────────────────────────────────

@frappe.whitelist()
def list_vat_returns(company=None, status=None, limit=50, offset=0):
    require_auth()
    limit, offset = page(limit, offset)
    vat_dt = _vat_dt()
    if not vat_dt:
        return ok({"vat_returns": [], "currency": get_currency(company)}, meta={"total": 0})

    filters = {"company": get_company(company)}
    if status and status != "all":
        filters["status"] = status

    fields_wanted = [
        "name", "company", "from_date", "to_date", "due_date",
        "status", "period_start", "period_end",
        "total_sales", "output_vat", "sales_count",
        "total_purchases", "input_vat", "purchases_count",
        "net_vat", "vat_payable", "vat_refundable",
        "efiling_reference", "payment_reference", "submission_date", "modified",
    ]
    fields = [f for f in fields_wanted if f in _get_fields(vat_dt)]
    if "name" not in fields:
        fields.insert(0, "name")

    rows = frappe.get_all(
        vat_dt,
        filters=filters,
        fields=fields,
        order_by="modified desc",
        limit_start=offset,
        limit_page_length=limit,
    )

    total = frappe.db.count(vat_dt, filters)
    return ok(
        {"vat_returns": rows, "currency": get_currency(company)},
        meta={"total": total, "limit": limit, "offset": offset},
    )


@frappe.whitelist()
def create_vat_return(data=None, **kwargs):
    require_auth()
    p = parse_payload(data, **kwargs)
    vat_dt = _vat_dt()
    if not vat_dt:
        return fail("VAT Return DocType not installed. Install the Fuze Compliance module.")

    doc = frappe.new_doc(vat_dt)
    doc.company = get_company(p.get("company"))

    settable = _get_fields(vat_dt)
    for f in ["from_date", "to_date", "period_start", "period_end", "due_date",
              "status", "output_vat", "input_vat", "net_vat",
              "total_sales", "total_purchases", "efiling_reference", "notes"]:
        if f in settable and f in p:
            doc.set(f, p.get(f))

    # Auto-calculate net VAT if not provided
    output = flt(doc.get("output_vat") or 0)
    input_vat = flt(doc.get("input_vat") or 0)
    if "net_vat" in settable and not doc.get("net_vat"):
        doc.net_vat = output - input_vat
    if "vat_payable" in settable and output > input_vat:
        doc.vat_payable = output - input_vat
    if "vat_refundable" in settable and input_vat > output:
        doc.vat_refundable = input_vat - output

    doc.status = doc.get("status") or "Draft"
    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    return ok({"vat_return": doc.as_dict()}, "VAT return created")


# ─── PAYE Returns ─────────────────────────────────────────────────────────────

@frappe.whitelist()
def list_paye_returns(company=None, status=None, limit=50, offset=0):
    require_auth()
    limit, offset = page(limit, offset)
    paye_dt = _paye_dt()
    if not paye_dt:
        return ok({"paye_returns": []}, meta={"total": 0})

    filters = {"company": get_company(company)}
    if status and status != "all":
        filters["status"] = status

    fields_wanted = [
        "name", "company", "period_start", "period_end", "due_date",
        "status", "total_employees", "total_paye", "total_uif",
        "total_sdl", "total_amount", "emp201_reference", "modified",
    ]
    fields = [f for f in fields_wanted if f in _get_fields(paye_dt)]
    if "name" not in fields:
        fields.insert(0, "name")

    rows = frappe.get_all(
        paye_dt,
        filters=filters,
        fields=fields,
        order_by="modified desc",
        limit_start=offset,
        limit_page_length=limit,
    )

    return ok(
        {"paye_returns": rows, "currency": get_currency(company)},
        meta={"total": frappe.db.count(paye_dt, filters)},
    )


# ─── CIPC Annual Returns ──────────────────────────────────────────────────────

@frappe.whitelist()
def list_cipc_returns(company=None, status=None, limit=50, offset=0):
    require_auth()
    limit, offset = page(limit, offset)
    cipc_dt = _cipc_dt()
    if not cipc_dt:
        return ok({"cipc_returns": []}, meta={"total": 0})

    filters = {"company": get_company(company)}
    if status and status != "all":
        filters["status"] = status

    fields_wanted = [
        "name", "company", "registration_number",
        "annual_return_due_date", "last_return_date",
        "status", "amount_due", "payment_reference", "notes", "modified",
    ]
    fields = [f for f in fields_wanted if f in _get_fields(cipc_dt)]
    if "name" not in fields:
        fields.insert(0, "name")

    rows = frappe.get_all(
        cipc_dt,
        filters=filters,
        fields=fields,
        order_by="modified desc",
        limit_start=offset,
        limit_page_length=limit,
    )

    return ok(
        {"cipc_returns": rows, "currency": get_currency(company)},
        meta={"total": frappe.db.count(cipc_dt, filters)},
    )


@frappe.whitelist()
def save_cipc_return(data=None, **kwargs):
    require_auth()
    p = parse_payload(data, **kwargs)
    cipc_dt = _cipc_dt()
    if not cipc_dt:
        return fail("CIPC DocType not installed")

    name = p.get("name")
    doc = frappe.get_doc(cipc_dt, name) if name else frappe.new_doc(cipc_dt)
    doc.company = get_company(p.get("company"))

    settable = _get_fields(cipc_dt)
    for f in ["registration_number", "annual_return_due_date", "last_return_date",
              "status", "amount_due", "payment_reference", "notes"]:
        if f in settable and f in p:
            doc.set(f, p.get(f))

    doc.save(ignore_permissions=True)
    frappe.db.commit()
    return ok({"cipc_return": doc.as_dict()}, "CIPC return saved")


# ─── Compliance Calendar / Tasks ──────────────────────────────────────────────

@frappe.whitelist()
def list_tasks(company=None, status=None, task_type=None, limit=50, offset=0):
    require_auth()
    limit, offset = page(limit, offset)
    cal_dt = _calendar_dt()
    if not cal_dt:
        return ok({"tasks": []}, meta={"total": 0})

    filters = {"company": get_company(company)}
    if status and status != "all":
        filters["status"] = status
    if task_type and task_type != "all":
        flds = _get_fields(cal_dt)
        if "task_type" in flds:
            filters["task_type"] = task_type

    fields_wanted = [
        "name", "title", "task_type", "due_date", "status",
        "priority", "assigned_to", "reference_doctype", "reference_name",
        "notes", "modified",
    ]
    fields = [f for f in fields_wanted if f in _get_fields(cal_dt)]
    if "name" not in fields:
        fields.insert(0, "name")

    rows = frappe.get_all(
        cal_dt,
        filters=filters,
        fields=fields,
        order_by="due_date asc",
        limit_start=offset,
        limit_page_length=limit,
    )

    total = frappe.db.count(cal_dt, filters)
    return ok({"tasks": rows}, meta={"total": total, "limit": limit, "offset": offset})


@frappe.whitelist()
def create_task(data=None, **kwargs):
    require_auth()
    p = parse_payload(data, **kwargs)
    cal_dt = _calendar_dt()
    if not cal_dt:
        return fail("Compliance Calendar DocType not installed")

    doc = frappe.new_doc(cal_dt)
    doc.company = get_company(p.get("company"))

    settable = _get_fields(cal_dt)
    for f in ["title", "task_type", "due_date", "status", "priority",
              "assigned_to", "notes", "reference_doctype", "reference_name"]:
        if f in settable and f in p:
            doc.set(f, p.get(f))

    if "status" in settable and not doc.get("status"):
        doc.status = "Open"
    if "priority" in settable and not doc.get("priority"):
        doc.priority = "Medium"

    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    return ok({"task": doc.as_dict()}, "Compliance task created")


# ─── Compliance Reminders ─────────────────────────────────────────────────────

@frappe.whitelist()
def list_reminders(company=None, limit=50, offset=0):
    require_auth()
    limit, offset = page(limit, offset)
    if not has_doctype(_DT_REMINDER):
        return ok({"reminders": []}, meta={"total": 0})

    filters = {"company": get_company(company)}
    fields = [f for f in ["name", "title", "reminder_type", "reminder_date",
                           "status", "notes", "modified"]
              if f in _get_fields(_DT_REMINDER)]

    rows = frappe.get_all(
        _DT_REMINDER,
        filters=filters,
        fields=fields or ["name"],
        order_by="reminder_date asc",
        limit_start=offset,
        limit_page_length=limit,
    )

    return ok({"reminders": rows}, meta={"total": frappe.db.count(_DT_REMINDER, filters)})


# ─── Company Compliance ───────────────────────────────────────────────────────

@frappe.whitelist()
def get_company_compliance(company=None):
    require_auth()
    company = get_company(company)

    if not has_doctype(_DT_COMPANY_COMPLIANCE):
        return ok({"exists": False, "company": company})

    name = frappe.db.get_value(_DT_COMPANY_COMPLIANCE, {"company": company}, "name")
    if not name:
        return ok({"exists": False, "company": company})

    doc = frappe.get_doc(_DT_COMPANY_COMPLIANCE, name)
    return ok({"exists": True, "compliance": doc.as_dict()})


# ─── Audit Log ────────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_audit_log(limit=100, offset=0):
    require_auth()
    limit, offset = page(limit, offset)

    if not has_doctype(_DT_AUDIT_LOG):
        return ok({"logs": []}, meta={"total": 0})

    fields_wanted = [
        "name", "user", "action", "timestamp", "modified",
        "reference_doctype", "reference_name", "ip_address", "details",
    ]
    fields = [f for f in fields_wanted if f in _get_fields(_DT_AUDIT_LOG)]
    if "name" not in fields:
        fields.insert(0, "name")

    rows = frappe.get_all(
        _DT_AUDIT_LOG,
        fields=fields,
        order_by="timestamp desc" if "timestamp" in _get_fields(_DT_AUDIT_LOG) else "modified desc",
        limit_start=offset,
        limit_page_length=limit,
    )

    return ok({"logs": rows}, meta={"total": frappe.db.count(_DT_AUDIT_LOG)})