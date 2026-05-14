"""
users.py  –  Users & Permissions module API for the Fuze Business Suite.
Covers User management, Role management, User Permissions, and Role Profiles.

ERPNext Users & Permissions workflow:
    Create User → Assign Roles / Role Profile → Set User Permissions
    → Enable / Disable → Audit via Access Log
"""

import frappe
from frappe.utils import nowdate
from ._saas_utils import (
    require_auth, ok, fail, get_company,
    page, parse_payload, pick_fields,
    safe_count,
)


# ─── Dashboard ────────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_dashboard():
    """
    Return a summary of key User & Permission metrics.

    Returns:
        dict: Dashboard card data including user counts by type and status.
    """
    require_auth()

    total_users = safe_count("User", {"user_type": "System User"})
    active_users = safe_count("User", {"user_type": "System User", "enabled": 1})
    disabled_users = safe_count("User", {"user_type": "System User", "enabled": 0})
    website_users = safe_count("User", {"user_type": "Website User", "enabled": 1})
    total_roles = safe_count("Role", {"disabled": 0})

    return ok({
        "cards": {
            "total_system_users": total_users,
            "active_system_users": active_users,
            "disabled_users": disabled_users,
            "website_users": website_users,
            "total_active_roles": total_roles,
        },
        "period": {"today": nowdate()},
    })


# ─── User Management ──────────────────────────────────────────────────────────

@frappe.whitelist()
def get_users(user_type=None, enabled=None, limit=50, offset=0):
    """
    List ERPNext Users.

    Args:
        user_type (str, optional): "System User" or "Website User".
        enabled (int, optional): 1 for active, 0 for disabled.
        limit (int): Page size.
        offset (int): Page offset.

    Returns:
        dict: Paginated list of Users.
    """
    require_auth()
    limit, offset = page(limit, offset)

    filters = {}
    if user_type:
        filters["user_type"] = user_type
    if enabled is not None:
        filters["enabled"] = int(enabled)

    fields = pick_fields("User", [
        "name", "full_name", "email", "user_type",
        "enabled", "last_login", "creation",
    ])

    rows = frappe.get_all(
        "User",
        filters=filters,
        fields=fields,
        order_by="creation desc",
        limit_start=offset,
        limit_page_length=limit,
    )

    total = frappe.db.count("User", filters)
    return ok(
        {"users": rows},
        meta={"total": total, "limit": limit, "offset": offset},
    )


@frappe.whitelist()
def get_user(email):
    """
    Fetch a single User record with roles.

    Args:
        email (str): User email / ID.

    Returns:
        dict: Full User document including roles table.
    """
    require_auth()
    doc = frappe.get_doc("User", email)
    return ok({"user": doc.as_dict()})


@frappe.whitelist()
def create_user(data=None, **kwargs):
    """
    Create a new ERPNext User and optionally assign roles.

    Payload fields:
        email (str): User email address (required, used as login ID).
        first_name (str): First name (required).
        last_name (str, optional): Last name.
        user_type (str, optional): "System User" (default) or "Website User".
        send_welcome_email (int, optional): 1 to send welcome/invite email (default 0).
        roles (list[str], optional): List of role names to assign.
            e.g. ["Accounts User", "Purchase User"]
        role_profile_name (str, optional): Role Profile to assign instead of
            individual roles.
        mobile_no (str, optional): Mobile number.
        gender (str, optional): Male / Female / Other.
        birth_date (str, optional): YYYY-MM-DD.
        language (str, optional): Default language code e.g. "en".

    Returns:
        dict: Name (email) of the created User.
    """
    require_auth()
    p = parse_payload(data, **kwargs)
    try:
        email = p.get("email")
        if not email:
            return fail("email is required")
        if not p.get("first_name"):
            return fail("first_name is required")

        doc = frappe.new_doc("User")
        doc.email = email
        doc.first_name = p.get("first_name")
        doc.last_name = p.get("last_name") or ""
        doc.user_type = p.get("user_type") or "System User"
        doc.send_welcome_email = int(p.get("send_welcome_email") or 0)
        doc.mobile_no = p.get("mobile_no") or ""
        doc.gender = p.get("gender") or ""
        doc.birth_date = p.get("birth_date") or None
        doc.language = p.get("language") or "en"

        if p.get("role_profile_name"):
            doc.role_profile_name = p["role_profile_name"]

        for role_name in (p.get("roles") or []):
            doc.append("roles", {"role": role_name})

        doc.insert(ignore_permissions=True)
        frappe.db.commit()
        return ok({"user": {"id": doc.name}}, "User created successfully")
    except Exception as e:
        return fail(str(e))


