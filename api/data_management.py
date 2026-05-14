"""
data_management.py  –  Data Management module API for the Fuze Business Suite.
Covers Data Import, Data Export, Bulk Update, Bulk Rename, and Personal Data
(download / deletion) as documented in ERPNext Data Management.

ERPNext Data Management workflow:
    Import: Upload CSV/XLSX → Create Data Import → Run Import → Review Logs
    Export: Choose DocType + filters → Download CSV/XLSX
    Bulk Ops: Bulk Update field values | Bulk Rename documents
    Personal Data: Download user data (GDPR) | Request anonymisation / deletion
"""

import frappe
from frappe.utils import nowdate, now_datetime
from ._saas_utils import (
    require_auth, ok, fail, get_company,
    page, parse_payload, has_doctype, pick_fields,
    safe_count,
)


# ─── Dashboard ────────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_dashboard():
    """
    Return a summary of recent Data Management activity.

    Returns:
        dict: Dashboard card data for import / export / deletion queues.
    """
    require_auth()

    pending_imports = safe_count("Data Import", {"status": ["in", ["Pending", "In Progress"]]}) \
        if has_doctype("Data Import") else 0
    failed_imports = safe_count("Data Import", {"status": "Error"}) \
        if has_doctype("Data Import") else 0
    completed_imports = safe_count("Data Import", {"status": "Success"}) \
        if has_doctype("Data Import") else 0
    pending_deletions = safe_count("Personal Data Deletion Request", {"status": "Pending"}) \
        if has_doctype("Personal Data Deletion Request") else 0

    return ok({
        "cards": {
            "pending_imports": pending_imports,
            "failed_imports": failed_imports,
            "completed_imports": completed_imports,
            "pending_personal_data_deletions": pending_deletions,
        },
        "period": {"today": nowdate()},
    })


# ─── Data Import ──────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_data_imports(status=None, reference_doctype=None, limit=50, offset=0):
    """
    List Data Import jobs. Each job represents a CSV/XLSX file
    imported into a specific DocType.

    Args:
        status (str, optional): Pending / In Progress / Success / Partial /
                                Error / Cancelled.
        reference_doctype (str, optional): Filter by target DocType,
                                           e.g. "Customer", "Item".
        limit (int): Page size.
        offset (int): Page offset.

    Returns:
        dict: Paginated list of Data Import records.
    """
    require_auth()
    limit, offset = page(limit, offset)

    if not has_doctype("Data Import"):
        return ok({"data_imports": []}, meta={"total": 0})

    filters = {}
    if status and status != "all":
        filters["status"] = status
    if reference_doctype:
        filters["reference_doctype"] = reference_doctype

    fields = pick_fields("Data Import", [
        "name", "reference_doctype", "import_type",
        "status", "percent_complete", "payload_count",
        "success_count", "failure_count", "creation",
    ])

    rows = frappe.get_all(
        "Data Import",
        filters=filters,
        fields=fields,
        order_by="creation desc",
        limit_start=offset,
        limit_page_length=limit,
    )
    total = frappe.db.count("Data Import", filters)
    return ok(
        {"data_imports": rows},
        meta={"total": total, "limit": limit, "offset": offset},
    )


@frappe.whitelist()
def get_data_import(name):
    """
    Fetch a single Data Import record including its import log.

    Args:
        name (str): Data Import ID.

    Returns:
        dict: Full Data Import document with logs.
    """
    require_auth()
    if not has_doctype("Data Import"):
        return fail("Data Import DocType not installed")
    doc = frappe.get_doc("Data Import", name)
    return ok({"data_import": doc.as_dict()})


