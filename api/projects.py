"""
projects.py  –  Project Management module API for the Fuze Business Suite.
Covers Projects, Tasks, Timesheets, ToDos, Project Updates, Costing,
Profitability, Expense Claims, Activity Types/Costs, Templates & Settings.
South African businesses – default currency ZAR.
"""

import frappe
from frappe.utils import flt, nowdate, getdate, add_days
from ._saas_utils import (
    require_auth, ok, fail, get_company, get_currency,
    page, parse_payload, has_doctype, pick_fields, safe_count, money,
)


# ─── Dashboard ───────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_dashboard(company=None):
    require_auth()
    company = get_company(company)
    today = nowdate()

    total_projects   = safe_count("Project", {"company": company})
    open_projects    = safe_count("Project", {"company": company, "status": "Open"})
    completed_projects = safe_count("Project", {"company": company, "status": "Completed"})
    held_projects    = safe_count("Project", {"company": company, "status": "Completed"})  # On Hold

    open_tasks       = safe_count("Task", {"status": ["not in", ["Completed", "Cancelled"]]})
    completed_tasks  = safe_count("Task", {"status": "Completed"})
    overdue_tasks    = safe_count("Task", {
        "status": ["not in", ["Completed", "Cancelled"]],
        "exp_end_date": ["<", today],
    })
    high_priority_tasks = safe_count("Task", {
        "status": ["not in", ["Completed", "Cancelled"]],
        "priority": "High",
    })

    billable_hours = 0.0
    total_billed   = 0.0
    if has_doctype("Timesheet"):
        try:
            result = frappe.db.sql(
                "SELECT COALESCE(SUM(total_billable_hours),0) h, "
                "COALESCE(SUM(total_billable_amount),0) a "
                "FROM `tabTimesheet` WHERE company=%s AND docstatus=1",
                (company,), as_dict=True,
            )
            if result:
                billable_hours = flt(result[0].h)
                total_billed   = flt(result[0].a)
        except Exception:
            pass

    total_costing = 0.0
    if has_doctype("Project"):
        try:
            result = frappe.db.sql(
                "SELECT COALESCE(SUM(estimated_costing),0) v FROM `tabProject` WHERE company=%s",
                (company,), as_dict=True,
            )
            total_costing = flt(result[0].v) if result else 0.0
        except Exception:
            pass

    open_todos = 0
    if has_doctype("ToDo"):
        try:
            open_todos = frappe.db.count("ToDo", {
                "status": "Open",
                "reference_type": "Project",
            })
        except Exception:
            pass

    return ok({
        "cards": {
            "total_projects":      total_projects,
            "open_projects":       open_projects,
            "completed_projects":  completed_projects,
            "open_tasks":          open_tasks,
            "completed_tasks":     completed_tasks,
            "overdue_tasks":       overdue_tasks,
            "high_priority_tasks": high_priority_tasks,
            "billable_hours":      round(billable_hours, 1),
            "total_billed":        round(total_billed, 2),
            "total_costing":       round(total_costing, 2),
            "open_todos":          open_todos,
        },
        "currency": get_currency(company),
    })


# ─── Projects ────────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_projects(status=None, company=None, project_type=None,
                 customer=None, search=None, limit=50, offset=0):
    require_auth()
    limit, offset = page(limit, offset)
    company = get_company(company)

    if not has_doctype("Project"):
        return ok({"projects": []}, meta={"total": 0})

    filters = {"company": company}
    if status and status != "all":
        filters["status"] = status
    if project_type:
        filters["project_type"] = project_type
    if customer:
        filters["customer"] = customer

    fields = pick_fields("Project", [
        "name", "project_name", "status", "percent_complete",
        "expected_start_date", "expected_end_date", "actual_start_date",
        "actual_end_date", "customer", "estimated_costing",
        "total_billable_amount", "total_expense_claim",
        "priority", "project_type", "department", "is_active",
        "modified", "creation",
    ])

    rows = frappe.get_all(
        "Project",
        filters=filters,
        fields=fields,
        order_by="modified desc",
        limit_start=offset,
        limit_page_length=limit,
    )

    if search:
        search_lower = search.lower()
        rows = [r for r in rows if search_lower in (r.get("project_name") or "").lower()
                or search_lower in (r.get("customer") or "").lower()]

    total = frappe.db.count("Project", filters)
    return ok(
        {"projects": rows, "currency": get_currency(company)},
        meta={"total": total, "limit": limit, "offset": offset},
    )


