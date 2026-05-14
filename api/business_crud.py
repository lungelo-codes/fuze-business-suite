import json
import frappe
from frappe import _
from frappe.utils import cint

# Controlled Business Suite CRUD layer.
# Frontend must call this instead of /api/resource/*.

SYSTEM_FIELDS = {
    "doctype", "name", "owner", "creation", "modified", "modified_by", "idx",
    "docstatus", "parent", "parentfield", "parenttype", "_assign", "_comments",
    "_liked_by", "_user_tags"
}

ALLOWED_DOCTYPES = {
    # core masters
    "Company", "Customer", "Customer Group", "Territory", "Supplier", "Supplier Group",
    "Item", "Item Group", "UOM", "Contact", "Address", "Currency", "Mode of Payment",
    "Account", "Cost Center", "Department", "Designation", "Employee", "User",

    # CRM / sales
    "Lead", "Opportunity", "Quotation", "Sales Order", "Sales Invoice", "Delivery Note",
    "Payment Entry", "Campaign", "Contract", "CRM Lead", "CRM Deal", "CRM Note",
    "CRM Activity", "CRM Contact",

    # buying / stock
    "Material Request", "Request for Quotation", "Supplier Quotation", "Purchase Order",
    "Purchase Receipt", "Purchase Invoice", "Stock Entry", "Pricing Rule",

    # projects / support / communication
    "Project", "Task", "Timesheet", "Issue", "ToDo", "Communication", "Event",
    "HD Ticket", "HD Article", "HD Agent", "HD Team", "HD SLA",
    "HD Service Level Agreement", "HD Customer Portal Settings",

    # HR / payroll
    "Attendance", "Leave Application", "Leave Allocation", "Leave Type", "Salary Slip",
    "Salary Component", "Salary Structure", "Salary Structure Assignment", "Employee Onboarding",
    "Employee Transfer", "Employee Separation", "Exit Interview", "Employee Promotion",
    "Shift Assignment", "Shift Type", "Job Opening", "Job Applicant", "Job Offer",
    "Interview", "Expense Claim", "Travel Request", "Employee Advance", "Employee Loan",
    "Appraisal", "Appraisal Template", "Employee Performance Feedback", "Appraisal KRA",

    # accounting / reports / documents
    "Journal Entry", "Asset", "File", "Letter Head", "Print Format", "Notification Log", "Payment Proof",
    "Insights Query", "Insights Dashboard", "Insights Data Source", "Insights Chart",

    # Fuze SA compliance doctypes
    "Fuze Compliance Calendar", "Fuze Compliance Reminder", "Fuze VAT Return", "Fuze PAYE Return",
    "Fuze UIF Declaration", "Fuze SDL Declaration", "Fuze SARS Profile", "Fuze Company Compliance",
    "Fuze CIPC Annual Return", "Fuze Business Profile", "Fuze Audit Log",
    "SA Company Compliance", "SA VAT Return", "SA PAYE Return", "SA CIPC Return", "SA Compliance Task",

    # SaaS admin doctypes
    "Fuze SaaS Tenant", "Fuze SaaS Tenant Module", "Fuze SaaS Module", "Fuze SaaS Provisioning Job",
    "Fuze SaaS Demo Request",
}

LABEL_FIELDS = {
    "Customer": ["name", "customer_name"],
    "Supplier": ["name", "supplier_name"],
    "Item": ["name", "item_name", "item_code"],
    "Employee": ["name", "employee_name"],
    "Project": ["name", "project_name"],
    "Account": ["name", "account_name"],
    "Mode of Payment": ["name"],
    "Customer Group": ["name", "customer_group_name"],
    "Supplier Group": ["name", "supplier_group_name"],
    "Territory": ["name", "territory_name"],
    "Item Group": ["name", "item_group_name"],
    "UOM": ["name", "uom_name"],
    "Department": ["name", "department_name"],
    "Designation": ["name", "designation_name"],
    "Leave Type": ["name"],
    "Lead": ["name", "lead_name", "company_name"],
    "Company": ["name", "company_name"],
    "User": ["name", "full_name", "email"],
}