@frappe.whitelist()
def create_data_import(data=None, **kwargs):
    """
    Create a Data Import job. After creation, trigger it with
    start_data_import(). Mirrors ERPNext's Data Import tool.

    Payload fields:
        reference_doctype (str): Target DocType to import into (required).
        import_type (str): "Insert New Records" or "Update Existing Records"
                           (default: "Insert New Records").
        file (str): Path or URL of the uploaded template file (required).
                    The file should be a Frappe-format CSV or XLSX export.
        submit_after_import (int, optional): 1 to auto-submit imported docs.
        mute_emails (int, optional): 1 to suppress notification emails.

    Returns:
        dict: Name of the created Data Import job.
    """
    require_auth()
    p = parse_payload(data, **kwargs)
    try:
        if not has_doctype("Data Import"):
            return fail("Data Import DocType not installed")
        if not p.get("reference_doctype"):
            return fail("reference_doctype is required")
        if not p.get("file"):
            return fail("file path/URL is required")

        doc = frappe.new_doc("Data Import")
        doc.reference_doctype = p["reference_doctype"]
        doc.import_type = p.get("import_type") or "Insert New Records"
        doc.submit_after_import = int(p.get("submit_after_import") or 0)
        doc.mute_emails = int(p.get("mute_emails") or 1)
        doc.import_file = p["file"]

        doc.insert(ignore_permissions=True)
        frappe.db.commit()
        return ok({"data_import": {"id": doc.name}}, "Data Import job created")
    except Exception as e:
        return fail(str(e))


@frappe.whitelist()
def start_data_import(name):
    """
    Trigger an existing Data Import job to begin processing.
    The import runs asynchronously in the background queue.

    Args:
        name (str): Data Import ID.

    Returns:
        dict: Confirmation that the job has been queued.
    """
    require_auth()
    try:
        if not has_doctype("Data Import"):
            return fail("Data Import DocType not installed")
        doc = frappe.get_doc("Data Import", name)
        if doc.status not in ("Pending", "Error", "Partial"):
            return fail(f"Data Import '{name}' cannot be started from status '{doc.status}'")
        doc.start_import()
        return ok(
            {"data_import": {"id": doc.name, "status": "In Progress"}},
            "Data Import queued for processing",
        )
    except Exception as e:
        return fail(str(e))


@frappe.whitelist()
def get_import_template(doctype, company=None):
    """
    Return the list of importable fields for a given DocType so the
    caller can generate a correctly formatted CSV/XLSX template.

    Args:
        doctype (str): Target DocType name.
        company (str, optional): Company context (used for some templates).

    Returns:
        dict: List of field labels, field names, types, and mandatory flags.
    """
    require_auth()
    try:
        meta = frappe.get_meta(doctype)
        fields = []
        for df in meta.fields:
            if df.fieldtype in ("Section Break", "Column Break", "HTML", "Button", "Fold"):
                continue
            fields.append({
                "label": df.label,
                "fieldname": df.fieldname,
                "fieldtype": df.fieldtype,
                "mandatory": int(bool(df.reqd)),
                "options": df.options if df.fieldtype in ("Link", "Select") else None,
            })
        return ok({"doctype": doctype, "fields": fields})
    except Exception as e:
        return fail(str(e))


# ─── Data Export ──────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_data_export_config(doctype, company=None, filters=None, limit=None):
    """
    Return configuration needed to export data for a DocType.
    This endpoint describes what would be exported; the actual binary
    file download is handled by Frappe's built-in /api/method/frappe.utils.
    data_management.export_data endpoint with these parameters.

    Args:
        doctype (str): DocType to export (required).
        company (str, optional): Company filter applied to the export.
        filters (dict, optional): Additional filter dict.
        limit (int, optional): Max number of records to export.

    Returns:
        dict: Export configuration with record count estimate.
    """
    require_auth()
    try:
        effective_filters = {}
        if company and frappe.get_meta(doctype).has_field("company"):
            effective_filters["company"] = get_company(company)
        if isinstance(filters, dict):
            effective_filters.update(filters)

        count = frappe.db.count(doctype, effective_filters)
        return ok({
            "doctype": doctype,
            "filters": effective_filters,
            "estimated_records": count,
            "download_url": (
                f"/api/method/frappe.utils.file_lock.lock?"
                f"doctype={doctype}"
            ),
            "note": (
                "Use Frappe's built-in /api/method/frappe.desk.reportview.export_query "
                "with these filters to trigger the actual file download."
            ),
        })
    except Exception as e:
        return fail(str(e))


# ─── Bulk Update ──────────────────────────────────────────────────────────────