@frappe.whitelist()
def get_project(project_id):
    require_auth()
    if not has_doctype("Project"):
        return fail("Project DocType not installed")
    doc = frappe.get_doc("Project", project_id)

    # Enrich with task summary
    task_summary = {}
    if has_doctype("Task"):
        tasks = frappe.get_all("Task", filters={"project": project_id},
                               fields=["status", "priority", "exp_end_date"])
        today = nowdate()
        task_summary = {
            "total":     len(tasks),
            "open":      sum(1 for t in tasks if t.status == "Open"),
            "working":   sum(1 for t in tasks if t.status == "Working"),
            "completed": sum(1 for t in tasks if t.status == "Completed"),
            "overdue":   sum(1 for t in tasks if t.status not in ["Completed", "Cancelled"]
                            and t.exp_end_date and str(t.exp_end_date) < today),
        }

    data = doc.as_dict()
    data["task_summary"] = task_summary
    return ok({"project": data})


@frappe.whitelist()
def create_project(data=None, **kwargs):
    require_auth()
    p = parse_payload(data, **kwargs)
    company = get_company(p.get("company"))

    if not has_doctype("Project"):
        return fail("Project DocType not installed")

    doc = frappe.new_doc("Project")
    doc.project_name = (p.get("project_name") or p.get("name") or "").strip()
    if not doc.project_name:
        return fail("project_name is required")

    doc.company = company
    settable = pick_fields("Project", [
        "status", "expected_start_date", "expected_end_date",
        "customer", "estimated_costing", "priority", "description",
        "project_type", "department", "sales_order", "is_active",
        "estimated_costing", "frequency", "from_time", "to_time",
    ])
    for k in settable:
        if k in p:
            doc.set(k, p[k])

    doc.status = doc.get("status") or "Open"
    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    return ok({"project": {"id": doc.name, "name": doc.project_name}}, "Project created")


@frappe.whitelist()
def update_project(project_id, data=None, **kwargs):
    require_auth()
    if not has_doctype("Project"):
        return fail("Project DocType not installed")

    p = parse_payload(data, **kwargs)
    doc = frappe.get_doc("Project", project_id)

    settable = pick_fields("Project", [
        "status", "percent_complete", "expected_start_date",
        "expected_end_date", "customer", "estimated_costing",
        "priority", "description", "project_type", "department",
        "sales_order", "is_active",
    ])
    for k in settable:
        if k in p:
            doc.set(k, p[k])

    doc.save(ignore_permissions=True)
    frappe.db.commit()
    return ok({"project": {"id": doc.name, "status": doc.get("status")}}, "Project updated")


@frappe.whitelist()
def delete_project(project_id):
    require_auth()
    if not has_doctype("Project"):
        return fail("Project DocType not installed")
    frappe.delete_doc("Project", project_id, ignore_permissions=True)
    frappe.db.commit()
    return ok({"deleted": project_id}, "Project deleted")


# ─── Project Templates ────────────────────────────────────────────────────────

@frappe.whitelist()
def get_project_templates(limit=50, offset=0):
    require_auth()
    limit, offset = page(limit, offset)
    if not has_doctype("Project Template"):
        return ok({"templates": []}, meta={"total": 0})

    fields = pick_fields("Project Template", ["name", "template_name", "modified"])
    rows = frappe.get_all(
        "Project Template",
        fields=fields,
        order_by="modified desc",
        limit_start=offset,
        limit_page_length=limit,
    )
    total = frappe.db.count("Project Template")
    return ok({"templates": rows}, meta={"total": total, "limit": limit, "offset": offset})


