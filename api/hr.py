"""
hr.py  –  Human Resources module API for the Fuze Business Suite.

Covers every feature in Frappe HR / ERPNext HR:
  Organisation · Employees · Employment Types · Branches · Departments
  Designations · Employee Grades · Shifts · Attendance · Checkins
  Leave Management · Holiday Lists · Leave Types · Leave Policy
  Performance · Appraisals · Goals · Feedback
  Payroll · Salary Structures · Salary Slips · Payroll Entries
  Recruitment · Job Openings · Applicants · Interviews · Job Offers
  Training · Expense Claims · Employee Advances · Travel Requests
  Employee Lifecycle · Onboarding · Promotions · Transfers · Separations
  Exit Interviews · Employee Skill Map · Fleet Management

South African businesses – default currency ZAR.
"""

import frappe
from frappe.utils import (
    nowdate, get_first_day, get_last_day, flt, add_days,
    getdate, now_datetime,
)
from ._saas_utils import (
    require_auth, ok, fail, get_company,
    page, parse_payload, has_doctype, pick_fields,
    safe_count, money,
)


# ═══════════════════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════════════════

def _emp_fields():
    return pick_fields("Employee", [
        "name", "employee_name", "first_name", "last_name",
        "department", "designation", "branch", "grade",
        "employment_type", "status", "cell_number",
        "company_email", "personal_email", "user_id",
        "date_of_joining", "date_of_birth", "gender",
        "image", "reports_to", "modified",
    ])


# ═══════════════════════════════════════════════════════════════════
# 1. DASHBOARD
# ═══════════════════════════════════════════════════════════════════

@frappe.whitelist()
def get_dashboard(company=None):
    """
    HR home screen KPI cards.
    Covers employees, attendance, leave, payroll, recruitment,
    expense claims, open appraisals.
    """
    require_auth()
    company = get_company(company)
    today   = nowdate()
    start   = get_first_day(today)
    end     = get_last_day(today)

    active_employees   = safe_count("Employee",         {"company": company, "status": "Active"})
    present_today      = safe_count("Attendance",       {"attendance_date": today, "status": "Present", "docstatus": 1})
    absent_today       = safe_count("Attendance",       {"attendance_date": today, "status": "Absent",  "docstatus": 1})
    on_leave_today     = safe_count("Attendance",       {"attendance_date": today, "status": "On Leave","docstatus": 1})
    pending_leave      = safe_count("Leave Application",{"company": company, "status": "Open"})
    open_positions     = safe_count("Job Opening",      {"company": company, "status": "Open"})
    pending_appraisals = safe_count("Appraisal",        {"company": company, "status": "Draft"})
    pending_expenses   = safe_count("Expense Claim",    {"company": company, "approval_status": "Draft"})
    open_onboarding    = safe_count("Employee Onboarding", {"company": company, "docstatus": 0})

    # Department breakdown
    departments = []
    try:
        departments = frappe.db.sql(
            """SELECT department, COUNT(*) AS count
               FROM `tabEmployee`
               WHERE company=%s AND status='Active' AND department IS NOT NULL
               GROUP BY department ORDER BY count DESC LIMIT 10""",
            (company,), as_dict=True,
        )
    except Exception:
        pass

    # Current-month payroll total (submitted slips only)
    payroll_total = 0.0
    if has_doctype("Salary Slip"):
        try:
            r = frappe.db.sql(
                """SELECT COALESCE(SUM(net_pay),0) v FROM `tabSalary Slip`
                   WHERE company=%s AND docstatus=1
                     AND start_date>=%s AND end_date<=%s""",
                (company, start, end), as_dict=True,
            )
            payroll_total = flt(r[0].v) if r else 0.0
        except Exception:
            pass

    # Pending expense totals
    expense_total = 0.0
    if has_doctype("Expense Claim"):
        try:
            r = frappe.db.sql(
                """SELECT COALESCE(SUM(total_claimed_amount),0) v FROM `tabExpense Claim`
                   WHERE company=%s AND approval_status='Draft' AND docstatus=0""",
                (company,), as_dict=True,
            )
            expense_total = flt(r[0].v) if r else 0.0
        except Exception:
            pass

    return ok({
        "cards": {
            "active_employees":   active_employees,
            "present_today":      present_today,
            "absent_today":       absent_today,
            "on_leave_today":     on_leave_today,
            "pending_leave":      pending_leave,
            "open_positions":     open_positions,
            "pending_appraisals": pending_appraisals,
            "pending_expenses":   pending_expenses,
            "open_onboarding":    open_onboarding,
            "monthly_payroll":    money(payroll_total),
            "pending_expense_amount": money(expense_total),
            "departments":        len(departments),
        },
        "departments": departments,
        "period": {"start": str(start), "end": str(end)},
    })


# ═══════════════════════════════════════════════════════════════════
# 2. ORGANISATION MASTERS
# ═══════════════════════════════════════════════════════════════════

@frappe.whitelist()
def get_departments(company=None):
    require_auth()
    company = get_company(company)
    rows = frappe.get_all("Department",
                          filters={"company": company, "disabled": 0},
                          fields=["name", "department_name", "parent_department", "is_group"])
    return ok({"departments": rows})


@frappe.whitelist()
def get_designations():
    require_auth()
    rows = frappe.get_all("Designation",
                          fields=["name", "desk_color"],
                          order_by="name asc")
    return ok({"designations": rows})


@frappe.whitelist()
def get_branches(company=None):
    require_auth()
    rows = frappe.get_all("Branch", fields=["name", "branch"])
    return ok({"branches": rows})


@frappe.whitelist()
def get_employment_types():
    require_auth()
    rows = frappe.get_all("Employment Type", fields=["name"])
    return ok({"employment_types": rows})


@frappe.whitelist()
def get_employee_grades():
    require_auth()
    rows = frappe.get_all("Employee Grade",
                          fields=["name", "default_salary_structure", "default_leave_policy"])
    return ok({"grades": rows})


# ═══════════════════════════════════════════════════════════════════
# 3. EMPLOYEES
# ═══════════════════════════════════════════════════════════════════

