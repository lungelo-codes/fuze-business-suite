export type FieldType = "text" | "email" | "tel" | "number" | "date" | "datetime-local" | "select" | "textarea" | "checkbox";
export interface CrudField { name: string; label: string; type?: FieldType; required?: boolean; options?: string[]; placeholder?: string; hideOnTable?: boolean; readOnly?: boolean; linkTo?: string; }
export interface CrudModuleConfig { id: string; title: string; subtitle: string; doctype: string; nameField: string; listFields: string[]; tableFields: CrudField[]; formFields: CrudField[]; defaults?: Record<string, unknown>; submitEnabled?: boolean; }

const f = (name: string, label: string, type: FieldType = "text", required = false, options?: string[], placeholder?: string, linkTo?: string): CrudField => ({ name, label, type, required, options, placeholder, linkTo });
const l = (name: string, label: string, doctype: string, required = false, placeholder?: string): CrudField => f(name, label, "text", required, undefined, placeholder, doctype);
const ro = (name: string, label: string, type: FieldType = "text"): CrudField => ({ name, label, type, readOnly: true });
const d = (name: string, label: string, required = false) => f(name, label, "date", required);
const dt = (name: string, label: string, required = false) => f(name, label, "datetime-local", required);
const s = (name: string, label: string, options: string[], required = false) => f(name, label, "select", required, options);
const n = (name: string, label: string, required = false) => f(name, label, "number", required);
const txt = (name: string, label: string, required = false) => f(name, label, "textarea", required);
const today = () => new Date().toISOString().slice(0, 10);