@frappe.whitelist()
def create_project_from_template(data=None, **kwargs):
    """Create a project pre-populated from a Project Template."""
    require_auth()
    p = parse_payload(data, **kwargs)
    template_id = p.get("template")
    if not template_id:
        return fail("template is required")

    company = get_company(p.get("company"))

    if not has_doctype("Project Template"):
        return fail("Project Template DocType not installed")

    template = frappe.get_doc("Project Template", template_id)
    doc = frappe.new_doc("Project")
    doc.project_name = (p.get("project_name") or template.template_name).strip()
    doc.company      = company
    doc.status       = "Open"

    settable = ["expected_start_date", "expected_end_date", "customer",
                "priority", "description", "project_type", "department"]
    for k in settable:
        if k in p:
            doc.set(k, p[k])

    # Copy tasks from template
    if hasattr(template, "tasks") and has_doctype("Task"):
        start = getdate(p.get("expected_start_date") or nowdate())
        for tmpl_task in template.tasks:
            task = frappe.new_doc("Task")
            task.subject = tmpl_task.subject
            task.project  = doc.name  # will be set after insert; handled below
            task.priority = tmpl_task.get("priority") or "Medium"
            task.status   = "Open"
            if tmpl_task.get("duration"):
                task.exp_start_date = str(start)
                task.exp_end_date   = str(add_days(start, int(tmpl_task.duration) - 1))

    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    return ok({"project": {"id": doc.name, "name": doc.project_name}}, "Project created from template")


# ─── Project Types ───────────────────────────────────────────────────────────

@frappe.whitelist()
def get_project_types():
    require_auth()
    if not has_doctype("Project Type"):
        return ok({"types": []})
    rows = frappe.get_all("Project Type", fields=["name", "project_type"], order_by="name asc")
    return ok({"types": rows})


# ─── Project Updates ─────────────────────────────────────────────────────────

@frappe.whitelist()
def get_project_updates(project=None, limit=50, offset=0):
    require_auth()
    limit, offset = page(limit, offset)
    if not has_doctype("Project Update"):
        return ok({"updates": []}, meta={"total": 0})

    filters = {}
    if project:
        filters["project"] = project

    fields = pick_fields("Project Update", [
        "name", "project", "date", "progress", "description",
        "owner", "modified",
    ])
    rows = frappe.get_all(
        "Project Update",
        filters=filters,
        fields=fields,
        order_by="date desc",
        limit_start=offset,
        limit_page_length=limit,
    )
    total = frappe.db.count("Project Update", filters)
    return ok({"updates": rows}, meta={"total": total, "limit": limit, "offset": offset})


@frappe.whitelist()
def create_project_update(data=None, **kwargs):
    require_auth()
    p = parse_payload(data, **kwargs)
    if not has_doctype("Project Update"):
        return fail("Project Update DocType not installed")

    project = p.get("project")
    if not project:
        return fail("project is required")

    doc = frappe.new_doc("Project Update")
    doc.project     = project
    doc.date        = p.get("date") or nowdate()
    doc.description = p.get("description") or ""
    doc.progress    = p.get("progress") or 0
    doc.insert(ignore_permissions=True)
    frappe.db.commit()

    # Also update percent_complete on the project if provided
    if p.get("progress") and has_doctype("Project"):
        try:
            frappe.db.set_value("Project", project, "percent_complete", flt(p["progress"]))
            frappe.db.commit()
        except Exception:
            pass

    return ok({"update": {"id": doc.name}}, "Project update created")


# ─── Project Costing ─────────────────────────────────────────────────────────