@frappe.whitelist()
def get_employees(status="Active", department=None, company=None,
                  search=None, branch=None, grade=None, limit=50, offset=0):
    """
    Paginated employee list.  Supports filters: status, department,
    branch, grade, and a free-text search on employee_name.
    """
    require_auth()
    limit, offset = page(limit, offset)
    company = get_company(company)

    filters = {"company": company}
    if status and status != "all":
        filters["status"] = status
    if department and department != "all":
        filters["department"] = department
    if branch:
        filters["branch"] = branch
    if grade:
        filters["grade"] = grade

    if search:
        # frappe.get_all doesn't support OR filters well; use SQL
        try:
            sql_rows = frappe.db.sql(
                """SELECT name FROM `tabEmployee`
                   WHERE company=%s
                     AND (status=%s OR %s IS NULL)
                     AND (employee_name LIKE %s OR company_email LIKE %s)
                   ORDER BY employee_name ASC
                   LIMIT %s OFFSET %s""",
                (company,
                 filters.get("status"), filters.get("status"),
                 f"%{search}%", f"%{search}%",
                 limit, offset),
                as_dict=True,
            )
            names = [r.name for r in sql_rows]
            rows = [frappe.get_value("Employee", n, _emp_fields(), as_dict=True) for n in names]
        except Exception:
            rows = []
    else:
        rows = frappe.get_all(
            "Employee",
            filters=filters,
            fields=_emp_fields(),
            order_by="employee_name asc",
            limit_start=offset,
            limit_page_length=limit,
        )

    total = frappe.db.count("Employee", filters)
    return ok({"employees": rows}, meta={"total": total, "limit": limit, "offset": offset})


@frappe.whitelist()
def get_employee(employee_id):
    require_auth()
    try:
        doc = frappe.get_doc("Employee", employee_id)
    except frappe.DoesNotExistError:
        return fail(f"Employee {employee_id!r} not found")
    return ok({"employee": doc.as_dict()})


@frappe.whitelist()
def create_employee(data=None, **kwargs):
    require_auth()
    p   = parse_payload(data, **kwargs)
    doc = frappe.new_doc("Employee")
    doc.company          = p.get("company") or get_company()
    doc.first_name       = p.get("first_name") or p.get("employee_name", "")
    doc.last_name        = p.get("last_name", "")
    doc.employee_name    = p.get("employee_name") or f"{doc.first_name} {doc.last_name}".strip()
    doc.department       = p.get("department")
    doc.designation      = p.get("designation")
    doc.branch           = p.get("branch")
    doc.grade            = p.get("grade")
    doc.employment_type  = p.get("employment_type")
    doc.status           = p.get("status") or "Active"
    doc.date_of_joining  = p.get("date_of_joining") or nowdate()
    doc.date_of_birth    = p.get("date_of_birth")
    doc.gender           = p.get("gender")
    doc.cell_number      = p.get("cell_number") or p.get("phone")
    doc.personal_email   = p.get("personal_email") or p.get("email")
    doc.company_email    = p.get("company_email")
    doc.reports_to       = p.get("reports_to")
    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    return ok({"employee": {"id": doc.name, "name": doc.employee_name}}, "Employee created")


@frappe.whitelist()
def update_employee(employee_id, data=None, **kwargs):
    require_auth()
    p = parse_payload(data, **kwargs)
    try:
        doc = frappe.get_doc("Employee", employee_id)
    except frappe.DoesNotExistError:
        return fail(f"Employee {employee_id!r} not found")
    for f in ["first_name","last_name","employee_name","department","designation",
              "branch","grade","employment_type","status","date_of_joining",
              "date_of_birth","gender","cell_number","personal_email",
              "company_email","reports_to"]:
        if f in p:
            setattr(doc, f, p[f])
    doc.save(ignore_permissions=True)
    frappe.db.commit()
    return ok({"employee": {"id": doc.name}}, "Employee updated")


@frappe.whitelist()
def get_org_chart(company=None):
    """Return the reporting hierarchy as a flat list for client-side tree rendering."""
    require_auth()
    company = get_company(company)
    rows = frappe.db.sql(
        """SELECT name, employee_name, department, designation,
                  reports_to, image
           FROM `tabEmployee`
           WHERE company=%s AND status='Active'
           ORDER BY employee_name""",
        (company,), as_dict=True,
    )
    return ok({"nodes": rows})


# ═══════════════════════════════════════════════════════════════════
# 4. SHIFT MANAGEMENT
# ═══════════════════════════════════════════════════════════════════

@frappe.whitelist()
def get_shift_types():
    require_auth()
    rows = frappe.get_all("Shift Type",
                          fields=["name", "start_time", "end_time",
                                  "late_entry_grace_period", "early_exit_grace_period",
                                  "enable_auto_attendance"])
    return ok({"shift_types": rows})


@frappe.whitelist()
def get_shift_assignments(employee=None, company=None, limit=50, offset=0):
    require_auth()
    limit, offset = page(limit, offset)
    company = get_company(company)
    filters = {"company": company, "docstatus": 1}
    if employee:
        filters["employee"] = employee
    fields = pick_fields("Shift Assignment", [
        "name","employee","employee_name","shift_type",
        "start_date","end_date","status",
    ])
    rows = frappe.get_all("Shift Assignment", filters=filters, fields=fields,
                          order_by="start_date desc",
                          limit_start=offset, limit_page_length=limit)
    return ok({"shift_assignments": rows},
              meta={"total": frappe.db.count("Shift Assignment", filters)})


@frappe.whitelist()
def create_shift_assignment(data=None, **kwargs):
    require_auth()
    p = parse_payload(data, **kwargs)
    doc = frappe.new_doc("Shift Assignment")
    doc.company      = p.get("company") or get_company()
    doc.employee     = p.get("employee")
    doc.shift_type   = p.get("shift_type")
    doc.start_date   = p.get("start_date") or nowdate()
    doc.end_date     = p.get("end_date")
    doc.status       = "Active"
    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    return ok({"shift_assignment": {"id": doc.name}}, "Shift assignment created")


@frappe.whitelist()
def get_shift_requests(employee=None, status=None, limit=50, offset=0):
    require_auth()
    limit, offset = page(limit, offset)
    filters = {}
    if employee:
        filters["employee"] = employee
    if status:
        filters["status"] = status
    fields = pick_fields("Shift Request", [
        "name","employee","employee_name","shift_type",
        "from_date","to_date","status","reason",
    ])
    rows = frappe.get_all("Shift Request", filters=filters, fields=fields,
                          order_by="from_date desc",
                          limit_start=offset, limit_page_length=limit)
    return ok({"shift_requests": rows},
              meta={"total": frappe.db.count("Shift Request", filters)})