@frappe.whitelist()
def update_user(email, data=None, **kwargs):
    """
    Update an existing User's profile and/or role assignments.

    Args:
        email (str): User email / ID.

    Payload fields (all optional):
        first_name, last_name, mobile_no, gender, birth_date,
        language, role_profile_name, roles (list[str] – replaces existing roles).

    Returns:
        dict: Updated user ID.
    """
    require_auth()
    p = parse_payload(data, **kwargs)
    try:
        doc = frappe.get_doc("User", email)

        for field in ["first_name", "last_name", "mobile_no",
                      "gender", "birth_date", "language", "role_profile_name"]:
            if p.get(field) is not None:
                setattr(doc, field, p[field])

        if p.get("roles") is not None:
            doc.set("roles", [])
            for role_name in p["roles"]:
                doc.append("roles", {"role": role_name})

        doc.save(ignore_permissions=True)
        frappe.db.commit()
        return ok({"user": {"id": doc.name}}, "User updated successfully")
    except Exception as e:
        return fail(str(e))


@frappe.whitelist()
def enable_user(email):
    """
    Enable a previously disabled User.

    Args:
        email (str): User email / ID.

    Returns:
        dict: Updated enabled status.
    """
    require_auth()
    try:
        doc = frappe.get_doc("User", email)
        doc.enabled = 1
        doc.save(ignore_permissions=True)
        frappe.db.commit()
        return ok({"user": {"id": doc.name, "enabled": 1}}, "User enabled")
    except Exception as e:
        return fail(str(e))


@frappe.whitelist()
def disable_user(email):
    """
    Disable a User so they can no longer log in.
    Mirrors the 'Disable Any User' ERPNext feature.

    Args:
        email (str): User email / ID.

    Returns:
        dict: Updated enabled status.
    """
    require_auth()
    try:
        doc = frappe.get_doc("User", email)
        if doc.name in ("Administrator", "Guest"):
            return fail("Cannot disable system-reserved users")
        doc.enabled = 0
        doc.save(ignore_permissions=True)
        frappe.db.commit()
        return ok({"user": {"id": doc.name, "enabled": 0}}, "User disabled")
    except Exception as e:
        return fail(str(e))


@frappe.whitelist()
def change_user_password(email, new_password):
    """
    Change a User's password programmatically.

    Args:
        email (str): User email / ID.
        new_password (str): New plain-text password (hashed internally by Frappe).

    Returns:
        dict: Success confirmation.
    """
    require_auth()
    try:
        from frappe.utils.password import update_password
        update_password(email, new_password)
        frappe.db.commit()
        return ok({"user": {"id": email}}, "Password changed successfully")
    except Exception as e:
        return fail(str(e))


# ─── Role Management ──────────────────────────────────────────────────────────

@frappe.whitelist()
def get_roles(limit=50, offset=0):
    """
    List all active Roles.

    Args:
        limit (int): Page size.
        offset (int): Page offset.

    Returns:
        dict: Paginated list of Roles.
    """
    require_auth()
    limit, offset = page(limit, offset)

    rows = frappe.get_all(
        "Role",
        filters={"disabled": 0},
        fields=["name", "desk_access", "home_page", "restrict_to_domain"],
        order_by="name asc",
        limit_start=offset,
        limit_page_length=limit,
    )
    total = frappe.db.count("Role", {"disabled": 0})
    return ok(
        {"roles": rows},
        meta={"total": total, "limit": limit, "offset": offset},
    )


@frappe.whitelist()
def get_role(name):
    """
    Fetch a single Role with its permission rules.

    Args:
        name (str): Role name.

    Returns:
        dict: Full Role document.
    """
    require_auth()
    doc = frappe.get_doc("Role", name)
    return ok({"role": doc.as_dict()})


@frappe.whitelist()
def create_role(data=None, **kwargs):
    """
    Create a new custom Role.

    Payload fields:
        role_name (str): Name of the role (required).
        desk_access (int, optional): 1 to grant desk/UI access (default 1).
        restrict_to_domain (str, optional): Limit role to a specific domain.
        home_page (str, optional): Default home page route for this role.

    Returns:
        dict: Name of the created Role.
    """
    require_auth()
    p = parse_payload(data, **kwargs)
    try:
        if not p.get("role_name"):
            return fail("role_name is required")

        doc = frappe.new_doc("Role")
        doc.role_name = p["role_name"]
        doc.desk_access = int(p.get("desk_access") if p.get("desk_access") is not None else 1)
        doc.restrict_to_domain = p.get("restrict_to_domain") or ""
        doc.home_page = p.get("home_page") or ""
        doc.insert(ignore_permissions=True)
        frappe.db.commit()
        return ok({"role": {"id": doc.name}}, "Role created successfully")
    except Exception as e:
        return fail(str(e))


# ─── Role Profiles ────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_role_profiles(limit=50, offset=0):
    """
    List all Role Profiles. A Role Profile is a template that bundles
    multiple roles so they can be assigned to users in one step.

    Args:
        limit (int): Page size.
        offset (int): Page offset.

    Returns:
        dict: Paginated list of Role Profiles.
    """
    require_auth()
    limit, offset = page(limit, offset)

    rows = frappe.get_all(
        "Role Profile",
        fields=["name"],
        order_by="name asc",
        limit_start=offset,
        limit_page_length=limit,
    )
    total = frappe.db.count("Role Profile")
    return ok(
        {"role_profiles": rows},
        meta={"total": total, "limit": limit, "offset": offset},
    )