@frappe.whitelist()
def get_project_costing(project_id):
    require_auth()
    if not has_doctype("Project"):
        return fail("Project DocType not installed")

    doc = frappe.get_doc("Project", project_id)
    currency = get_currency(doc.company)

    billable_hours = 0.0
    billed_amount  = 0.0
    if has_doctype("Timesheet"):
        try:
            ts = frappe.db.sql(
                "SELECT COALESCE(SUM(td.hours),0) h, "
                "COALESCE(SUM(td.billing_amount),0) a "
                "FROM `tabTimesheet Detail` td "
                "JOIN `tabTimesheet` t ON t.name=td.parent "
                "WHERE td.project=%s AND t.docstatus=1",
                (project_id,), as_dict=True,
            )
            if ts:
                billable_hours = flt(ts[0].h)
                billed_amount  = flt(ts[0].a)
        except Exception:
            pass

    expense_total = 0.0
    if has_doctype("Expense Claim"):
        try:
            exp = frappe.db.sql(
                "SELECT COALESCE(SUM(total_claimed_amount),0) v "
                "FROM `tabExpense Claim` WHERE project=%s AND docstatus=1",
                (project_id,), as_dict=True,
            )
            expense_total = flt(exp[0].v) if exp else 0.0
        except Exception:
            pass

    purchase_total = 0.0
    if has_doctype("Purchase Invoice Item"):
        try:
            po = frappe.db.sql(
                "SELECT COALESCE(SUM(amount),0) v "
                "FROM `tabPurchase Invoice Item` "
                "WHERE project=%s",
                (project_id,), as_dict=True,
            )
            purchase_total = flt(po[0].v) if po else 0.0
        except Exception:
            pass

    estimated   = flt(doc.get("estimated_costing"))
    total_cost  = billed_amount + expense_total + purchase_total
    margin      = estimated - total_cost if estimated else None

    return ok({
        "costing": {
            "project":          project_id,
            "project_name":     doc.project_name,
            "estimated_costing": estimated,
            "total_billable_hours": round(billable_hours, 2),
            "total_billed_amount":  round(billed_amount, 2),
            "total_expense_claims": round(expense_total, 2),
            "total_purchase_cost":  round(purchase_total, 2),
            "total_cost":           round(total_cost, 2),
            "margin":               round(margin, 2) if margin is not None else None,
            "currency": currency,
        }
    })


# ─── Project Profitability ───────────────────────────────────────────────────

@frappe.whitelist()
def get_project_profitability(company=None, from_date=None, to_date=None, project=None):
    require_auth()
    company  = get_company(company)
    currency = get_currency(company)

    if not has_doctype("Project"):
        return ok({"projects": [], "currency": currency})

    filters = {"company": company}
    if project:
        filters["name"] = project

    projects = frappe.get_all(
        "Project",
        filters=filters,
        fields=["name", "project_name", "customer", "estimated_costing",
                "total_billable_amount", "status", "percent_complete"],
    )

    result = []
    for proj in projects:
        revenue = flt(proj.get("total_billable_amount"))
        cost    = 0.0

        # Expense claims
        if has_doctype("Expense Claim"):
            try:
                exp = frappe.db.sql(
                    "SELECT COALESCE(SUM(total_claimed_amount),0) v "
                    "FROM `tabExpense Claim` WHERE project=%s AND docstatus=1",
                    (proj.name,), as_dict=True,
                )
                cost += flt(exp[0].v) if exp else 0.0
            except Exception:
                pass

        profit = revenue - cost
        margin_pct = round((profit / revenue * 100), 1) if revenue else 0.0

        result.append({
            "project":          proj.name,
            "project_name":     proj.project_name,
            "customer":         proj.customer,
            "estimated_costing": flt(proj.estimated_costing),
            "revenue":          round(revenue, 2),
            "cost":             round(cost, 2),
            "profit":           round(profit, 2),
            "margin_pct":       margin_pct,
            "status":           proj.status,
            "percent_complete": proj.percent_complete,
        })

    return ok({"projects": result, "currency": currency})


# ─── Expense Claims (linked to projects) ─────────────────────────────────────

