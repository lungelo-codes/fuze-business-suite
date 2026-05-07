import { NextResponse } from 'next/server'
import { erpList, BusinessSuiteError } from '@/lib/server/erpnext'

const LABEL_FIELDS: Record<string, string[]> = {
  Customer: ['name', 'customer_name'], Supplier: ['name', 'supplier_name'], Item: ['name', 'item_name', 'item_code'], Employee: ['name', 'employee_name'], Project: ['name', 'project_name'], Account: ['name', 'account_name'], 'Mode of Payment': ['name'], 'Customer Group': ['name', 'customer_group_name'], 'Supplier Group': ['name', 'supplier_group_name'], Territory: ['name', 'territory_name'], 'Item Group': ['name', 'item_group_name'], UOM: ['name', 'uom_name'], Department: ['name', 'department_name'], Designation: ['name', 'designation_name'], 'Leave Type': ['name'], Lead: ['name', 'lead_name', 'company_name'],
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const doctype = searchParams.get('doctype') || ''
    if (!doctype) return NextResponse.json({ error: 'Missing doctype' }, { status: 400 })
    const fields = LABEL_FIELDS[doctype] || ['name']
    const rows = await erpList<Record<string, unknown>>(doctype, { fields, limit: 100, orderBy: 'modified desc' })
    const data = rows.map((row) => {
      const value = String(row.name || '')
      const label = fields.map((field) => row[field]).filter(Boolean).join(' · ') || value
      return { value, label }
    }).filter((row) => row.value)
    return NextResponse.json({ data })
  } catch (e) {
    return NextResponse.json({ data: [], error: e instanceof Error ? e.message : 'Could not load options' }, { status: e instanceof BusinessSuiteError ? e.status : 500 })
  }
}