# ═══════════════════════════════════════════════════════════════════
# 5. ATTENDANCE
# ═══════════════════════════════════════════════════════════════════

@frappe.whitelist()
def get_attendance(date=None, status=None, employee=None,
                   department=None, from_date=None, to_date=None,
                   limit=50, offset=0):
    require_auth()
    limit, offset = page(limit, offset)
    filters = {"docstatus": 1}
    if date:
        filters["attendance_date"] = date
    elif from_date and to_date:
        filters["attendance_date"] = ["between", [from_date, to_date]]
    if status and status != "all":
        filters["status"] = status
    if employee:
        filters["employee"] = employee
    if department:
        filters["department"] = department

    fields = pick_fields("Attendance", [
        "name","employee","employee_name","attendance_date","status",
        "working_hours","in_time","out_time","department","shift",
        "late_entry","early_exit","leave_type",
    ])
    rows = frappe.get_all("Attendance", filters=filters, fields=fields,
                          order_by="attendance_date desc",
                          limit_start=offset, limit_page_length=limit)
    total = frappe.db.count("Attendance", filters)
    return ok({"attendance": rows}, meta={"total": total, "limit": limit, "offset": offset})


@frappe.whitelist()
def mark_attendance(data=None, **kwargs):
    """Mark attendance for one employee on one date."""
    require_auth()
    p = parse_payload(data, **kwargs)
    doc = frappe.new_doc("Attendance")
    doc.employee        = p.get("employee")
    doc.attendance_date = p.get("attendance_date") or nowdate()
    doc.status          = p.get("status") or "Present"
    doc.working_hours   = flt(p.get("working_hours") or 0)
    doc.in_time         = p.get("in_time")
    doc.out_time        = p.get("out_time")
    doc.shift           = p.get("shift")
    doc.leave_type      = p.get("leave_type")
    doc.insert(ignore_permissions=True)
    doc.submit()
    frappe.db.commit()
    return ok({"attendance": {"id": doc.name}}, "Attendance marked")


@frappe.whitelist()
def get_attendance_requests(employee=None, status=None, limit=50, offset=0):
    require_auth()
    limit, offset = page(limit, offset)
    filters = {}
    if employee:
        filters["employee"] = employee
    if status:
        filters["status"] = status
    fields = pick_fields("Attendance Request", [
        "name","employee","employee_name","from_date","to_date",
        "reason","explanation","status",
    ])
    rows = frappe.get_all("Attendance Request", filters=filters, fields=fields,
                          order_by="from_date desc",
                          limit_start=offset, limit_page_length=limit)
    return ok({"attendance_requests": rows},
              meta={"total": frappe.db.count("Attendance Request", filters)})


@frappe.whitelist()
def create_attendance_request(data=None, **kwargs):
    require_auth()
    p = parse_payload(data, **kwargs)
    doc = frappe.new_doc("Attendance Request")
    doc.employee    = p.get("employee")
    doc.from_date   = p.get("from_date")
    doc.to_date     = p.get("to_date")
    doc.reason      = p.get("reason") or "Work From Home"
    doc.explanation = p.get("explanation") or ""
    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    return ok({"attendance_request": {"id": doc.name}}, "Attendance request created")


@frappe.whitelist()
def get_employee_checkins(employee=None, from_date=None, to_date=None, limit=50, offset=0):
    """Employee biometric / manual check-in / check-out records."""
    require_auth()
    limit, offset = page(limit, offset)
    filters = {}
    if employee:
        filters["employee"] = employee
    if from_date and to_date:
        filters["time"] = ["between", [from_date, to_date]]
    fields = pick_fields("Employee Checkin", [
        "name","employee","employee_name","log_type","time",
        "device_id","shift","shift_actual_start","shift_actual_end",
    ])
    rows = frappe.get_all("Employee Checkin", filters=filters, fields=fields,
                          order_by="time desc",
                          limit_start=offset, limit_page_length=limit)
    return ok({"checkins": rows}, meta={"total": frappe.db.count("Employee Checkin", filters)})


# ═══════════════════════════════════════════════════════════════════
# 6. LEAVE MANAGEMENT
# ═══════════════════════════════════════════════════════════════════

@frappe.whitelist()
def get_leave_types():
    require_auth()
    rows = frappe.get_all("Leave Type", fields=[
        "name","max_days_allowed","allow_encashment",
        "is_carry_forward","is_lwp","include_holiday",
    ])
    return ok({"leave_types": rows})


@frappe.whitelist()
def get_holiday_lists(company=None):
    require_auth()
    rows = frappe.get_all("Holiday List",
                          fields=["name","from_date","to_date","total_holidays"])
    return ok({"holiday_lists": rows})


@frappe.whitelist()
def get_leave_requests(status=None, employee=None, leave_type=None,
                       from_date=None, to_date=None, limit=50, offset=0):
    require_auth()
    limit, offset = page(limit, offset)
    filters = {}
    if status and status != "all":
        filters["status"] = status
    if employee:
        filters["employee"] = employee
    if leave_type:
        filters["leave_type"] = leave_type
    if from_date and to_date:
        filters["from_date"] = [">=", from_date]
        filters["to_date"]   = ["<=", to_date]

    fields = pick_fields("Leave Application", [
        "name","employee","employee_name","leave_type",
        "from_date","to_date","total_leave_days","half_day",
        "status","description","posting_date",
    ])
    rows = frappe.get_all("Leave Application", filters=filters, fields=fields,
                          order_by="from_date desc",
                          limit_start=offset, limit_page_length=limit)
    total = frappe.db.count("Leave Application", filters)
    return ok({"leave_requests": rows}, meta={"total": total, "limit": limit, "offset": offset})


@frappe.whitelist()
def create_leave_request(data=None, **kwargs):
    require_auth()
    p = parse_payload(data, **kwargs)
    doc = frappe.new_doc("Leave Application")
    doc.employee     = p.get("employee")
    doc.leave_type   = p.get("leave_type")
    doc.from_date    = p.get("from_date")
    doc.to_date      = p.get("to_date")
    doc.half_day     = 1 if p.get("half_day") else 0
    doc.half_day_date = p.get("half_day_date")
    doc.description  = p.get("description") or p.get("reason") or ""
    doc.company      = p.get("company") or get_company()
    doc.status       = "Open"
    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    return ok({"leave_request": {"id": doc.name}}, "Leave request created")