@frappe.whitelist()
def get_role_profile(name):
    """
    Fetch a single Role Profile with its role list.

    Args:
        name (str): Role Profile name.

    Returns:
        dict: Full Role Profile document.
    """
    require_auth()
    doc = frappe.get_doc("Role Profile", name)
    return ok({"role_profile": doc.as_dict()})


@frappe.whitelist()
def create_role_profile(data=None, **kwargs):
    """
    Create a new Role Profile bundling multiple roles.

    Payload fields:
        role_profile (str): Profile name (required).
        roles (list[str]): Role names to include in this profile.

    Returns:
        dict: Name of the created Role Profile.
    """
    require_auth()
    p = parse_payload(data, **kwargs)
    try:
        if not p.get("role_profile"):
            return fail("role_profile name is required")

        doc = frappe.new_doc("Role Profile")
        doc.role_profile = p["role_profile"]
        for role_name in (p.get("roles") or []):
            doc.append("roles", {"role": role_name})

        doc.insert(ignore_permissions=True)
        frappe.db.commit()
        return ok({"role_profile": {"id": doc.name}}, "Role Profile created")
    except Exception as e:
        return fail(str(e))


# ─── User Permissions ─────────────────────────────────────────────────────────

@frappe.whitelist()
def get_user_permissions(user=None, allow_doctype=None, limit=50, offset=0):
    """
    List User Permission records. User Permissions restrict which
    documents a user can access based on a linked DocType value.

    Args:
        user (str, optional): Filter by user email.
        allow_doctype (str, optional): Filter by the restricted DocType
            e.g. "Company", "Cost Center", "Warehouse".
        limit (int): Page size.
        offset (int): Page offset.

    Returns:
        dict: Paginated list of User Permission records.
    """
    require_auth()
    limit, offset = page(limit, offset)

    filters = {}
    if user:
        filters["user"] = user
    if allow_doctype:
        filters["allow"] = allow_doctype

    rows = frappe.get_all(
        "User Permission",
        filters=filters,
        fields=["name", "user", "allow", "for_value",
                "apply_to_all_doctypes", "applicable_for"],
        order_by="user asc",
        limit_start=offset,
        limit_page_length=limit,
    )
    total = frappe.db.count("User Permission", filters)
    return ok(
        {"user_permissions": rows},
        meta={"total": total, "limit": limit, "offset": offset},
    )


@frappe.whitelist()
def create_user_permission(data=None, **kwargs):
    """
    Create a User Permission to restrict a user's data access.

    Payload fields:
        user (str): User email (required).
        allow (str): DocType to restrict by, e.g. "Company" (required).
        for_value (str): The specific document value, e.g. "Acme Corp" (required).
        apply_to_all_doctypes (int, optional): 1 = applies everywhere (default 1).
        applicable_for (str, optional): Specific DocType this permission applies to
            (used when apply_to_all_doctypes is 0).
        hide_descendants (int, optional): 1 to hide child records too.

    Returns:
        dict: Name of the created User Permission.
    """
    require_auth()
    p = parse_payload(data, **kwargs)
    try:
        for required in ("user", "allow", "for_value"):
            if not p.get(required):
                return fail(f"{required} is required")

        doc = frappe.new_doc("User Permission")
        doc.user = p["user"]
        doc.allow = p["allow"]
        doc.for_value = p["for_value"]
        doc.apply_to_all_doctypes = int(
            p.get("apply_to_all_doctypes") if p.get("apply_to_all_doctypes") is not None else 1
        )
        doc.applicable_for = p.get("applicable_for") or ""
        doc.hide_descendants = int(p.get("hide_descendants") or 0)

        doc.insert(ignore_permissions=True)
        frappe.db.commit()
        return ok({"user_permission": {"id": doc.name}}, "User Permission created")
    except Exception as e:
        return fail(str(e))


@frappe.whitelist()
def delete_user_permission(name):
    """
    Delete a User Permission record.

    Args:
        name (str): User Permission document ID.

    Returns:
        dict: Success confirmation.
    """
    require_auth()
    try:
        frappe.delete_doc("User Permission", name, ignore_permissions=True)
        frappe.db.commit()
        return ok({"user_permission": {"id": name}}, "User Permission deleted")
    except Exception as e:
        return fail(str(e))


# ─── Access Log ───────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_access_logs(user=None, limit=50, offset=0):
    """
    Retrieve Access Log entries for audit purposes.
    Mirrors the ERPNext 'Access Log' feature.

    Args:
        user (str, optional): Filter logs by a specific user email.
        limit (int): Page size.
        offset (int): Page offset.

    Returns:
        dict: Paginated list of Access Log records.
    """
    require_auth()
    limit, offset = page(limit, offset)

    filters = {}
    if user:
        filters["user"] = user

    rows = frappe.get_all(
        "Access Log",
        filters=filters,
        fields=["name", "user", "creation", "method", "page", "columns", "filters"],
        order_by="creation desc",
        limit_start=offset,
        limit_page_length=limit,
    )
    total = frappe.db.count("Access Log", filters)
    return ok(
        {"access_logs": rows},
        meta={"total": total, "limit": limit, "offset": offset},
    )