TREE_PARENTS = {
    "Customer Group": ("parent_customer_group", "All Customer Groups"),
    "Territory": ("parent_territory", "All Territories"),
    "Supplier Group": ("parent_supplier_group", "All Supplier Groups"),
    "Item Group": ("parent_item_group", "All Item Groups"),
}


def _require_auth():
    if frappe.session.user == "Guest":
        frappe.throw(_("Authentication required"), frappe.AuthenticationError)


def _parse(value, default=None):
    if value is None or value == "":
        return default
    if isinstance(value, (dict, list)):
        return value
    try:
        return json.loads(value)
    except Exception:
        return default


def _ok(data=None, message="Success", **meta):
    out = {"success": True, "message": message, "data": data if data is not None else {}}
    if meta:
        out["meta"] = meta
    return out


def _fail(message="Error"):
    return {"success": False, "message": message}


def _allowed(doctype):
    if not doctype or doctype not in ALLOWED_DOCTYPES:
        frappe.throw(_(f"Business Suite API does not allow direct access to {doctype}"), frappe.PermissionError)
    if not frappe.db.exists("DocType", doctype):
        frappe.throw(_(f"DocType {doctype} is not installed on this site"))


def _meta(doctype):
    return frappe.get_meta(doctype)


def _has_field(doctype, fieldname):
    try:
        return bool(_meta(doctype).get_field(fieldname)) or fieldname in {"name", "creation", "modified", "owner", "docstatus"}
    except Exception:
        return False


def _safe_fields(doctype, fields=None):
    requested = _parse(fields, fields) or ["name", "modified"]
    if isinstance(requested, str):
        requested = [requested]
    out = []
    for field in requested:
        field = str(field).strip()
        if field and _has_field(doctype, field) and field not in {"_assign", "_comments", "_liked_by"}:
            out.append(field)
    if "name" not in out:
        out.insert(0, "name")
    return list(dict.fromkeys(out))[:40]


def _safe_doc(doctype, values):
    values = _parse(values, {}) or {}
    doc = {}
    meta = _meta(doctype)
    table_fields = {df.fieldname for df in meta.fields if df.fieldtype in ("Table", "Table MultiSelect")}
    for key, value in values.items():
        if key in SYSTEM_FIELDS:
            continue
        df = meta.get_field(key)
        if not df or getattr(df, "read_only", 0) or getattr(df, "hidden", 0):
            continue
        if value == "":
            continue
        if key in table_fields and not isinstance(value, list):
            continue
        if df.fieldtype == "Check":
            doc[key] = 1 if value in (True, 1, "1", "true", "True", "on") else 0
        else:
            doc[key] = value
    return doc


def _default_company():
    company = frappe.defaults.get_user_default("Company") or frappe.db.get_single_value("Global Defaults", "default_company")
    if not company:
        rows = frappe.get_all("Company", pluck="name", limit=1)
        company = rows[0] if rows else None
    return company


def _apply_company_scope(doctype, filters):
    filters = _parse(filters, []) or []
    company = _default_company()
    if company and _has_field(doctype, "company"):
        # Avoid duplicate company filters from caller.
        if not any(isinstance(f, (list, tuple)) and len(f) >= 2 and f[0] == "company" for f in filters):
            filters.append(["company", "=", company])
    return filters


def _ensure_tree_defaults():
    # These are needed by simplified SaaS forms and prevent Customer creation from failing.
    defaults = [
        ("Customer Group", "All Customer Groups", {"customer_group_name": "All Customer Groups", "is_group": 1}),
        ("Territory", "All Territories", {"territory_name": "All Territories", "is_group": 1}),
        ("Supplier Group", "All Supplier Groups", {"supplier_group_name": "All Supplier Groups", "is_group": 1}),
        ("Item Group", "All Item Groups", {"item_group_name": "All Item Groups", "is_group": 1}),
        ("UOM", "Nos", {"uom_name": "Nos"}),
    ]
    for doctype, name, fields in defaults:
        try:
            if frappe.db.exists("DocType", doctype) and not frappe.db.exists(doctype, name):
                doc = frappe.get_doc({"doctype": doctype, **fields})
                if doctype in TREE_PARENTS:
                    parent_field, parent_name = TREE_PARENTS[doctype]
                    if name != parent_name and frappe.db.exists(doctype, parent_name):
                        doc.set(parent_field, parent_name)
                doc.insert(ignore_permissions=True, ignore_mandatory=True)
        except Exception:
            frappe.log_error(frappe.get_traceback(), "Business Suite default master setup failed")