@frappe.whitelist()
def bulk_update(data=None, **kwargs):
    """
    Update a specific field across multiple documents of the same DocType.
    Mirrors ERPNext's 'Bulk Update' tool.

    Payload fields:
        doctype (str): Target DocType (required).
        field (str): Field name to update (required).
        value (any): New value to set for that field (required).
        filters (dict, optional): Frappe filter dict to select target documents.
            e.g. {"status": "Open", "company": "Acme Corp"}
        limit (int, optional): Safety cap on number of documents to update.
            Defaults to 500.

    Returns:
        dict: Count of documents updated.
    """
    require_auth()
    p = parse_payload(data, **kwargs)
    try:
        for required in ("doctype", "field", "value"):
            if p.get(required) is None:
                return fail(f"{required} is required")

        doctype = p["doctype"]
        field = p["field"]
        value = p["value"]
        filters = p.get("filters") or {}
        cap = min(int(p.get("limit") or 500), 2000)

        meta = frappe.get_meta(doctype)
        if not meta.has_field(field):
            return fail(f"Field '{field}' does not exist on {doctype}")

        names = frappe.get_all(doctype, filters=filters,
                               pluck="name", limit_page_length=cap)
        if not names:
            return ok({"updated_count": 0}, "No matching documents found")

        updated = 0
        for name in names:
            try:
                doc = frappe.get_doc(doctype, name)
                setattr(doc, field, value)
                doc.save(ignore_permissions=True)
                updated += 1
            except Exception:
                pass  # continue with remaining documents

        frappe.db.commit()
        return ok(
            {"updated_count": updated, "total_matched": len(names)},
            f"{updated} document(s) updated",
        )
    except Exception as e:
        return fail(str(e))


# ─── Bulk Rename ──────────────────────────────────────────────────────────────

@frappe.whitelist()
def bulk_rename(data=None, **kwargs):
    """
    Rename multiple documents in one request.
    Mirrors ERPNext's 'Bulk Rename' tool. Each rename updates all
    linked references (child tables, Link fields) automatically.

    Payload fields:
        doctype (str): Target DocType (required).
        renames (list[dict]): List of rename pairs (required). Each dict:
            - old_name (str): Current document name.
            - new_name (str): Desired new document name.
        merge (int, optional): 1 to merge if the new name already exists
                               (default 0 – raises error on conflict).

    Returns:
        dict: Per-document rename results.
    """
    require_auth()
    p = parse_payload(data, **kwargs)
    try:
        if not p.get("doctype"):
            return fail("doctype is required")
        if not p.get("renames"):
            return fail("renames list is required")

        doctype = p["doctype"]
        merge = bool(int(p.get("merge") or 0))
        results = []

        for pair in p["renames"]:
            old_name = pair.get("old_name")
            new_name = pair.get("new_name")
            if not old_name or not new_name:
                results.append({"old_name": old_name, "new_name": new_name,
                                 "status": "error", "message": "Both old_name and new_name required"})
                continue
            try:
                frappe.rename_doc(doctype, old_name, new_name,
                                  merge=merge, ignore_permissions=True)
                results.append({"old_name": old_name, "new_name": new_name, "status": "success"})
            except Exception as ex:
                results.append({"old_name": old_name, "new_name": new_name,
                                 "status": "error", "message": str(ex)})

        frappe.db.commit()
        success_count = sum(1 for r in results if r["status"] == "success")
        return ok(
            {"results": results, "success_count": success_count},
            f"{success_count} of {len(results)} document(s) renamed",
        )
    except Exception as e:
        return fail(str(e))


# ─── Personal Data (GDPR) ─────────────────────────────────────────────────────

@frappe.whitelist()
def request_personal_data_download(user=None):
    """
    Request a download of all personal data held for a user.
    Mirrors the ERPNext 'Personal Data Download' feature (GDPR Article 20).
    The download is generated asynchronously; poll get_personal_data_download_status.

    Args:
        user (str, optional): User email. Defaults to the logged-in user.

    Returns:
        dict: Name of the Personal Data Download Request created.
    """
    require_auth()
    try:
        target_user = user or frappe.session.user
        if not has_doctype("Personal Data Download Request"):
            # Fall back to Frappe's built-in function
            from frappe.personal_data_deletion.doctype.personal_data_deletion_request\
                .personal_data_deletion_request import (
                handle_data_download_request,
            )
            handle_data_download_request(target_user)
            return ok({"message": "Download request submitted"}, "Personal data download queued")

        doc = frappe.new_doc("Personal Data Download Request")
        doc.user = target_user
        doc.insert(ignore_permissions=True)
        frappe.db.commit()
        return ok({"request": {"id": doc.name}}, "Personal data download request created")
    except Exception as e:
        return fail(str(e))