export const CRUD_MODULES: Record<string, CrudModuleConfig> = {
  customers: {
    id: "customers", title: "Customers", subtitle: "Customer records for CRM, quotations, invoices and payments.", doctype: "Customer", nameField: "customer_name",
    listFields: ["name", "customer_name", "customer_type", "customer_group", "territory", "email_id", "mobile_no", "tax_id", "modified"],
    tableFields: [f("customer_name", "Customer"), f("customer_type", "Type"), f("customer_group", "Group"), f("territory", "Territory"), f("email_id", "Email", "email"), f("mobile_no", "Mobile", "tel"), f("tax_id", "Tax/VAT No")],
    formFields: [f("customer_name", "Customer Name", "text", true), s("customer_type", "Customer Type", ["Company", "Individual"], true), l("customer_group", "Customer Group", "Customer Group", true, "All Customer Groups"), l("territory", "Territory", "Territory", true, "All Territories"), f("email_id", "Email", "email"), f("mobile_no", "Mobile", "tel"), f("tax_id", "Tax/VAT Number")],
    defaults: { customer_type: "Company", customer_group: "All Customer Groups", territory: "All Territories" },
  },

  contacts: {
    id: "contacts", title: "Contacts", subtitle: "People linked to customers, suppliers, leads and daily communication.", doctype: "Contact", nameField: "first_name",
    listFields: ["name", "first_name", "last_name", "email_id", "phone", "mobile_no", "company_name", "modified"],
    tableFields: [f("first_name", "First Name"), f("last_name", "Last Name"), f("email_id", "Email", "email"), f("phone", "Phone", "tel"), f("mobile_no", "Mobile", "tel"), f("company_name", "Company")],
    formFields: [f("first_name", "First Name", "text", true), f("last_name", "Last Name"), f("email_id", "Email", "email"), f("phone", "Phone", "tel"), f("mobile_no", "Mobile / WhatsApp", "tel"), f("company_name", "Company Name"), txt("notes", "Notes")],
    defaults: {},
  },
  suppliers: {
    id: "suppliers", title: "Suppliers", subtitle: "Supplier records for buying and procurement.", doctype: "Supplier", nameField: "supplier_name",
    listFields: ["name", "supplier_name", "supplier_type", "supplier_group", "country", "tax_id", "modified"],
    tableFields: [f("supplier_name", "Supplier"), f("supplier_type", "Type"), f("supplier_group", "Group"), f("country", "Country"), f("tax_id", "Tax/VAT No")],
    formFields: [f("supplier_name", "Supplier Name", "text", true), s("supplier_type", "Supplier Type", ["Company", "Individual", "Partnership"], true), l("supplier_group", "Supplier Group", "Supplier Group", true, "All Supplier Groups"), f("country", "Country", "text", false, undefined, "South Africa"), f("tax_id", "Tax/VAT Number")],
    defaults: { supplier_type: "Company", supplier_group: "All Supplier Groups", country: "South Africa" },
  },
  items: {
    id: "items", title: "Items & Services", subtitle: "Item and service records used on quotations, invoices, sales orders and purchase orders.", doctype: "Item", nameField: "item_name",
    listFields: ["name", "item_code", "item_name", "item_group", "stock_uom", "is_stock_item", "disabled", "modified"],
    tableFields: [f("item_code", "Item Code"), f("item_name", "Item Name"), f("item_group", "Group"), f("stock_uom", "UOM"), f("is_stock_item", "Stock Item", "checkbox"), f("disabled", "Disabled", "checkbox")],
    formFields: [f("item_code", "Item Code", "text", true), f("item_name", "Item Name", "text", true), l("item_group", "Item Group", "Item Group", true, "Services"), l("stock_uom", "Stock UOM", "UOM", true, "Nos"), f("is_stock_item", "Maintain Stock", "checkbox"), f("disabled", "Disabled", "checkbox"), txt("description", "Description")],
    defaults: { item_group: "Services", stock_uom: "Nos", is_stock_item: 0, disabled: 0 },
  },
  leads: {
    id: "leads", title: "Leads", subtitle: "Lead records for sales qualification.", doctype: "Lead", nameField: "lead_name",
    listFields: ["name", "lead_name", "company_name", "status", "source", "email_id", "mobile_no", "territory", "modified"],
    tableFields: [f("lead_name", "Lead"), f("company_name", "Company"), f("status", "Status"), f("source", "Source"), f("email_id", "Email", "email"), f("mobile_no", "Mobile", "tel"), f("territory", "Territory")],
    formFields: [f("lead_name", "Lead Name", "text", true), f("company_name", "Company"), s("status", "Status", ["Lead", "Open", "Replied", "Opportunity", "Quotation", "Lost Quotation", "Interested", "Converted", "Do Not Contact"]), s("source", "Source", ["Website", "Referral", "Advertisement", "Cold Calling", "Email", "Campaign", "Other"]), f("email_id", "Email", "email"), f("mobile_no", "Mobile", "tel"), l("territory", "Territory", "Territory", false, "All Territories"), txt("notes", "Notes")],
    defaults: { status: "Lead", territory: "All Territories" },
  },
  opportunities: {
    id: "opportunities", title: "Opportunities", subtitle: "Opportunity pipeline records linked to leads, customers or prospects.", doctype: "Opportunity", nameField: "party_name",
    listFields: ["name", "opportunity_from", "party_name", "status", "sales_stage", "opportunity_amount", "expected_closing", "probability", "modified"],
    tableFields: [f("party_name", "Party"), f("opportunity_from", "From"), f("status", "Status"), f("sales_stage", "Stage"), n("opportunity_amount", "Amount"), d("expected_closing", "Expected Close"), n("probability", "Probability %")],
    formFields: [s("opportunity_from", "Opportunity From", ["Lead", "Customer", "Prospect"], true), f("party_name", "Party Name", "text", true), s("status", "Status", ["Open", "Quotation", "Converted", "Lost", "Replied", "Closed"]), s("sales_stage", "Sales Stage", ["Prospecting", "Qualification", "Needs Analysis", "Proposal/Price Quote", "Negotiation/Review", "Closed Won", "Closed Lost"]), n("opportunity_amount", "Opportunity Amount"), d("expected_closing", "Expected Closing"), n("probability", "Probability %"), txt("description", "Description")],
    defaults: { opportunity_from: "Lead", status: "Open", sales_stage: "Prospecting", probability: 10 },
  },
  quotes: tx("quotes", "Quotations", "Quotation", "quotation_to", "party_name", "Quotation To", ["Customer", "Lead", "Prospect"], "Quotation records with customer, date and line-item fields."),
  "sales-orders": tx("sales-orders", "Sales Orders", "Sales Order", "customer", "customer", "Customer", undefined, "Sales order records for confirmed customer orders."),
  invoices: tx("invoices", "Sales Invoices", "Sales Invoice", "customer", "customer", "Customer", undefined, "Sales invoice records with posting date, due date and line-item fields."),
  "purchase-orders": tx("purchase-orders", "Purchase Orders", "Purchase Order", "supplier", "supplier", "Supplier", undefined, "Purchase order records for supplier procurement."),
  payments: {
    id: "payments", title: "Payment Entries", subtitle: "Payment records. Accounts must match the company chart of accounts.", doctype: "Payment Entry", nameField: "name", submitEnabled: true,
    listFields: ["name", "payment_type", "party_type", "party", "posting_date", "paid_amount", "received_amount", "mode_of_payment", "reference_no", "docstatus", "modified"],
    tableFields: [f("name", "Payment"), f("payment_type", "Type"), f("party_type", "Party Type"), f("party", "Party"), d("posting_date", "Date"), n("paid_amount", "Paid"), n("received_amount", "Received"), f("mode_of_payment", "Mode")],
    formFields: [s("payment_type", "Payment Type", ["Receive", "Pay", "Internal Transfer"], true), s("party_type", "Party Type", ["Customer", "Supplier", "Employee"], true), l("party", "Party", "Customer", true), d("posting_date", "Posting Date"), l("mode_of_payment", "Mode of Payment", "Mode of Payment", false, "Bank Transfer"), l("paid_from", "Paid From Account", "Account"), l("paid_to", "Paid To Account", "Account"), n("paid_amount", "Paid Amount", true), n("received_amount", "Received Amount"), f("reference_no", "Reference No"), d("reference_date", "Reference Date")],
    defaults: { payment_type: "Receive", party_type: "Customer", mode_of_payment: "Bank Transfer" },
  },
  tasks: {
    id: "tasks", title: "Tasks", subtitle: "Task records with project, status, priority and dates.", doctype: "Task", nameField: "subject",
    listFields: ["name", "subject", "project", "status", "priority", "exp_start_date", "exp_end_date", "modified"],
    tableFields: [f("subject", "Task"), l("project", "Project", "Project"), f("status", "Status"), f("priority", "Priority"), d("exp_start_date", "Start"), d("exp_end_date", "End")],
    formFields: [f("subject", "Subject", "text", true), l("project", "Project", "Project"), s("status", "Status", ["Open", "Working", "Pending Review", "Overdue", "Template", "Completed", "Cancelled"]), s("priority", "Priority", ["Low", "Medium", "High", "Urgent"]), d("exp_start_date", "Expected Start Date"), d("exp_end_date", "Expected End Date"), txt("description", "Description")],
    defaults: { status: "Open", priority: "Medium" },
  },
  projects: {
    id: "projects", title: "Projects", subtitle: "Project records for customer work and delivery tracking.", doctype: "Project", nameField: "project_name",
    listFields: ["name", "project_name", "customer", "status", "expected_start_date", "expected_end_date", "percent_complete", "modified"],
    tableFields: [f("project_name", "Project"), l("customer", "Customer", "Customer"), f("status", "Status"), d("expected_start_date", "Start"), d("expected_end_date", "End"), n("percent_complete", "Complete %")],
    formFields: [f("project_name", "Project Name", "text", true), l("customer", "Customer", "Customer"), s("status", "Status", ["Open", "Completed", "Cancelled"]), d("expected_start_date", "Expected Start Date"), d("expected_end_date", "Expected End Date"), s("priority", "Priority", ["Low", "Medium", "High"]), txt("notes", "Notes")],
    defaults: { status: "Open", priority: "Medium" },
  },
  appointments: {
    id: "appointments", title: "Appointments", subtitle: "Calendar appointment and meeting records.", doctype: "Event", nameField: "subject",
    listFields: ["name", "subject", "starts_on", "ends_on", "event_type", "status", "modified"],
    tableFields: [f("subject", "Subject"), dt("starts_on", "Start"), dt("ends_on", "End"), f("event_type", "Type"), f("status", "Status")],
    formFields: [f("subject", "Subject", "text", true), dt("starts_on", "Starts On", true), dt("ends_on", "Ends On"), s("event_type", "Event Type", ["Private", "Public"]), s("status", "Status", ["Open", "Closed", "Cancelled"]), txt("description", "Description")],
    defaults: { event_type: "Private", status: "Open" },
  },
  employees: {
    id: "employees", title: "Employees", subtitle: "Employee records used by HR, attendance, leave and payroll.", doctype: "Employee", nameField: "employee_name",
    listFields: ["name", "employee_name", "first_name", "last_name", "department", "designation", "status", "company_email", "cell_number", "date_of_joining", "modified"],
    tableFields: [f("employee_name", "Employee"), l("department", "Department", "Department"), l("designation", "Designation", "Designation"), f("status", "Status"), f("company_email", "Email", "email"), f("cell_number", "Cell", "tel"), d("date_of_joining", "Joined")],
    formFields: [f("first_name", "First Name", "text", true), f("last_name", "Last Name"), s("gender", "Gender", ["Male", "Female", "Other"]), d("date_of_birth", "Date of Birth"), d("date_of_joining", "Date of Joining", true), l("department", "Department", "Department"), l("designation", "Designation", "Designation"), s("status", "Status", ["Active", "Inactive", "Suspended", "Left"]), f("company_email", "Company Email", "email"), f("cell_number", "Cell Number", "tel")],
    defaults: { status: "Active" },
  },
  attendance: {
    id: "attendance", title: "Attendance", subtitle: "Attendance records linked to employees.", doctype: "Attendance", nameField: "employee_name", submitEnabled: true,
    listFields: ["name", "employee", "employee_name", "attendance_date", "status", "working_hours", "docstatus", "modified"],
    tableFields: [f("employee", "Employee ID"), f("employee_name", "Employee"), d("attendance_date", "Date"), f("status", "Status"), n("working_hours", "Hours")],
    formFields: [l("employee", "Employee", "Employee", true), d("attendance_date", "Attendance Date", true), s("status", "Status", ["Present", "Absent", "On Leave", "Half Day", "Work From Home"], true), n("working_hours", "Working Hours")],
    defaults: { status: "Present" },
  },
  leave: {
    id: "leave", title: "Leave Applications", subtitle: "Leave application records linked to employees and leave types.", doctype: "Leave Application", nameField: "employee_name", submitEnabled: true,
    listFields: ["name", "employee", "employee_name", "leave_type", "from_date", "to_date", "total_leave_days", "status", "docstatus", "modified"],
    tableFields: [f("employee_name", "Employee"), f("leave_type", "Leave Type"), d("from_date", "From"), d("to_date", "To"), n("total_leave_days", "Days"), f("status", "Status")],
    formFields: [l("employee", "Employee", "Employee", true), l("leave_type", "Leave Type", "Leave Type", true), d("from_date", "From Date", true), d("to_date", "To Date", true), f("half_day", "Half Day", "checkbox"), txt("description", "Reason"), s("status", "Status", ["Open", "Approved", "Rejected", "Cancelled"])],
    defaults: { status: "Open", half_day: 0 },
  },
  payroll: {
    id: "payroll", title: "Salary Slips", subtitle: "Salary slip records. Creation requires payroll setup values.", doctype: "Salary Slip", nameField: "employee_name", submitEnabled: true,
    listFields: ["name", "employee", "employee_name", "start_date", "end_date", "gross_pay", "net_pay", "status", "docstatus", "modified"],
    tableFields: [f("employee", "Employee ID"), f("employee_name", "Employee"), d("start_date", "Start"), d("end_date", "End"), ro("gross_pay", "Gross", "number"), ro("net_pay", "Net", "number"), f("status", "Status")],
    formFields: [l("employee", "Employee", "Employee", true), d("start_date", "Start Date", true), d("end_date", "End Date", true), d("posting_date", "Posting Date"), s("payroll_frequency", "Payroll Frequency", ["Monthly", "Fortnightly", "Bimonthly", "Weekly", "Daily"])],
    defaults: { payroll_frequency: "Monthly" },
  },
  support: simple("support", "Support Tickets", "Issue", "subject", ["subject", "customer", "raised_by", "priority", "status", "issue_type"], [f("subject", "Subject", "text", true), l("customer", "Customer", "Customer"), f("raised_by", "Raised By", "email"), s("priority", "Priority", ["Low", "Medium", "High", "Urgent"]), s("status", "Status", ["Open", "Replied", "On Hold", "Resolved", "Closed"]), f("issue_type", "Issue Type"), txt("description", "Description", true)], { priority: "Medium", status: "Open" }, "Customer support ticket records."),
  chat: simple("chat", "Communications", "Communication", "subject", ["subject", "sender", "recipients", "communication_type", "sent_or_received", "status"], [f("subject", "Subject", "text", true), f("sender", "Sender", "email"), f("recipients", "Recipients"), s("communication_type", "Communication Type", ["Communication", "Email", "Chat", "Phone", "SMS", "Other"]), s("sent_or_received", "Sent or Received", ["Sent", "Received"]), txt("content", "Content", true), s("status", "Status", ["Open", "Replied", "Closed", "Linked"])], { communication_type: "Communication", sent_or_received: "Sent", status: "Open" }, "Communication records."),
  compliance: simple("compliance", "Compliance Calendar", "Fuze Compliance Calendar", "title", ["title", "category", "sub_category", "priority", "due_date", "status", "completed_by"], [f("title", "Title", "text", true), s("category", "Category", ["SARS", "CIPC", "UIF", "Department of Labour", "Other"], true), s("sub_category", "Sub-Category", ["EMP201", "VAT201", "EMP501", "ITR14", "Annual Return", "UI-19", "Other"]), s("priority", "Priority", ["High", "Medium", "Low"]), d("due_date", "Due Date", true), s("status", "Status", ["Pending", "In Progress", "Completed", "Overdue", "Not Applicable"]), f("reference_url", "Reference URL"), txt("description", "Description"), d("completed_date", "Completed Date"), l("completed_by", "Completed By", "User"), txt("notes", "Notes")], { status: "Pending", priority: "Medium" }, "SARS, CIPC, UIF and labour compliance calendar."),
  "compliance-reminders": simple("compliance-reminders", "Compliance Reminders", "Fuze Compliance Reminder", "title", ["title", "compliance_item", "reminder_date", "days_before_due", "sent", "sent_at"], [l("compliance_item", "Compliance Item", "Fuze Compliance Calendar", true), f("title", "Title", "text", true), d("reminder_date", "Reminder Date", true), n("days_before_due", "Days Before Due"), f("sent", "Reminder Sent", "checkbox"), f("sent_to", "Sent To Emails"), dt("sent_at", "Sent At")], { sent: 0 }, "Automated reminders linked to compliance calendar items."),
  vat: simple("vat", "VAT Returns", "Fuze VAT Return", "name", ["company", "status", "from_date", "to_date", "submission_date", "output_vat", "input_vat", "net_vat", "vat_payable", "vat_refundable"], [l("company", "Company", "Company", true), s("status", "Status", ["Draft", "Submitted to SARS", "Payment Made", "Refund Received", "Cancelled"]), d("from_date", "From Date", true), d("to_date", "To Date", true), d("submission_date", "Filed Date"), n("total_sales", "Total Sales incl. VAT"), n("output_vat", "Output VAT Collected"), n("sales_count", "Invoices Count"), n("total_purchases", "Total Purchases incl. VAT"), n("input_vat", "Input VAT Claimable"), n("purchases_count", "Bills Count"), n("net_vat", "Net VAT"), n("vat_payable", "VAT Payable to SARS"), n("vat_refundable", "VAT Refundable from SARS"), f("efiling_reference", "eFiling Reference Number"), f("payment_reference", "Payment Reference"), txt("filing_notes", "Notes")], { status: "Draft" }, "VAT201-style VAT return records."),
  paye: simple("paye", "PAYE Returns", "Fuze PAYE Return", "name", ["company", "month", "year", "status", "employee_count", "due_date", "total_paye", "total_emp201"], [l("company", "Company", "Company", true), n("month", "Month", true), n("year", "Year", true), s("status", "Status", ["Draft", "Submitted to SARS", "Payment Made", "Cancelled"]), n("employee_count", "Employees"), d("due_date", "Due Date"), d("submission_date", "Submitted Date"), n("total_gross", "Total Gross Remuneration"), n("total_paye", "Total PAYE"), n("total_uif_employee", "UIF Employee Contribution"), n("total_uif_employer", "UIF Employer Contribution"), n("total_sdl", "SDL"), n("total_emp201", "Total EMP201 Payable"), f("payment_reference", "SARS Payment Reference"), txt("notes", "Notes")], { status: "Draft" }, "PAYE / EMP201 return records."),
  uif: simple("uif", "UIF Declarations", "Fuze UIF Declaration", "name", ["company", "declaration_month", "declaration_year", "status", "due_date", "employee_count", "total_uif"], [l("company", "Company", "Company", true), n("declaration_month", "Month", true), n("declaration_year", "Year", true), f("uif_reference", "UIF Reference Number"), s("status", "Status", ["Draft", "Submitted", "Cancelled"]), d("submission_date", "Submitted Date"), d("due_date", "Due Date"), n("employee_count", "Number of Employees Declared"), n("total_uif_employee", "Total UIF Employee"), n("total_uif_employer", "Total UIF Employer"), n("total_uif", "Total UIF Contribution"), txt("declaration_notes", "Notes")], { status: "Draft" }, "UIF declaration records."),
  sdl: simple("sdl", "SDL Declarations", "Fuze SDL Declaration", "name", ["company", "declaration_month", "declaration_year", "status", "submission_date", "total_leviable_amount", "total_sdl"], [l("company", "Company", "Company", true), n("declaration_month", "Month", true), n("declaration_year", "Year", true), f("sdl_reference", "SDL Reference Number"), s("status", "Status", ["Draft", "Submitted", "Cancelled"]), d("submission_date", "Submitted Date"), n("total_leviable_amount", "Total Leviable Amount"), n("sdl_rate", "SDL Rate"), n("total_sdl", "Total SDL Payable"), txt("notes", "Notes")], { status: "Draft" }, "SDL declaration records."),
  "sars-profile": simple("sars-profile", "SARS Profile", "Fuze SARS Profile", "company", ["company", "income_tax_ref", "vat_number", "paye_ref", "uif_ref", "sdl_ref", "efiling_username"], [l("company", "Company", "Company", true), f("income_tax_ref", "Income Tax Reference Number"), f("vat_number", "VAT Registration Number"), f("paye_ref", "PAYE Reference Number"), f("uif_ref", "UIF Reference Number"), f("sdl_ref", "SDL Reference Number"), f("efiling_username", "eFiling Username"), txt("efiling_notes", "Notes")], {}, "SARS and eFiling profile details."),
  "company-compliance": simple("company-compliance", "Company Compliance", "Fuze Company Compliance", "company", ["company", "overall_status", "last_reviewed", "vat_compliant", "paye_compliant", "annual_return_compliant", "uif_registered"], [l("company", "Company", "Company", true), s("overall_status", "Overall Compliance Status", ["Compliant", "Partially Compliant", "Non-Compliant", "Unknown"]), d("last_reviewed", "Last Reviewed"), f("vat_compliant", "VAT Returns Up To Date", "checkbox"), f("paye_compliant", "PAYE/UIF/SDL Up To Date", "checkbox"), f("income_tax_compliant", "Income Tax Returns Filed", "checkbox"), f("annual_return_compliant", "CIPC Annual Return Filed", "checkbox"), f("beneficial_ownership_filed", "Beneficial Ownership Register Filed", "checkbox"), f("uif_registered", "UIF Registered", "checkbox"), f("uif_declarations_current", "UI-19 Declarations Current", "checkbox"), txt("compliance_notes", "Compliance Notes")], { overall_status: "Unknown" }, "Overall company compliance health."),
  cipc: simple("cipc", "CIPC Annual Returns", "Fuze CIPC Annual Return", "company", ["company", "return_year", "registration_number", "due_date", "status", "cipc_fee", "cipc_reference"], [l("company", "Company", "Company", true), n("return_year", "Return Year", true), f("registration_number", "CIPC Registration Number"), d("anniversary_date", "Company Anniversary Date"), d("due_date", "Due Date"), s("status", "Status", ["Draft", "Pending Payment", "Submitted", "Cancelled"]), d("submission_date", "Filed Date"), n("annual_turnover", "Annual Turnover Latest"), n("cipc_fee", "CIPC Annual Return Fee"), f("payment_reference", "Payment Reference"), f("cipc_reference", "CIPC Filing Reference"), l("filed_by", "Filed By", "User"), txt("notes", "Notes")], { status: "Draft" }, "CIPC annual return tracking."),
  "business-profile": simple("business-profile", "Business Profile", "Fuze Business Profile", "trading_name", ["company", "trading_name", "registration_number", "industry", "vat_registered", "phone", "email", "city"], [l("company", "Company", "Company", true), f("trading_name", "Trading Name", "text", true), f("registration_number", "CIPC Registration Number"), f("industry", "Industry"), s("financial_year_end", "Financial Year End", ["January","February","March","April","May","June","July","August","September","October","November","December"]), l("base_currency", "Base Currency", "Currency"), f("vat_registered", "VAT Registered", "checkbox"), d("vat_registration_date", "VAT Registration Date"), f("phone", "Phone", "tel"), f("email", "Email", "email"), f("website", "Website"), f("street_address", "Street Address"), f("suburb", "Suburb"), f("city", "City"), s("province", "Province", ["Eastern Cape","Free State","Gauteng","KwaZulu-Natal","Limpopo","Mpumalanga","Northern Cape","North West","Western Cape"]), f("postal_code", "Postal Code"), f("bank_name", "Bank Name"), f("account_number", "Account Number"), f("branch_code", "Branch Code")], {}, "Business profile, banking, VAT and registered address."),
  "audit-trail": simple("audit-trail", "Audit Trail", "Fuze Audit Log", "action", ["user", "action", "timestamp", "reference_doctype", "reference_name", "ip_address"], [l("user", "User", "User"), f("action", "Action", "text", true), dt("timestamp", "Timestamp"), f("reference_doctype", "Reference DocType"), f("reference_name", "Reference Name"), f("ip_address", "IP Address"), txt("details", "Details")], {}, "Business Suite audit log records."),
  contracts: simple("contracts", "Contracts", "Contract", "name", ["name", "party_type", "party_name", "start_date", "end_date", "status"], [s("party_type", "Party Type", ["Customer", "Supplier"], true), f("party_name", "Party Name", "text", true), d("start_date", "Start Date"), d("end_date", "End Date"), s("status", "Status", ["Unsigned", "Active", "Inactive"]), txt("contract_terms", "Contract Terms")], { party_type: "Customer", status: "Unsigned" }, "Contract records.", true),
  campaigns: simple("campaigns", "Campaigns", "Campaign", "campaign_name", ["campaign_name", "status", "campaign_schedules"], [f("campaign_name", "Campaign Name", "text", true), s("status", "Status", ["Planned", "In Progress", "Completed", "Cancelled"]), txt("description", "Description")], { status: "Planned" }, "Campaign records."),
};