@frappe.whitelist()
def get_project_expenses(project=None, company=None, limit=50, offset=0):
    require_auth()
    limit, offset = page(limit, offset)
    company  = get_company(company)

    if not has_doctype("Expense Claim"):
        return ok({"expenses": []}, meta={"total": 0})

    filters = {"company": company}
    if project:
        filters["project"] = project

    fields = pick_fields("Expense Claim", [
        "name", "employee", "employee_name", "project",
        "posting_date", "total_claimed_amount", "total_sanctioned_amount",
        "status", "approval_status", "docstatus", "modified",
    ])

    rows = frappe.get_all(
        "Expense Claim",
        filters=filters,
        fields=fields,
        order_by="posting_date desc",
        limit_start=offset,
        limit_page_length=limit,
    )
    total = frappe.db.count("Expense Claim", filters)
    return ok({"expenses": rows, "currency": get_currency(company)},
              meta={"total": total, "limit": limit, "offset": offset})


# ─── Tasks ───────────────────────────────────────────────────────────────────

VALID_TASK_STATUSES = ["Open", "Working", "Pending Review", "Overdue", "Completed", "Cancelled"]

@frappe.whitelist()
def get_tasks(project=None, status=None, assigned_to=None,
              priority=None, search=None, limit=50, offset=0):
    require_auth()
    limit, offset = page(limit, offset)

    if not has_doctype("Task"):
        return ok({"tasks": []}, meta={"total": 0})

    filters = {}
    if project:
        filters["project"] = project
    if status and status != "all":
        filters["status"] = status
    if assigned_to:
        filters["_assign"] = ["like", f"%{assigned_to}%"]
    if priority:
        filters["priority"] = priority

    fields = pick_fields("Task", [
        "name", "subject", "project", "status", "priority",
        "exp_start_date", "exp_end_date", "actual_start_date",
        "actual_end_date", "progress", "description",
        "assigned_to", "_assign", "depends_on_tasks",
        "department", "type", "issue", "is_group", "modified",
    ])

    rows = frappe.get_all(
        "Task",
        filters=filters,
        fields=fields,
        order_by="modified desc",
        limit_start=offset,
        limit_page_length=limit,
    )

    if search:
        s = search.lower()
        rows = [r for r in rows if s in (r.get("subject") or "").lower()]

    total = frappe.db.count("Task", filters)
    return ok({"tasks": rows}, meta={"total": total, "limit": limit, "offset": offset})


@frappe.whitelist()
def get_task(task_id):
    require_auth()
    if not has_doctype("Task"):
        return fail("Task DocType not installed")
    doc = frappe.get_doc("Task", task_id)
    return ok({"task": doc.as_dict()})


@frappe.whitelist()
def create_task(data=None, **kwargs):
    require_auth()
    p = parse_payload(data, **kwargs)

    if not has_doctype("Task"):
        return fail("Task DocType not installed")

    doc = frappe.new_doc("Task")
    doc.subject = (p.get("subject") or "").strip()
    if not doc.subject:
        return fail("subject is required")

    settable = pick_fields("Task", [
        "project", "status", "priority", "exp_start_date",
        "exp_end_date", "description", "assigned_to",
        "depends_on_tasks", "department", "type", "is_group",
        "color", "issue",
    ])
    for k in settable:
        if k in p:
            doc.set(k, p[k])

    doc.status   = doc.get("status") or "Open"
    doc.priority = doc.get("priority") or "Medium"

    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    return ok({"task": {"id": doc.name, "subject": doc.subject}}, "Task created")


@frappe.whitelist()
def update_task(task_id, data=None, **kwargs):
    require_auth()
    if not has_doctype("Task"):
        return fail("Task DocType not installed")

    p = parse_payload(data, **kwargs)
    doc = frappe.get_doc("Task", task_id)

    settable = pick_fields("Task", [
        "subject", "status", "priority", "exp_start_date",
        "exp_end_date", "progress", "description",
        "depends_on_tasks", "department", "type", "color",
    ])
    for k in settable:
        if k in p:
            doc.set(k, p[k])

    doc.save(ignore_permissions=True)
    frappe.db.commit()
    return ok({"task": {"id": doc.name, "status": doc.get("status")}}, "Task updated")


