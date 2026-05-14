"""
settings.py  –  SaaS Settings API for the Fuze Business Suite.

Exposes endpoints to view and update tenant specific configuration such as
company details and branding. These settings allow SaaS users to modify their
own Company record (name, address, logo, letter head) without requiring
administrative access to the underlying ERPNext instance. All endpoints
enforce authentication and scope changes to the current tenant's company.
"""

import frappe
from ._saas_utils import require_auth, ok, fail, get_company, parse_payload


@frappe.whitelist()
def get_settings(company=None):
    """
    Retrieve the current company's configuration. Returns basic fields such
    as company_name, abbr, default letter head and logo. This endpoint is
    useful for populating the Settings page of the SaaS portal.

    Args:
        company (str, optional): Explicit company name. If omitted, uses
            the logged in user's default company.

    Returns:
        dict: Success response containing the company data.
    """
    require_auth()
    name = get_company(company)
    try:
        doc = frappe.get_doc("Company", name)
        data = {
            "name": doc.name,
            "company_name": doc.company_name,
            "abbr": doc.abbr,
            "default_currency": doc.default_currency,
            "letter_head": getattr(doc, "letter_head", None),
            "logo": getattr(doc, "logo", None),
            "domain": getattr(doc, "domain", None),
            "tax_id": getattr(doc, "tax_id", None),
            "phone": getattr(doc, "phone_no", None),
            "website": getattr(doc, "website", None),
        }
        return ok({"company": data})
    except Exception as e:
        return fail(str(e))


@frappe.whitelist()
def update_settings(data=None, **kwargs):
    """
    Update the current company's configuration. Accepts a payload of fields
    to update on the Company DocType (for example company_name, logo,
    letter_head). Fields that are not present on the Company DocType are
    ignored. After saving, the new values are returned.

    Args:
        data (dict or str): JSON payload with fields to update.

    Returns:
        dict: Success response containing the updated company fields.
    """
    require_auth()
    p = parse_payload(data, **kwargs)
    name = get_company(p.get("company"))
    try:
        doc = frappe.get_doc("Company", name)
        changed = {}
        for key, value in p.items():
            if key in {"company", "doctype", "name"}:
                continue
            if hasattr(doc, key):
                setattr(doc, key, value)
                changed[key] = value
        if changed:
            doc.save(ignore_permissions=True)
            frappe.db.commit()
        return ok({"company": {"name": doc.name, **changed}}, "Company settings updated")
    except Exception as e:
        return fail(str(e))


@frappe.whitelist()
def upload_logo(file_name: str, file_content: str, company: str | None = None):
    """
    Upload a logo image and assign it to the current company. This helper
    accepts a base64 encoded file or Data URI string and attaches it as
    a ``File`` document against the Company. After upload the Company's
    ``logo`` field is updated to point to the new file's URL. This
    endpoint is intended for use by the SaaS settings UI when users
    choose a branding image.

    Args:
        file_name (str): The name of the file, including extension
            (e.g. ``logo.png``).
        file_content (str): Base64 encoded content or data URI. The
            function will strip any Data URI prefix before decoding.
        company (str, optional): Explicit company name. Defaults to the
            logged in user's company.

    Returns:
        dict: Success response with the new logo URL on the Company.
    """
    require_auth()
    import base64
    from frappe.utils.file_manager import save_file
    try:
        comp = get_company(company)
        # Strip data URI prefix if present
        if file_content.startswith("data:"):
            file_content = file_content.split(",", 1)[-1]
        content = base64.b64decode(file_content)
        # Save the file against the Company
        file_doc = save_file(file_name, content, "Company", comp, is_private=0)
        # Update the company record
        doc = frappe.get_doc("Company", comp)
        doc.logo = file_doc.file_url
        doc.save(ignore_permissions=True)
        frappe.db.commit()
        return ok({"logo": doc.logo}, "Logo uploaded")
    except Exception as e:
        return fail(str(e))