@frappe.whitelist()
def approve_leave_request(leave_id):
    require_auth()
    try:
        doc = frappe.get_doc("Leave Application", leave_id)
        doc.status = "Approved"
        doc.save(ignore_permissions=True)
        doc.submit()
        frappe.db.commit()
        return ok({"leave_request": {"id": doc.name, "status": "Approved"}}, "Leave approved")
    except Exception as e:
        return fail(str(e))


@frappe.whitelist()
def reject_leave_request(leave_id, reason=None):
    require_auth()
    try:
        doc = frappe.get_doc("Leave Application", leave_id)
        doc.status = "Rejected"
        if reason:
            doc.description = (doc.description or "") + f"\n\nRejection reason: {reason}"
        doc.save(ignore_permissions=True)
        frappe.db.commit()
        return ok({"leave_request": {"id": doc.name, "status": "Rejected"}}, "Leave rejected")
    except Exception as e:
        return fail(str(e))


@frappe.whitelist()
def get_leave_allocations(employee=None, leave_type=None, limit=50, offset=0):
    require_auth()
    limit, offset = page(limit, offset)
    filters = {"docstatus": 1}
    if employee:
        filters["employee"] = employee
    if leave_type:
        filters["leave_type"] = leave_type

    fields = pick_fields("Leave Allocation", [
        "name","employee","employee_name","leave_type",
        "from_date","to_date","new_leaves_allocated",
        "carry_forward","total_leaves_allocated",
    ])
    rows = frappe.get_all("Leave Allocation", filters=filters, fields=fields,
                          order_by="from_date desc",
                          limit_start=offset, limit_page_length=limit)
    return ok({"allocations": rows},
              meta={"total": frappe.db.count("Leave Allocation", filters)})


@frappe.whitelist()
def get_leave_balance(employee, as_of_date=None):
    """Return leave balance for all leave types for an employee."""
    require_auth()
    as_of_date = as_of_date or nowdate()
    try:
        from hrms.hr.doctype.leave_application.leave_application import get_leave_details
        details = get_leave_details(employee, as_of_date)
        return ok({"leave_balance": details, "as_of_date": as_of_date})
    except Exception:
        # Fallback: query Leave Ledger Entry
        rows = frappe.get_all(
            "Leave Ledger Entry",
            filters={"employee": employee, "docstatus": 1,
                     "transaction_date": ["<=", as_of_date]},
            fields=["leave_type", "leaves"],
        )
        balance: dict = {}
        for r in rows:
            balance[r.leave_type] = balance.get(r.leave_type, 0) + flt(r.leaves)
        return ok({"leave_balance": balance, "as_of_date": as_of_date})


@frappe.whitelist()
def get_leave_encashments(employee=None, status=None, limit=50, offset=0):
    require_auth()
    limit, offset = page(limit, offset)
    filters = {}
    if employee:
        filters["employee"] = employee
    if status:
        filters["encashment_date"] = ["is", "set"] if status == "encashed" else ["is", "not set"]
    rows = frappe.get_all("Leave Encashment",
                          filters=filters,
                          fields=pick_fields("Leave Encashment", [
                              "name","employee","employee_name","leave_type",
                              "leave_period","encashment_date","encashment_amount",
                          ]),
                          order_by="creation desc",
                          limit_start=offset, limit_page_length=limit)
    return ok({"encashments": rows},
              meta={"total": frappe.db.count("Leave Encashment", filters)})


@frappe.whitelist()
def get_compensatory_leave_requests(employee=None, status=None, limit=50, offset=0):
    require_auth()
    limit, offset = page(limit, offset)
    filters = {}
    if employee:
        filters["employee"] = employee
    if status:
        filters["status"] = status
    rows = frappe.get_all("Compensatory Leave Request",
                          filters=filters,
                          fields=pick_fields("Compensatory Leave Request", [
                              "name","employee","employee_name","leave_type",
                              "work_from_date","work_end_date","reason","status",
                          ]),
                          order_by="creation desc",
                          limit_start=offset, limit_page_length=limit)
    return ok({"compensatory_requests": rows},
              meta={"total": frappe.db.count("Compensatory Leave Request", filters)})


# ═══════════════════════════════════════════════════════════════════
# 7. PERFORMANCE MANAGEMENT
# ═══════════════════════════════════════════════════════════════════

@frappe.whitelist()
def get_appraisal_cycles(company=None, status=None, limit=50, offset=0):
    require_auth()
    limit, offset = page(limit, offset)
    company = get_company(company)
    filters = {"company": company}
    if status:
        filters["status"] = status
    rows = frappe.get_all("Appraisal Cycle",
                          filters=filters,
                          fields=pick_fields("Appraisal Cycle", [
                              "name","cycle_name","company","start_date",
                              "end_date","status","kra_evaluation_method",
                              "self_appraisal","self_ratings_only",
                          ]),
                          order_by="start_date desc",
                          limit_start=offset, limit_page_length=limit)
    return ok({"appraisal_cycles": rows},
              meta={"total": frappe.db.count("Appraisal Cycle", filters)})


@frappe.whitelist()
def get_appraisals(company=None, employee=None, status=None,
                   appraisal_cycle=None, limit=50, offset=0):
    require_auth()
    limit, offset = page(limit, offset)
    company = get_company(company)
    filters = {"company": company}
    if employee:
        filters["employee"] = employee
    if status:
        filters["status"] = status
    if appraisal_cycle:
        filters["appraisal_cycle"] = appraisal_cycle

    fields = pick_fields("Appraisal", [
        "name","employee","employee_name","department","designation",
        "appraisal_cycle","status","total_score","final_score","modified",
    ])
    rows = frappe.get_all("Appraisal", filters=filters, fields=fields,
                          order_by="modified desc",
                          limit_start=offset, limit_page_length=limit)
    return ok({"appraisals": rows},
              meta={"total": frappe.db.count("Appraisal", filters)})


@frappe.whitelist()
def get_appraisal(appraisal_id):
    require_auth()
    try:
        doc = frappe.get_doc("Appraisal", appraisal_id)
        return ok({"appraisal": doc.as_dict()})
    except frappe.DoesNotExistError:
        return fail(f"Appraisal {appraisal_id!r} not found")


