import { NextResponse } from 'next/server'
import { getCrudConfig } from '@/lib/crudConfig'
import { getERPNextBaseUrl } from '@/lib/server/erpnext'

// Default print formats per ERPNext doctype.
// ERPNext ships these out of the box; Frappe apps add their own.
const DEFAULT_FORMATS: Record<string, string> = {
  'Sales Invoice':          'Sales Invoice Standard',
  'Quotation':              'Quotation Standard',
  'Sales Order':            'Sales Order Standard',
  'Purchase Order':         'Purchase Order Standard',
  'Delivery Note':          'Delivery Note Standard',
  'Purchase Receipt':       'Purchase Receipt Standard',
  'Payment Entry':          'Payment Entry Standard',
  'Salary Slip':            'Salary Slip Standard',
  'Leave Application':      'Leave Application Standard',
  'Attendance':             'Attendance Standard',
  'Employee':               'Employee Standard',
  'HD Ticket':              'HD Ticket Standard',
  'Material Request':       'Material Request Standard',
  'Supplier Quotation':     'Supplier Quotation Standard',
  'Request for Quotation':  'Request for Quotation Standard',
}

export async function GET(
  req: Request,
  { params }: { params: { module: string; id: string } }
) {
  try {
    const config = getCrudConfig(params.module)
    if (!config) {
      return NextResponse.json({ error: 'Unknown module' }, { status: 404 })
    }

    const { searchParams } = new URL(req.url)
    const format = searchParams.get('format') || DEFAULT_FORMATS[config.doctype] || 'Standard'
    const letterhead = searchParams.get('letterhead') || ''

    const erpnextUrl = getERPNextBaseUrl()
    const qs = new URLSearchParams({
      doctype: config.doctype,
      name: params.id,
      format,
      trigger_print: '0',
      no_letterhead: letterhead ? '0' : '1',
    })
    if (letterhead) qs.set('letterhead', letterhead)

    return NextResponse.json({
      url: `${erpnextUrl}/printview?${qs.toString()}`,
      doctype: config.doctype,
      name: params.id,
      format,
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Could not build print URL' },
      { status: 500 }
    )
  }
}