function simple(id: string, title: string, doctype: string, nameField: string, names: string[], formFields: CrudField[], defaults: Record<string, unknown>, subtitle: string, submitEnabled = false): CrudModuleConfig {
  return { id, title, subtitle, doctype, nameField, listFields: ["name", ...names.filter((x) => x !== "name"), "modified"], tableFields: names.map((name) => f(name, titleCase(name))), formFields, defaults, submitEnabled };
}
function tx(id: string, title: string, doctype: string, partyField: string, formPartyField: string, partyLabel: string, partyOptions?: string[], subtitle = ""): CrudModuleConfig {
  const isInv = id === "invoices", isPO = id === "purchase-orders", isSO = id === "sales-orders", isQuote = id === "quotes";
  const date1 = isInv ? "posting_date" : "transaction_date";
  const date2 = isInv ? "due_date" : isPO ? "schedule_date" : isSO ? "delivery_date" : "valid_till";
  const listParty = isQuote ? "party_name" : partyField;
  return { id, title, subtitle, doctype, nameField: "name", submitEnabled: true,
    listFields: ["name", ...(isQuote ? ["quotation_to"] : []), listParty, date1, date2, "grand_total", ...(isInv ? ["outstanding_amount"] : []), "status", "docstatus", "modified"],
    tableFields: [f("name", title.replace(/s$/, "")), ...(isQuote ? [f("quotation_to", "Quote To")] : []), f(listParty, partyLabel), d(date1, titleCase(date1)), d(date2, titleCase(date2)), ro("grand_total", "Total", "number"), ...(isInv ? [ro("outstanding_amount", "Outstanding", "number")] : []), f("status", "Status")],
    formFields: [ ...(partyOptions ? [s("quotation_to", "Quotation To", partyOptions, true)] : []), (formPartyField === "supplier" ? l(formPartyField, partyLabel, "Supplier", true) : l(formPartyField, partyLabel, partyOptions ? "Lead" : "Customer", true)), d(date1, titleCase(date1)), d(date2, titleCase(date2)), l("item_code", "Item Code", "Item", true, "Consulting Service"), txt("description", "Item Description"), n("qty", "Qty"), n("rate", "Rate") ],
    defaults: { ...(isQuote ? { quotation_to: "Customer" } : {}), qty: 1, rate: 0 } };
}
function titleCase(value: string) { return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()); }
export function getCrudConfig(module: string): CrudModuleConfig | null { return CRUD_MODULES[module] ?? null; }
const itemModules = new Set(["quotes", "sales-orders", "invoices", "purchase-orders"]);
const itemFields = new Set(["item_code", "qty", "rate", "description"]);
function checkbox(value: unknown): 0 | 1 { return value === true || value === 1 || value === "1" || value === "true" ? 1 : 0; }
function line(values: Record<string, unknown>) { const item_code = String(values.item_code || "Consulting Service"); return { item_code, description: String(values.description || item_code), qty: Number(values.qty || 1), rate: Number(values.rate || 0), uom: "Nos" }; }
export function toERPDoc(module: string, values: Record<string, unknown>): Record<string, unknown> {
  const cfg = getCrudConfig(module); if (!cfg) throw new Error(`Unknown module: ${module}`);
  const doc: Record<string, unknown> = { ...(cfg.defaults ?? {}) };
  for (const field of cfg.formFields) { if (itemModules.has(module) && itemFields.has(field.name)) continue; const value = values[field.name]; if (value !== undefined && value !== "") doc[field.name] = field.type === "checkbox" ? checkbox(value) : field.type === "number" ? Number(value || 0) : value; }
  if (module === "customers") Object.assign(doc, { customer_type: doc.customer_type || "Company", customer_group: doc.customer_group || "All Customer Groups", territory: doc.territory || "All Territories" });
  if (module === "suppliers") Object.assign(doc, { supplier_type: doc.supplier_type || "Company", supplier_group: doc.supplier_group || "All Supplier Groups", country: doc.country || "South Africa" });
  if (module === "items") Object.assign(doc, { item_name: doc.item_name || doc.item_code, item_group: doc.item_group || "Services", stock_uom: doc.stock_uom || "Nos", is_stock_item: checkbox(doc.is_stock_item ?? 0), disabled: checkbox(doc.disabled ?? 0) });
  if (module === "quotes") Object.assign(doc, { quotation_to: doc.quotation_to || "Customer", transaction_date: doc.transaction_date || today(), valid_till: doc.valid_till || today(), currency: doc.currency || "ZAR", conversion_rate: doc.conversion_rate || 1, selling_price_list: doc.selling_price_list || "Standard Selling", price_list_currency: doc.price_list_currency || "ZAR", plc_conversion_rate: doc.plc_conversion_rate || 1, items: [line(values)] });
  if (module === "sales-orders") Object.assign(doc, { transaction_date: doc.transaction_date || today(), delivery_date: doc.delivery_date || today(), currency: doc.currency || "ZAR", conversion_rate: doc.conversion_rate || 1, selling_price_list: doc.selling_price_list || "Standard Selling", price_list_currency: doc.price_list_currency || "ZAR", plc_conversion_rate: doc.plc_conversion_rate || 1, items: [line(values)] });
  if (module === "invoices") Object.assign(doc, { posting_date: doc.posting_date || today(), due_date: doc.due_date || doc.posting_date || today(), currency: doc.currency || "ZAR", conversion_rate: doc.conversion_rate || 1, selling_price_list: doc.selling_price_list || "Standard Selling", price_list_currency: doc.price_list_currency || "ZAR", plc_conversion_rate: doc.plc_conversion_rate || 1, items: [line(values)] });
  if (module === "purchase-orders") Object.assign(doc, { transaction_date: doc.transaction_date || today(), schedule_date: doc.schedule_date || today(), items: [line(values)] });
  if (module === "payments") Object.assign(doc, { posting_date: doc.posting_date || today(), reference_date: doc.reference_date || doc.posting_date || today(), received_amount: doc.received_amount || doc.paid_amount });
  if (module === "employees") doc.date_of_joining = doc.date_of_joining || today();
  if (module === "attendance") doc.attendance_date = doc.attendance_date || today();
  if (module === "payroll") doc.posting_date = doc.posting_date || today();
  return doc;
}