@frappe.whitelist()
def get_goals(employee=None, status=None, limit=50, offset=0):
    require_auth()
    limit, offset = page(limit, offset)
    filters = {}
    if employee:
        filters["employee"] = employee
    if status:
        filters["status"] = status
    rows = frappe.get_all("Goal",
                          filters=filters,
                          fields=pick_fields("Goal", [
                              "name","employee","employee_name","title",
                              "description","status","progress","start_date",
                              "end_date","goal_type","appraisal_cycle",
                          ]),
                          order_by="start_date desc",
                          limit_start=offset, limit_page_length=limit)
    return ok({"goals": rows}, meta={"total": frappe.db.count("Goal", filters)})


@frappe.whitelist()
def create_goal(data=None, **kwargs):
    require_auth()
    p = parse_payload(data, **kwargs)
    doc = frappe.new_doc("Goal")
    doc.employee     = p.get("employee")
    doc.title        = p.get("title") or "New Goal"
    doc.description  = p.get("description") or ""
    doc.status       = p.get("status") or "In Progress"
    doc.start_date   = p.get("start_date") or nowdate()
    doc.end_date     = p.get("end_date")
    doc.goal_type    = p.get("goal_type") or "Individual"
    doc.appraisal_cycle = p.get("appraisal_cycle")
    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    return ok({"goal": {"id": doc.name, "title": doc.title}}, "Goal created")


@frappe.whitelist()
def get_employee_performance_feedback(employee=None, appraisal=None, limit=50, offset=0):
    require_auth()
    limit, offset = page(limit, offset)
    filters = {}
    if employee:
        filters["employee"] = employee
    if appraisal:
        filters["appraisal"] = appraisal
    rows = frappe.get_all("Employee Performance Feedback",
                          filters=filters,
                          fields=pick_fields("Employee Performance Feedback", [
                              "name","employee","employee_name","reviewer",
                              "reviewer_name","appraisal","total_score",
                              "feedback","creation",
                          ]),
                          order_by="creation desc",
                          limit_start=offset, limit_page_length=limit)
    return ok({"feedback": rows},
              meta={"total": frappe.db.count("Employee Performance Feedback", filters)})


# ═══════════════════════════════════════════════════════════════════
# 8. PAYROLL
# ═══════════════════════════════════════════════════════════════════

@frappe.whitelist()
def get_salary_structures(company=None):
    require_auth()
    company = get_company(company)
    rows = frappe.get_all("Salary Structure",
                          filters={"company": company, "is_active": "Yes", "docstatus": 1},
                          fields=["name","currency","salary_slip_based_on_timesheet"])
    return ok({"salary_structures": rows})


@frappe.whitelist()
def get_salary_structure_assignments(employee=None, company=None, limit=50, offset=0):
    require_auth()
    limit, offset = page(limit, offset)
    company = get_company(company)
    filters = {"company": company, "docstatus": 1}
    if employee:
        filters["employee"] = employee
    rows = frappe.get_all("Salary Structure Assignment",
                          filters=filters,
                          fields=pick_fields("Salary Structure Assignment", [
                              "name","employee","employee_name","salary_structure",
                              "from_date","base","variable","currency",
                          ]),
                          order_by="from_date desc",
                          limit_start=offset, limit_page_length=limit)
    return ok({"assignments": rows},
              meta={"total": frappe.db.count("Salary Structure Assignment", filters)})


@frappe.whitelist()
def get_payroll_summary(company=None, from_date=None, to_date=None):
    require_auth()
    company = get_company(company)
    today   = nowdate()
    from_date = from_date or str(get_first_day(today))
    to_date   = to_date   or str(get_last_day(today))

    fields = pick_fields("Salary Slip", [
        "name","employee","employee_name","department",
        "start_date","end_date","gross_pay","total_deduction","net_pay",
        "status","docstatus","payroll_entry",
    ])
    rows = frappe.get_all("Salary Slip",
                          filters={"company": company,
                                   "start_date": [">=", from_date],
                                   "end_date":   ["<=", to_date]},
                          fields=fields,
                          order_by="end_date desc")

    total_gross  = sum(flt(r.get("gross_pay")       or 0) for r in rows)
    total_deduct = sum(flt(r.get("total_deduction") or 0) for r in rows)
    total_net    = sum(flt(r.get("net_pay")         or 0) for r in rows)

    return ok({
        "slips": rows,
        "totals": {
            "count":            len(rows),
            "gross_pay":        money(total_gross),
            "total_deductions": money(total_deduct),
            "net_pay":          money(total_net),
        },
        "period": {"from_date": from_date, "to_date": to_date},
    })


@frappe.whitelist()
def get_salary_slip(salary_slip):
    require_auth()
    try:
        doc = frappe.get_doc("Salary Slip", salary_slip)
        return ok({"salary_slip": doc.as_dict()})
    except frappe.DoesNotExistError:
        return fail(f"Salary Slip {salary_slip!r} not found")


@frappe.whitelist()
def get_payroll_entries(company=None, status=None, limit=50, offset=0):
    require_auth()
    limit, offset = page(limit, offset)
    company = get_company(company)
    filters = {"company": company}
    if status:
        filters["status"] = status
    rows = frappe.get_all("Payroll Entry",
                          filters=filters,
                          fields=pick_fields("Payroll Entry", [
                              "name","company","payroll_frequency",
                              "start_date","end_date","payment_account",
                              "status","docstatus",
                          ]),
                          order_by="start_date desc",
                          limit_start=offset, limit_page_length=limit)
    return ok({"payroll_entries": rows},
              meta={"total": frappe.db.count("Payroll Entry", filters)})


@frappe.whitelist()
def get_salary_components(component_type=None):
    require_auth()
    filters = {}
    if component_type:
        filters["type"] = component_type  # "Earning" or "Deduction"
    rows = frappe.get_all("Salary Component",
                          filters=filters,
                          fields=["name","type","is_tax_applicable",
                                  "is_flexible_benefit","depends_on_payment_days"])
    return ok({"salary_components": rows})


# ═══════════════════════════════════════════════════════════════════
# 9. RECRUITMENT
# ═══════════════════════════════════════════════════════════════════