@frappe.whitelist()
def update_task_status(task_id, status):
    require_auth()
    if not has_doctype("Task"):
        return fail("Task DocType not installed")

    if status not in VALID_TASK_STATUSES:
        return fail(f"Invalid status. Choose from: {', '.join(VALID_TASK_STATUSES)}")

    frappe.db.set_value("Task", task_id, "status", status)
    frappe.db.commit()
    return ok({"task_id": task_id, "status": status}, "Task status updated")


@frappe.whitelist()
def delete_task(task_id):
    require_auth()
    if not has_doctype("Task"):
        return fail("Task DocType not installed")
    frappe.delete_doc("Task", task_id, ignore_permissions=True)
    frappe.db.commit()
    return ok({"deleted": task_id}, "Task deleted")


@frappe.whitelist()
def bulk_assign_tasks(task_ids, assigned_to, data=None, **kwargs):
    """Assign multiple tasks to a user at once."""
    require_auth()
    if not has_doctype("Task"):
        return fail("Task DocType not installed")

    if isinstance(task_ids, str):
        import json
        task_ids = json.loads(task_ids)

    updated = []
    for task_id in task_ids:
        try:
            frappe.db.set_value("Task", task_id, "assigned_to", assigned_to)
            updated.append(task_id)
        except Exception:
            pass

    frappe.db.commit()
    return ok({"updated": updated, "assigned_to": assigned_to},
              f"{len(updated)} task(s) assigned")


# ─── Gantt / Calendar Data ───────────────────────────────────────────────────

@frappe.whitelist()
def get_gantt_data(project=None, company=None):
    """Return tasks formatted for Gantt chart rendering."""
    require_auth()
    company = get_company(company)

    if not has_doctype("Task"):
        return ok({"tasks": [], "links": []})

    filters = {}
    if project:
        filters["project"] = project

    tasks = frappe.get_all(
        "Task",
        filters=filters,
        fields=["name", "subject", "status", "priority",
                "exp_start_date", "exp_end_date", "progress",
                "depends_on_tasks", "project", "_assign"],
        order_by="exp_start_date asc",
    )

    gantt_tasks = []
    links = []
    for t in tasks:
        gantt_tasks.append({
            "id":         t.name,
            "text":       t.subject,
            "start_date": str(t.exp_start_date) if t.exp_start_date else None,
            "end_date":   str(t.exp_end_date)   if t.exp_end_date   else None,
            "progress":   flt(t.progress) / 100,
            "project":    t.project,
            "status":     t.status,
            "priority":   t.priority,
        })
        if t.depends_on_tasks:
            links.append({"source": t.depends_on_tasks, "target": t.name, "type": "0"})

    return ok({"tasks": gantt_tasks, "links": links})


# ─── Activity Types & Costs ──────────────────────────────────────────────────

@frappe.whitelist()
def get_activity_types():
    require_auth()
    if not has_doctype("Activity Type"):
        return ok({"activity_types": []})
    rows = frappe.get_all("Activity Type",
                          fields=["name", "activity_type"], order_by="name asc")
    return ok({"activity_types": rows})


@frappe.whitelist()
def get_activity_costs(activity_type=None, employee=None):
    require_auth()
    if not has_doctype("Activity Cost"):
        return ok({"activity_costs": []})

    filters = {}
    if activity_type:
        filters["activity_type"] = activity_type
    if employee:
        filters["employee"] = employee

    rows = frappe.get_all(
        "Activity Cost",
        filters=filters,
        fields=["name", "employee", "activity_type", "billing_rate", "costing_rate"],
        order_by="modified desc",
    )
    return ok({"activity_costs": rows})


