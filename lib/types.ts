export type ComplianceKind = "VAT" | "PAYE" | "UIF" | "SDL" | "CIPC" | "BO";

export interface BaseRecord {
  [key: string]: unknown;
  name: string;
  modified?: string;
  owner?: string;
}

export interface CustomerRecord extends BaseRecord {
  customer_name?: string;
  customer_type?: string;
  customer_group?: string;
  territory?: string;
  mobile_no?: string;
  email_id?: string;
}

export interface InvoiceRecord extends BaseRecord {
  customer?: string;
  posting_date?: string;
  due_date?: string;
  grand_total?: number;
  outstanding_amount?: number;
  status?: string;
}

export interface QuoteRecord extends BaseRecord {
  party_name?: string;
  transaction_date?: string;
  valid_till?: string;
  grand_total?: number;
  status?: string;
}

export interface PaymentRecord extends BaseRecord {
  party?: string;
  party_type?: string;
  posting_date?: string;
  paid_amount?: number;
  payment_type?: string;
  status?: string;
}

export interface EmployeeRecord extends BaseRecord {
  employee_name?: string;
  department?: string;
  designation?: string;
  status?: string;
  company_email?: string;
}

export interface ItemRecord extends BaseRecord {
  item_name?: string;
  item_group?: string;
  stock_uom?: string;
  disabled?: number;
}

export interface SupplierRecord extends BaseRecord {
  supplier_name?: string;
  supplier_group?: string;
  supplier_type?: string;
}

export interface ProjectRecord extends BaseRecord {
  project_name?: string;
  status?: string;
  expected_start_date?: string;
  expected_end_date?: string;
  percent_complete?: number;
}

export interface TaskRecord extends BaseRecord {
  subject?: string;
  status?: string;
  priority?: string;
  exp_start_date?: string;
  exp_end_date?: string;
  project?: string;
}

export interface SupportTicket extends BaseRecord {
  subject?: string;
  issue_type?: string;
  status?: string;
  priority?: string;
  customer?: string;
  raised_by?: string;
  description?: string;
  opening_date?: string;
}

export interface CommunicationRecord extends BaseRecord {
  subject?: string;
  content?: string;
  sender?: string;
  communication_type?: string;
  creation?: string;
  reference_doctype?: string;
  reference_name?: string;
}

export interface AppointmentRecord extends BaseRecord {
  subject?: string;
  starts_on?: string;
  ends_on?: string;
  status?: string;
  event_type?: string;
  description?: string;
}

export interface ComplianceRecord extends BaseRecord {
  company?: string;
  status?: string;
  due_date?: string;
  submission_date?: string;
  return_year?: number;
  period?: string;
  amount_due?: number;
  total_due?: number;
  kind: ComplianceKind;
}

export interface DashboardData {
  customers: CustomerRecord[];
  invoices: InvoiceRecord[];
  quotes: QuoteRecord[];
  payments: PaymentRecord[];
  employees: EmployeeRecord[];
  items: ItemRecord[];
  projects: ProjectRecord[];
  tasks: TaskRecord[];
  support: SupportTicket[];
  appointments: AppointmentRecord[];
  chat: CommunicationRecord[];
  compliance: ComplianceRecord[];
}
