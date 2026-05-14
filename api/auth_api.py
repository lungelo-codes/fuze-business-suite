"""
auth_api.py  –  Authentication helpers for the Fuze Business Suite.

This module exposes endpoints related to user authentication that are
needed by the SaaS portal. Currently it provides a single endpoint to
initiate a password reset ("forgot password"). The existing login and
signup flows are handled by ERPNext and should not be modified. The
forgot password endpoint accepts an email address and triggers the
standard ERPNext password reset process, which sends a reset link to
the user. Calling this endpoint as a guest is permitted to allow
non‑authenticated users to request a reset.

"""

import frappe
from ._saas_utils import ok, fail, parse_payload


@frappe.whitelist(allow_guest=True)
def forgot_password(data=None, **kwargs):
    """
    Trigger a password reset for a user. This endpoint accepts an
    ``email`` field in the payload and, if a matching User exists,
    invokes ERPNext's built‑in reset_password routine. A reset link is
    emailed to the user. If the email does not correspond to an
    existing user the response still indicates success in order to
    avoid account enumeration.

    Args:
        data (dict or str): JSON payload containing ``email``.

    Returns:
        dict: Success response indicating that a reset email has been
            sent (or would be sent if the user exists) or failure on
            internal error.
    """
    p = parse_payload(data, **kwargs)
    email = (p.get("email") or "").strip()
    if not email:
        return fail("email is required")
    try:
        # Only proceed if the user exists; silent success otherwise
        if frappe.db.exists("User", email):
            try:
                # Frappe >= v13 exposes reset_password on the User doctype
                from frappe.core.doctype.user.user import reset_password
            except Exception:
                # Fall back to legacy API
                reset_password = None
            if reset_password:
                reset_password(email)
            else:
                # Legacy: use LoginManager
                try:
                    login_manager = frappe.local.login_manager
                except Exception:
                    from frappe.auth import LoginManager
                    login_manager = LoginManager()
                login_manager.forgot_password(email)
        # Always return success to avoid leaking user existence
        frappe.db.commit()
        return ok(message="If the email is registered, a password reset link has been sent")
    except Exception as e:
        return fail(str(e))