# ─── Timesheets ───────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_timesheets(employee=None, project=None, company=None,
                   from_date=None, to_date=None, limit=50, offset=0):
    require_auth()
    limit, offset = page(limit, offset)
    company = get_company(company)

    if not has_doctype("Timesheet"):
        return ok({"timesheets": []}, meta={"total": 0})

    filters = {"company": company}
    if employee:
        filters["employee"] = employee
    if from_date:
        filters["start_date"] = [">=", from_date]
    if to_date:
        filters["end_date"]   = ["<=", to_date]

    fields = pick_fields("Timesheet", [
        "name", "employee", "employee_name", "start_date", "end_date",
        "total_hours", "total_billable_hours", "total_billable_amount",
        "status", "docstatus", "modified",
    ])

    rows = frappe.get_all(
        "Timesheet",
        filters=filters,
        fields=fields,
        order_by="start_date desc",
        limit_start=offset,
        limit_page_length=limit,
    )

    # If filtering by project, check time_logs
    if project and has_doctype("Timesheet Detail"):
        try:
            project_ts = frappe.db.sql(
                "SELECT DISTINCT parent FROM `tabTimesheet Detail` WHERE project=%s",
                (project,), as_list=True,
            )
            ts_names = {r[0] for r in project_ts}
            rows = [r for r in rows if r.name in ts_names]
        except Exception:
            pass

    total = frappe.db.count("Timesheet", filters)
    return ok({"timesheets": rows}, meta={"total": total, "limit": limit, "offset": offset})


@frappe.whitelist()
def get_timesheet(timesheet_id):
    require_auth()
    if not has_doctype("Timesheet"):
        return fail("Timesheet DocType not installed")
    doc = frappe.get_doc("Timesheet", timesheet_id)
    return ok({"timesheet": doc.as_dict()})


@frappe.whitelist()
def create_timesheet(data=None, **kwargs):
    """Create a Timesheet with time log entries."""
    require_auth()
    p = parse_payload(data, **kwargs)

    if not has_doctype("Timesheet"):
        return fail("Timesheet DocType not installed")

    doc = frappe.new_doc("Timesheet")
    doc.company  = get_company(p.get("company"))
    doc.employee = p.get("employee") or frappe.session.user

    if p.get("start_date"):
        doc.start_date = p["start_date"]
    if p.get("end_date"):
        doc.end_date = p["end_date"]

    # Add time log rows
    time_logs = p.get("time_logs") or []
    for log in time_logs:
        doc.append("time_logs", {
            "activity_type":   log.get("activity_type"),
            "project":         log.get("project"),
            "task":            log.get("task"),
            "from_time":       log.get("from_time"),
            "to_time":         log.get("to_time"),
            "hours":           log.get("hours"),
            "description":     log.get("description"),
            "is_billable":     log.get("is_billable", 1),
            "billing_hours":   log.get("billing_hours"),
            "billing_rate":    log.get("billing_rate"),
            "costing_rate":    log.get("costing_rate"),
        })

    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    return ok({"timesheet": {"id": doc.name}}, "Timesheet created")


@frappe.whitelist()
def submit_timesheet(timesheet_id):
    """Submit (finalise) a timesheet for billing."""
    require_auth()
    if not has_doctype("Timesheet"):
        return fail("Timesheet DocType not installed")

    doc = frappe.get_doc("Timesheet", timesheet_id)
    if doc.docstatus != 0:
        return fail("Only Draft timesheets can be submitted")
    doc.submit()
    frappe.db.commit()
    return ok({"timesheet_id": timesheet_id, "docstatus": 1}, "Timesheet submitted")


@frappe.whitelist()
def create_sales_invoice_from_timesheet(timesheet_id, data=None, **kwargs):
    """Generate a Sales Invoice from a submitted Timesheet."""
    require_auth()
    p = parse_payload(data, **kwargs)

    if not has_doctype("Timesheet") or not has_doctype("Sales Invoice"):
        return fail("Required DocTypes not installed")

    ts = frappe.get_doc("Timesheet", timesheet_id)
    if ts.docstatus != 1:
        return fail("Timesheet must be submitted before invoicing")

    si = frappe.new_doc("Sales Invoice")
    si.company  = ts.company
    si.customer = p.get("customer") or ts.get("customer")

    for log in ts.time_logs:
        if log.is_billable:
            si.append("items", {
                "item_code":   p.get("item_code") or "Billable Hours",
                "qty":         log.billing_hours or log.hours,
                "rate":        log.billing_rate,
                "description": log.description or f"Work on {log.project or 'project'}",
                "timesheet":   timesheet_id,
            })

    if not si.items:
        return fail("No billable time logs found on this timesheet")

    si.insert(ignore_permissions=True)
    frappe.db.commit()
    return ok({"sales_invoice": {"id": si.name}}, "Sales Invoice created from Timesheet")


