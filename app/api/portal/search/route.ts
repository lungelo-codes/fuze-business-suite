import { NextResponse } from 'next/server'
import { erpList } from '@/lib/server/erpnext'

type Row = Record<string, unknown>

type SearchResult = {
  id: string
  title: string
  subtitle: string
  type: string
  href: string
  status?: string
}

const SEARCH_TARGETS: Array<{
  doctype: string
  type: string
  href: string
  fields: string[]
  titleField: string
  subtitleField: string
}> = [
  { doctype: 'Customer', type: 'Customer', href: '/portal/customers', fields: ['name', 'customer_name', 'email_id', 'mobile_no'], titleField: 'customer_name', subtitleField: 'email_id' },
  { doctype: 'Lead', type: 'Lead', href: '/portal/leads', fields: ['name', 'lead_name', 'company_name', 'status', 'email_id'], titleField: 'lead_name', subtitleField: 'company_name' },
  { doctype: 'Opportunity', type: 'Opportunity', href: '/portal/opportunities', fields: ['name', 'party_name', 'status', 'opportunity_amount'], titleField: 'party_name', subtitleField: 'status' },
  { doctype: 'Sales Invoice', type: 'Invoice', href: '/portal/invoices', fields: ['name', 'customer', 'status', 'grand_total'], titleField: 'name', subtitleField: 'customer' },
  { doctype: 'Quotation', type: 'Quote', href: '/portal/quotes', fields: ['name', 'party_name', 'status', 'grand_total'], titleField: 'name', subtitleField: 'party_name' },
  { doctype: 'Payment Entry', type: 'Payment', href: '/portal/payments', fields: ['name', 'party', 'payment_type', 'paid_amount'], titleField: 'name', subtitleField: 'party' },
  { doctype: 'Project', type: 'Project', href: '/portal/projects', fields: ['name', 'project_name', 'customer', 'status'], titleField: 'project_name', subtitleField: 'customer' },
  { doctype: 'Task', type: 'Task', href: '/portal/tasks', fields: ['name', 'subject', 'project', 'status'], titleField: 'subject', subtitleField: 'project' },
  { doctype: 'Employee', type: 'Employee', href: '/portal/employees', fields: ['name', 'employee_name', 'department', 'status'], titleField: 'employee_name', subtitleField: 'department' },
  { doctype: 'Issue', type: 'Support', href: '/portal/support', fields: ['name', 'subject', 'customer', 'status', 'priority'], titleField: 'subject', subtitleField: 'customer' },
  { doctype: 'Supplier', type: 'Supplier', href: '/portal/suppliers', fields: ['name', 'supplier_name', 'supplier_type'], titleField: 'supplier_name', subtitleField: 'supplier_type' },
  { doctype: 'Item', type: 'Item', href: '/portal/items', fields: ['name', 'item_name', 'item_group', 'item_code'], titleField: 'item_name', subtitleField: 'item_group' },
]

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const q = (searchParams.get('q') || '').trim().toLowerCase()
    const limit = Math.min(Number(searchParams.get('limit') || 5), 20)

    if (!q || q.length < 2) {
      return NextResponse.json({ data: [], query: q })
    }

    const results: SearchResult[] = []

    await Promise.allSettled(
      SEARCH_TARGETS.map(async (target) => {
        try {
          const rows = await erpList<Row>(target.doctype, {
            fields: target.fields,
            filters: [[target.titleField, 'like', `%${q}%`]],
            limit,
            orderBy: 'modified desc',
          })
          for (const row of rows) {
            results.push({
              id: String(row.name || ''),
              title: String(row[target.titleField] || row.name || ''),
              subtitle: String(row[target.subtitleField] || row.status || ''),
              type: target.type,
              href: `${target.href}?record=${encodeURIComponent(String(row.name || ''))}`,
              status: String(row.status || ''),
            })
          }
        } catch {}
      })
    )

    // Sort by relevance: exact matches first
    const sorted = results.sort((a, b) => {
      const aExact = a.title.toLowerCase() === q ? -1 : 0
      const bExact = b.title.toLowerCase() === q ? -1 : 0
      return aExact - bExact
    })

    return NextResponse.json({ data: sorted.slice(0, 30), query: q })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Search failed', data: [] },
      { status: 500 }
    )
  }
}