@frappe.whitelist()
def get_job_openings(company=None, status=None, department=None, limit=50, offset=0):
    require_auth()
    limit, offset = page(limit, offset)
    company = get_company(company)
    filters = {"company": company}
    if status and status != "all":
        filters["status"] = status
    if department:
        filters["department"] = department

    fields = pick_fields("Job Opening", [
        "name","job_title","status","department",
        "designation","expected_compensation","closes_on",
        "no_of_positions","description",
    ])
    rows = frappe.get_all("Job Opening", filters=filters, fields=fields,
                          order_by="modified desc",
                          limit_start=offset, limit_page_length=limit)
    return ok({"openings": rows},
              meta={"total": frappe.db.count("Job Opening", filters)})


@frappe.whitelist()
def create_job_opening(data=None, **kwargs):
    require_auth()
    p = parse_payload(data, **kwargs)
    doc = frappe.new_doc("Job Opening")
    doc.job_title               = p.get("job_title")
    doc.company                 = p.get("company") or get_company()
    doc.department              = p.get("department")
    doc.designation             = p.get("designation")
    doc.status                  = p.get("status") or "Open"
    doc.expected_compensation   = flt(p.get("expected_compensation") or 0)
    doc.closes_on               = p.get("closes_on")
    doc.no_of_positions         = p.get("no_of_positions") or 1
    doc.description             = p.get("description") or ""
    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    return ok({"job_opening": {"id": doc.name, "title": doc.job_title}}, "Job opening created")


@frappe.whitelist()
def get_job_applicants(job_opening=None, status=None, limit=50, offset=0):
    require_auth()
    limit, offset = page(limit, offset)
    filters = {}
    if job_opening:
        filters["job_title"] = job_opening
    if status and status != "all":
        filters["status"] = status

    fields = pick_fields("Job Applicant", [
        "name","applicant_name","email_id","job_title",
        "status","resume_attachment","cover_letter",
        "source","linkedin_profile","creation",
    ])
    rows = frappe.get_all("Job Applicant", filters=filters, fields=fields,
                          order_by="creation desc",
                          limit_start=offset, limit_page_length=limit)
    return ok({"applicants": rows},
              meta={"total": frappe.db.count("Job Applicant", filters)})


@frappe.whitelist()
def create_job_applicant(data=None, **kwargs):
    require_auth()
    p = parse_payload(data, **kwargs)
    doc = frappe.new_doc("Job Applicant")
    doc.applicant_name   = p.get("applicant_name")
    doc.email_id         = p.get("email_id") or p.get("email")
    doc.job_title        = p.get("job_title") or p.get("job_opening")
    doc.status           = p.get("status") or "Open"
    doc.source           = p.get("source")
    doc.cover_letter     = p.get("cover_letter")
    doc.linkedin_profile = p.get("linkedin_profile")
    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    return ok({"job_applicant": {"id": doc.name, "name": doc.applicant_name}}, "Applicant created")


@frappe.whitelist()
def update_job_applicant(applicant_id, data=None, **kwargs):
    require_auth()
    p = parse_payload(data, **kwargs)
    try:
        doc = frappe.get_doc("Job Applicant", applicant_id)
    except frappe.DoesNotExistError:
        return fail(f"Applicant {applicant_id!r} not found")
    for f in ["status","applicant_name","email_id","source","cover_letter"]:
        if f in p:
            setattr(doc, f, p[f])
    doc.save(ignore_permissions=True)
    frappe.db.commit()
    return ok({"job_applicant": {"id": doc.name, "status": doc.status}}, "Applicant updated")


@frappe.whitelist()
def get_interviews(job_applicant=None, status=None, limit=50, offset=0):
    require_auth()
    limit, offset = page(limit, offset)
    filters = {}
    if job_applicant:
        filters["job_applicant"] = job_applicant
    if status:
        filters["status"] = status
    rows = frappe.get_all("Interview",
                          filters=filters,
                          fields=pick_fields("Interview", [
                              "name","job_applicant","applicant_name","interview_round",
                              "scheduled_on","status","interview_type",
                              "expected_average_rating","average_rating",
                          ]),
                          order_by="scheduled_on desc",
                          limit_start=offset, limit_page_length=limit)
    return ok({"interviews": rows},
              meta={"total": frappe.db.count("Interview", filters)})


@frappe.whitelist()
def create_interview(data=None, **kwargs):
    require_auth()
    p = parse_payload(data, **kwargs)
    doc = frappe.new_doc("Interview")
    doc.job_applicant    = p.get("job_applicant")
    doc.interview_round  = p.get("interview_round")
    doc.scheduled_on     = p.get("scheduled_on")
    doc.interview_type   = p.get("interview_type")
    doc.status           = "Pending"
    for interviewer in (p.get("interviewers") or []):
        doc.append("interview_details", {"interviewer": interviewer})
    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    return ok({"interview": {"id": doc.name}}, "Interview scheduled")


@frappe.whitelist()
def get_job_offers(job_applicant=None, status=None, limit=50, offset=0):
    require_auth()
    limit, offset = page(limit, offset)
    filters = {}
    if job_applicant:
        filters["job_applicant"] = job_applicant
    if status:
        filters["status"] = status
    rows = frappe.get_all("Job Offer",
                          filters=filters,
                          fields=pick_fields("Job Offer", [
                              "name","applicant_name","job_applicant","designation",
                              "company","offer_date","status","salary_structure",
                          ]),
                          order_by="offer_date desc",
                          limit_start=offset, limit_page_length=limit)
    return ok({"job_offers": rows},
              meta={"total": frappe.db.count("Job Offer", filters)})


@frappe.whitelist()
def get_job_requisitions(company=None, status=None, limit=50, offset=0):
    require_auth()
    limit, offset = page(limit, offset)
    company = get_company(company)
    filters = {"company": company}
    if status:
        filters["status"] = status
    rows = frappe.get_all("Job Requisition",
                          filters=filters,
                          fields=pick_fields("Job Requisition", [
                              "name","designation","department","company",
                              "no_of_positions","status","expected_compensation",
                              "creation",
                          ]),
                          order_by="creation desc",
                          limit_start=offset, limit_page_length=limit)
    return ok({"job_requisitions": rows},
              meta={"total": frappe.db.count("Job Requisition", filters)})


# ═══════════════════════════════════════════════════════════════════
# 10. TRAINING
# ═══════════════════════════════════════════════════════════════════