# ─── ToDos ───────────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_todos(reference_type=None, reference_name=None,
              assigned_to=None, status=None, limit=50, offset=0):
    require_auth()
    limit, offset = page(limit, offset)

    if not has_doctype("ToDo"):
        return ok({"todos": []}, meta={"total": 0})

    filters = {}
    if reference_type:
        filters["reference_type"] = reference_type
    if reference_name:
        filters["reference_name"] = reference_name
    if assigned_to:
        filters["owner"] = assigned_to
    if status and status != "all":
        filters["status"] = status

    fields = pick_fields("ToDo", [
        "name", "description", "reference_type", "reference_name",
        "assigned_by", "owner", "date", "priority", "status",
        "modified",
    ])

    rows = frappe.get_all(
        "ToDo",
        filters=filters,
        fields=fields,
        order_by="date asc",
        limit_start=offset,
        limit_page_length=limit,
    )

    total = frappe.db.count("ToDo", filters)
    return ok({"todos": rows}, meta={"total": total, "limit": limit, "offset": offset})


@frappe.whitelist()
def create_todo(data=None, **kwargs):
    require_auth()
    p = parse_payload(data, **kwargs)

    if not has_doctype("ToDo"):
        return fail("ToDo DocType not installed")

    doc = frappe.new_doc("ToDo")
    doc.description    = (p.get("description") or "").strip()
    if not doc.description:
        return fail("description is required")

    doc.reference_type = p.get("reference_type") or "Project"
    doc.reference_name = p.get("reference_name") or p.get("project")
    doc.date           = p.get("date") or nowdate()
    doc.priority       = p.get("priority") or "Medium"
    doc.status         = "Open"
    doc.assigned_by    = frappe.session.user

    if p.get("assigned_to"):
        doc.owner = p["assigned_to"]

    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    return ok({"todo": {"id": doc.name}}, "ToDo created")


@frappe.whitelist()
def update_todo(todo_id, data=None, **kwargs):
    require_auth()
    if not has_doctype("ToDo"):
        return fail("ToDo DocType not installed")

    p = parse_payload(data, **kwargs)
    doc = frappe.get_doc("ToDo", todo_id)

    for k in ["description", "date", "priority", "status"]:
        if k in p:
            doc.set(k, p[k])

    doc.save(ignore_permissions=True)
    frappe.db.commit()
    return ok({"todo": {"id": doc.name, "status": doc.status}}, "ToDo updated")


@frappe.whitelist()
def delete_todo(todo_id):
    require_auth()
    if not has_doctype("ToDo"):
        return fail("ToDo DocType not installed")
    frappe.delete_doc("ToDo", todo_id, ignore_permissions=True)
    frappe.db.commit()
    return ok({"deleted": todo_id}, "ToDo deleted")


# ─── Project Settings ────────────────────────────────────────────────────────

@frappe.whitelist()
def get_project_settings():
    require_auth()
    if not has_doctype("Projects Settings"):
        return ok({"settings": {}})
    try:
        doc = frappe.get_single("Projects Settings")
        return ok({"settings": doc.as_dict()})
    except Exception:
        return ok({"settings": {}})


@frappe.whitelist()
def update_project_settings(data=None, **kwargs):
    require_auth()
    p = parse_payload(data, **kwargs)
    if not has_doctype("Projects Settings"):
        return fail("Projects Settings DocType not installed")

    doc = frappe.get_single("Projects Settings")
    settable = [
        "project_update_frequency", "send_project_status_email",
        "status_email_recipients", "ignore_employee_time_overlap",
    ]
    for k in settable:
        if k in p:
            doc.set(k, p[k])

    doc.save(ignore_permissions=True)
    frappe.db.commit()
    return ok({"settings": {"saved": True}}, "Project settings updated")