def _prepare_defaults(doctype, doc):
    _ensure_tree_defaults()
    company = _default_company()
    if company and _has_field(doctype, "company") and not doc.get("company"):
        doc["company"] = company
    if doctype == "Customer":
        doc.setdefault("customer_type", "Company")
        doc.setdefault("customer_group", "All Customer Groups")
        doc.setdefault("territory", "All Territories")
    elif doctype == "Supplier":
        doc.setdefault("supplier_type", "Company")
        doc.setdefault("supplier_group", "All Supplier Groups")
        doc.setdefault("country", "South Africa")
    elif doctype == "Item":
        doc.setdefault("item_group", "All Item Groups")
        doc.setdefault("stock_uom", "Nos")
        doc.setdefault("is_stock_item", 0)
    elif doctype == "Lead":
        doc.setdefault("status", "Lead")
        if _has_field(doctype, "territory"):
            doc.setdefault("territory", "All Territories")
    elif doctype == "Territory":
        doc.setdefault("territory_name", doc.get("name") or doc.get("territory_name"))
        doc.setdefault("is_group", 0)
        if frappe.db.exists("Territory", "All Territories"):
            doc.setdefault("parent_territory", "All Territories")
    elif doctype == "Customer Group":
        doc.setdefault("customer_group_name", doc.get("name") or doc.get("customer_group_name"))
        doc.setdefault("is_group", 0)
        if frappe.db.exists("Customer Group", "All Customer Groups"):
            doc.setdefault("parent_customer_group", "All Customer Groups")
    elif doctype == "Supplier Group":
        doc.setdefault("supplier_group_name", doc.get("name") or doc.get("supplier_group_name"))
        doc.setdefault("is_group", 0)
        if frappe.db.exists("Supplier Group", "All Supplier Groups"):
            doc.setdefault("parent_supplier_group", "All Supplier Groups")
    elif doctype == "Item Group":
        doc.setdefault("item_group_name", doc.get("name") or doc.get("item_group_name"))
        doc.setdefault("is_group", 0)
        if frappe.db.exists("Item Group", "All Item Groups"):
            doc.setdefault("parent_item_group", "All Item Groups")
    return doc


@frappe.whitelist()
def list_doctype(doctype=None, fields=None, filters=None, limit=200, order_by="modified desc", module_id=None):
    _require_auth()
    _allowed(doctype)
    try:
        limit = min(max(cint(limit) or 50, 1), 500)
        safe_fields = _safe_fields(doctype, fields)
        safe_filters = _apply_company_scope(doctype, filters)
        rows = frappe.get_all(
            doctype,
            fields=safe_fields,
            filters=safe_filters,
            limit_page_length=limit,
            order_by=order_by or "modified desc",
            ignore_permissions=True,
        )
        return _ok(rows, fields=safe_fields, doctype=doctype, module_id=module_id)
    except Exception:
        frappe.log_error(frappe.get_traceback(), f"Business Suite list failed: {doctype}")
        return _ok([], fields=_safe_fields(doctype, fields), doctype=doctype, module_id=module_id)


@frappe.whitelist()
def get_doctype(doctype=None, name=None):
    _require_auth()
    _allowed(doctype)
    if not name:
        frappe.throw(_("Record name is required"))
    doc = frappe.get_doc(doctype, name)
    return _ok(doc.as_dict())


@frappe.whitelist()
def create_doctype(doctype=None, values=None, module_id=None):
    _require_auth()
    _allowed(doctype)
    doc_values = _prepare_defaults(doctype, _safe_doc(doctype, values))
    doc = frappe.get_doc({"doctype": doctype, **doc_values})
    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    return _ok(doc.as_dict(), doctype=doctype, module_id=module_id)