@frappe.whitelist()
def get_training_programs(limit=50, offset=0):
    require_auth()
    limit, offset = page(limit, offset)
    rows = frappe.get_all("Training Program",
                          fields=pick_fields("Training Program", [
                              "name","program_name","course_director",
                              "description","creation",
                          ]),
                          order_by="creation desc",
                          limit_start=offset, limit_page_length=limit)
    return ok({"training_programs": rows},
              meta={"total": frappe.db.count("Training Program")})


@frappe.whitelist()
def get_training_events(employee=None, status=None, limit=50, offset=0):
    require_auth()
    limit, offset = page(limit, offset)
    filters = {}
    if status:
        filters["status"] = status
    rows = frappe.get_all("Training Event",
                          filters=filters,
                          fields=pick_fields("Training Event", [
                              "name","event_name","training_program",
                              "trainer_name","location","start_time","end_time",
                              "status","has_certificate",
                          ]),
                          order_by="start_time desc",
                          limit_start=offset, limit_page_length=limit)
    return ok({"training_events": rows},
              meta={"total": frappe.db.count("Training Event", filters)})


@frappe.whitelist()
def get_training_results(employee=None, training_event=None, limit=50, offset=0):
    require_auth()
    limit, offset = page(limit, offset)
    filters = {}
    if employee:
        filters["employee"] = employee
    if training_event:
        filters["training_event"] = training_event
    rows = frappe.get_all("Training Result",
                          filters=filters,
                          fields=pick_fields("Training Result", [
                              "name","employee","employee_name","training_event",
                              "grade","comments","creation",
                          ]),
                          order_by="creation desc",
                          limit_start=offset, limit_page_length=limit)
    return ok({"training_results": rows},
              meta={"total": frappe.db.count("Training Result", filters)})


# ═══════════════════════════════════════════════════════════════════
# 11. EXPENSE CLAIMS & ADVANCES
# ═══════════════════════════════════════════════════════════════════

@frappe.whitelist()
def get_expense_claims(company=None, employee=None, status=None, limit=50, offset=0):
    require_auth()
    limit, offset = page(limit, offset)
    company = get_company(company)
    filters = {"company": company}
    if employee:
        filters["employee"] = employee
    if status:
        filters["approval_status"] = status

    fields = pick_fields("Expense Claim", [
        "name","employee","employee_name","expense_approver",
        "posting_date","total_claimed_amount","total_sanctioned_amount",
        "approval_status","docstatus","remark",
    ])
    rows = frappe.get_all("Expense Claim", filters=filters, fields=fields,
                          order_by="posting_date desc",
                          limit_start=offset, limit_page_length=limit)
    return ok({"expense_claims": rows},
              meta={"total": frappe.db.count("Expense Claim", filters)})


@frappe.whitelist()
def get_expense_claim(claim_id):
    require_auth()
    try:
        doc = frappe.get_doc("Expense Claim", claim_id)
        return ok({"expense_claim": doc.as_dict()})
    except frappe.DoesNotExistError:
        return fail(f"Expense Claim {claim_id!r} not found")


@frappe.whitelist()
def create_expense_claim(data=None, **kwargs):
    require_auth()
    p = parse_payload(data, **kwargs)
    doc = frappe.new_doc("Expense Claim")
    doc.employee          = p.get("employee")
    doc.expense_approver  = p.get("expense_approver")
    doc.posting_date      = p.get("posting_date") or nowdate()
    doc.company           = p.get("company") or get_company()
    doc.remark            = p.get("remark") or ""
    for exp in (p.get("expenses") or []):
        doc.append("expenses", {
            "expense_date":    exp.get("expense_date") or nowdate(),
            "expense_type":    exp.get("expense_type"),
            "description":     exp.get("description") or "",
            "amount":          flt(exp.get("amount") or 0),
            "sanctioned_amount": flt(exp.get("sanctioned_amount") or exp.get("amount") or 0),
        })
    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    return ok({"expense_claim": {"id": doc.name}}, "Expense claim created")


@frappe.whitelist()
def approve_expense_claim(claim_id):
    require_auth()
    try:
        doc = frappe.get_doc("Expense Claim", claim_id)
        doc.approval_status = "Approved"
        doc.save(ignore_permissions=True)
        doc.submit()
        frappe.db.commit()
        return ok({"expense_claim": {"id": doc.name, "status": "Approved"}}, "Expense claim approved")
    except Exception as e:
        return fail(str(e))


@frappe.whitelist()
def get_employee_advances(employee=None, company=None, status=None, limit=50, offset=0):
    require_auth()
    limit, offset = page(limit, offset)
    company = get_company(company)
    filters = {"company": company, "docstatus": 1}
    if employee:
        filters["employee"] = employee
    if status:
        filters["status"] = status
    rows = frappe.get_all("Employee Advance",
                          filters=filters,
                          fields=pick_fields("Employee Advance", [
                              "name","employee","employee_name","posting_date",
                              "purpose","advance_amount","paid_amount",
                              "claimed_amount","return_amount","status","currency",
                          ]),
                          order_by="posting_date desc",
                          limit_start=offset, limit_page_length=limit)
    return ok({"employee_advances": rows},
              meta={"total": frappe.db.count("Employee Advance", filters)})


@frappe.whitelist()
def create_employee_advance(data=None, **kwargs):
    require_auth()
    p = parse_payload(data, **kwargs)
    doc = frappe.new_doc("Employee Advance")
    doc.employee       = p.get("employee")
    doc.posting_date   = p.get("posting_date") or nowdate()
    doc.purpose        = p.get("purpose") or "Travel"
    doc.advance_amount = flt(p.get("advance_amount") or 0)
    doc.currency       = p.get("currency") or "ZAR"
    doc.company        = p.get("company") or get_company()
    doc.repay_from_salary = 1 if p.get("repay_from_salary") else 0
    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    return ok({"employee_advance": {"id": doc.name}}, "Employee advance created")


@frappe.whitelist()
def get_travel_requests(employee=None, status=None, limit=50, offset=0):
    require_auth()
    limit, offset = page(limit, offset)
    filters = {}
    if employee:
        filters["employee"] = employee
    if status:
        filters["approval_status"] = status
    rows = frappe.get_all("Travel Request",
                          filters=filters,
                          fields=pick_fields("Travel Request", [
                              "name","employee","employee_name","travel_type",
                              "departure_date","return_date","destination",
                              "travel_purpose","approval_status",
                          ]),
                          order_by="departure_date desc",
                          limit_start=offset, limit_page_length=limit)
    return ok({"travel_requests": rows},
              meta={"total": frappe.db.count("Travel Request", filters)})