@frappe.whitelist()
def get_personal_data_deletion_requests(status=None, limit=50, offset=0):
    """
    List Personal Data Deletion Requests (GDPR Right to Erasure).

    Args:
        status (str, optional): Pending / Approved / Deleted / Rejected.
        limit (int): Page size.
        offset (int): Page offset.

    Returns:
        dict: Paginated list of deletion requests.
    """
    require_auth()
    limit, offset = page(limit, offset)

    if not has_doctype("Personal Data Deletion Request"):
        return ok({"deletion_requests": []}, meta={"total": 0})

    filters = {}
    if status and status != "all":
        filters["status"] = status

    rows = frappe.get_all(
        "Personal Data Deletion Request",
        filters=filters,
        fields=["name", "user", "status", "creation", "modified"],
        order_by="creation desc",
        limit_start=offset,
        limit_page_length=limit,
    )
    total = frappe.db.count("Personal Data Deletion Request", filters)
    return ok(
        {"deletion_requests": rows},
        meta={"total": total, "limit": limit, "offset": offset},
    )


@frappe.whitelist()
def create_personal_data_deletion_request(user=None):
    """
    Raise a Personal Data Deletion Request for a user.
    Mirrors ERPNext's 'Personal Data Deletion' feature (GDPR Article 17).
    An Administrator must approve the request before data is erased.

    Args:
        user (str, optional): User email. Defaults to the logged-in user.

    Returns:
        dict: Name of the deletion request created.
    """
    require_auth()
    try:
        target_user = user or frappe.session.user
        if not has_doctype("Personal Data Deletion Request"):
            return fail("Personal Data Deletion Request DocType not installed")

        existing = frappe.db.get_value(
            "Personal Data Deletion Request",
            {"user": target_user, "status": ["in", ["Pending", "Approved"]]},
            "name",
        )
        if existing:
            return fail(f"An active deletion request already exists: {existing}")

        doc = frappe.new_doc("Personal Data Deletion Request")
        doc.user = target_user
        doc.insert(ignore_permissions=True)
        frappe.db.commit()
        return ok(
            {"deletion_request": {"id": doc.name}},
            "Personal data deletion request submitted",
        )
    except Exception as e:
        return fail(str(e))


@frappe.whitelist()
def approve_personal_data_deletion(name):
    """
    Approve a pending Personal Data Deletion Request.
    Only Administrators should call this endpoint.
    Frappe will anonymise the user's data upon approval.

    Args:
        name (str): Personal Data Deletion Request ID.

    Returns:
        dict: Updated request status.
    """
    require_auth()
    try:
        if not has_doctype("Personal Data Deletion Request"):
            return fail("Personal Data Deletion Request DocType not installed")
        doc = frappe.get_doc("Personal Data Deletion Request", name)
        if doc.status != "Pending":
            return fail(f"Request {name} is not in Pending status")
        doc.status = "Approved"
        doc.save(ignore_permissions=True)
        frappe.db.commit()
        return ok(
            {"deletion_request": {"id": doc.name, "status": "Approved"}},
            "Deletion request approved",
        )
    except Exception as e:
        return fail(str(e))


# ─── Delete Company Transactions ──────────────────────────────────────────────

@frappe.whitelist()
def delete_company_transactions(company=None):
    """
    Delete all transactions for a company (leaves masters intact).
    Mirrors ERPNext's 'Delete Company Transactions' feature.
    USE WITH EXTREME CAUTION – this is irreversible.

    Args:
        company (str): Company name (required).

    Returns:
        dict: Confirmation that the deletion job has been queued.
    """
    require_auth()
    try:
        company = get_company(company)
        from erpnext.setup.doctype.company.delete_company_transactions import (
            delete_company_transactions as _delete,
        )
        _delete(company)
        frappe.db.commit()
        return ok(
            {"company": company},
            f"All transactions for '{company}' have been deleted",
        )
    except Exception as e:
        return fail(str(e))