@frappe.whitelist()
def update_doctype(doctype=None, name=None, values=None, module_id=None):
    _require_auth()
    _allowed(doctype)
    if not name:
        frappe.throw(_("Record name is required"))
    doc = frappe.get_doc(doctype, name)
    doc.update(_safe_doc(doctype, values))
    doc.save(ignore_permissions=True)
    frappe.db.commit()
    return _ok(doc.as_dict(), doctype=doctype, module_id=module_id)


@frappe.whitelist()
def delete_doctype(doctype=None, name=None):
    _require_auth()
    _allowed(doctype)
    if not name:
        frappe.throw(_("Record name is required"))
    frappe.delete_doc(doctype, name, ignore_permissions=True)
    frappe.db.commit()
    return _ok({"deleted": True})


@frappe.whitelist()
def submit_or_cancel(doctype=None, name=None, action=None):
    _require_auth()
    _allowed(doctype)
    if action not in ("submit", "cancel"):
        frappe.throw(_("Unsupported action"))
    doc = frappe.get_doc(doctype, name)
    if action == "submit":
        doc.submit()
    else:
        doc.cancel()
    frappe.db.commit()
    return _ok(doc.as_dict())


@frappe.whitelist()
def get_options(doctype=None, query=None, limit=100):
    _require_auth()
    _allowed(doctype)
    fields = _safe_fields(doctype, LABEL_FIELDS.get(doctype) or ["name"])
    filters = []
    q = (query or "").strip()
    if q:
        # Use a broad LIKE on name; labels are still controlled below.
        filters.append(["name", "like", f"%{q}%"])
    rows = frappe.get_all(doctype, fields=fields, filters=filters, limit_page_length=min(cint(limit) or 100, 200), order_by="modified desc", ignore_permissions=True)
    data = []
    for row in rows:
        value = str(row.get("name") or "")
        label = " · ".join(str(row.get(f) or "") for f in fields if row.get(f)) or value
        if value:
            data.append({"value": value, "label": label})
    return _ok(data)


@frappe.whitelist()
def quick_create(doctype=None, label=None, values=None):
    _require_auth()
    _allowed(doctype)
    label = (label or "").strip()
    if not label:
        frappe.throw(_("Label is required"))
    if frappe.db.exists(doctype, label):
        return _ok({"value": label, "label": label, "name": label})

    payload = _parse(values, {}) or {}
    if doctype == "Customer":
        payload.update({"customer_name": label, "customer_type": "Company", "customer_group": "All Customer Groups", "territory": "All Territories"})
    elif doctype == "Supplier":
        payload.update({"supplier_name": label, "supplier_type": "Company", "supplier_group": "All Supplier Groups", "country": "South Africa"})
    elif doctype == "Customer Group":
        payload.update({"customer_group_name": label})
    elif doctype == "Territory":
        payload.update({"territory_name": label})
    elif doctype == "Supplier Group":
        payload.update({"supplier_group_name": label})
    elif doctype == "Item Group":
        payload.update({"item_group_name": label})
    elif doctype == "UOM":
        payload.update({"uom_name": label})
    elif doctype == "Department":
        payload.update({"department_name": label})
    elif doctype == "Designation":
        payload.update({"designation_name": label})
    elif doctype == "Item":
        payload.update({"item_code": label, "item_name": label, "item_group": "All Item Groups", "stock_uom": "Nos", "is_stock_item": 0})
    elif doctype == "Lead":
        payload.update({"lead_name": label, "status": "Lead"})
    elif doctype == "Project":
        payload.update({"project_name": label, "status": "Open"})
    elif doctype == "Company":
        abbr = "".join([part[0] for part in label.split() if part])[:5].upper() or label[:3].upper()
        payload.update({"company_name": label, "abbr": abbr, "default_currency": "ZAR"})
    else:
        # Try common naming fields.
        meta = _meta(doctype)
        fieldnames = {df.fieldname for df in meta.fields}
        for candidate in (f"{doctype.lower().replace(' ', '_')}_name", "title", "subject"):
            if candidate in fieldnames:
                payload[candidate] = label
                break
        else:
            payload["name"] = label

    return create_doctype(doctype=doctype, values=payload)