# ═══════════════════════════════════════════════════════════════════
# 12. EMPLOYEE LIFECYCLE
# ═══════════════════════════════════════════════════════════════════

@frappe.whitelist()
def get_employee_onboardings(company=None, status=None, limit=50, offset=0):
    require_auth()
    limit, offset = page(limit, offset)
    company = get_company(company)
    filters = {"company": company}
    if status:
        filters["docstatus"] = 1 if status == "submitted" else 0
    rows = frappe.get_all("Employee Onboarding",
                          filters=filters,
                          fields=pick_fields("Employee Onboarding", [
                              "name","employee","employee_name","department",
                              "designation","date_of_joining","boarding_status",
                              "docstatus",
                          ]),
                          order_by="date_of_joining desc",
                          limit_start=offset, limit_page_length=limit)
    return ok({"onboardings": rows},
              meta={"total": frappe.db.count("Employee Onboarding", filters)})


@frappe.whitelist()
def get_employee_promotions(employee=None, company=None, limit=50, offset=0):
    require_auth()
    limit, offset = page(limit, offset)
    company = get_company(company)
    filters = {"company": company}
    if employee:
        filters["employee"] = employee
    rows = frappe.get_all("Employee Promotion",
                          filters=filters,
                          fields=pick_fields("Employee Promotion", [
                              "name","employee","employee_name","promotion_date","docstatus",
                          ]),
                          order_by="promotion_date desc",
                          limit_start=offset, limit_page_length=limit)
    return ok({"promotions": rows},
              meta={"total": frappe.db.count("Employee Promotion", filters)})


@frappe.whitelist()
def get_employee_separations(company=None, status=None, limit=50, offset=0):
    require_auth()
    limit, offset = page(limit, offset)
    company = get_company(company)
    filters = {"company": company}
    if status:
        filters["docstatus"] = 1 if status == "submitted" else 0
    rows = frappe.get_all("Employee Separation",
                          filters=filters,
                          fields=pick_fields("Employee Separation", [
                              "name","employee","employee_name","department",
                              "designation","separation_date","boarding_status",
                          ]),
                          order_by="separation_date desc",
                          limit_start=offset, limit_page_length=limit)
    return ok({"separations": rows},
              meta={"total": frappe.db.count("Employee Separation", filters)})


@frappe.whitelist()
def get_employee_transfers(employee=None, company=None, limit=50, offset=0):
    require_auth()
    limit, offset = page(limit, offset)
    company = get_company(company)
    filters = {"company": company}
    if employee:
        filters["employee"] = employee
    rows = frappe.get_all("Employee Transfer",
                          filters=filters,
                          fields=pick_fields("Employee Transfer", [
                              "name","employee","employee_name","transfer_date","docstatus",
                          ]),
                          order_by="transfer_date desc",
                          limit_start=offset, limit_page_length=limit)
    return ok({"transfers": rows},
              meta={"total": frappe.db.count("Employee Transfer", filters)})


@frappe.whitelist()
def get_exit_interviews(company=None, employee=None, status=None, limit=50, offset=0):
    require_auth()
    limit, offset = page(limit, offset)
    company = get_company(company)
    filters = {"company": company}
    if employee:
        filters["employee"] = employee
    if status:
        filters["status"] = status
    rows = frappe.get_all("Exit Interview",
                          filters=filters,
                          fields=pick_fields("Exit Interview", [
                              "name","employee","employee_name","date",
                              "status","interview_summary","resignation_letter_date",
                          ]),
                          order_by="date desc",
                          limit_start=offset, limit_page_length=limit)
    return ok({"exit_interviews": rows},
              meta={"total": frappe.db.count("Exit Interview", filters)})


@frappe.whitelist()
def get_employee_skill_map(employee):
    require_auth()
    try:
        doc = frappe.get_doc("Employee Skill Map", {"employee": employee})
        return ok({"skill_map": doc.as_dict()})
    except frappe.DoesNotExistError:
        return ok({"skill_map": None}, "No skill map found for this employee")


# ═══════════════════════════════════════════════════════════════════
# 13. FLEET MANAGEMENT
# ═══════════════════════════════════════════════════════════════════

@frappe.whitelist()
def get_vehicles(company=None, limit=50, offset=0):
    require_auth()
    limit, offset = page(limit, offset)
    rows = frappe.get_all("Vehicle",
                          fields=pick_fields("Vehicle", [
                              "name","license_plate","make","model","year",
                              "employee","last_odometer","fuel_type","color",
                          ]),
                          order_by="make asc",
                          limit_start=offset, limit_page_length=limit)
    return ok({"vehicles": rows},
              meta={"total": frappe.db.count("Vehicle")})


@frappe.whitelist()
def get_vehicle_logs(vehicle=None, employee=None, limit=50, offset=0):
    require_auth()
    limit, offset = page(limit, offset)
    filters = {}
    if vehicle:
        filters["license_plate"] = vehicle
    if employee:
        filters["employee"] = employee
    rows = frappe.get_all("Vehicle Log",
                          filters=filters,
                          fields=pick_fields("Vehicle Log", [
                              "name","license_plate","employee","date",
                              "odometer","fuel_qty","fuel_type","service_detail",
                          ]),
                          order_by="date desc",
                          limit_start=offset, limit_page_length=limit)
    return ok({"vehicle_logs": rows},
              meta={"total": frappe.db.count("Vehicle Log", filters)})


# ═══════════════════════════════════════════════════════════════════
# 14. EMPLOYEE REFERRALS
# ═══════════════════════════════════════════════════════════════════

@frappe.whitelist()
def get_employee_referrals(referrer=None, status=None, limit=50, offset=0):
    require_auth()
    limit, offset = page(limit, offset)
    filters = {}
    if referrer:
        filters["referrer"] = referrer
    if status:
        filters["status"] = status
    rows = frappe.get_all("Employee Referral",
                          filters=filters,
                          fields=pick_fields("Employee Referral", [
                              "name","full_name","email","referrer",
                              "status","date","job_title",
                          ]),
                          order_by="date desc",
                          limit_start=offset, limit_page_length=limit)
    return ok({"referrals": rows},
              meta={"total": frappe.db.count("Employee Referral", filters)})