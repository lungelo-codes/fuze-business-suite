import { NextResponse } from 'next/server'
import { erpList } from '@/lib/server/erpnext'

type Row = Record<string, unknown>

async function safeList<T extends Row>(doctype: string, fields: string[]): Promise<T[]> {
  try {
    return await erpList<T>(doctype, { fields, limit: 200, orderBy: 'modified desc' })
  } catch {
    return []
  }
}

export async function GET() {
  try {
    const [issues, comms, todos] = await Promise.all([
      safeList<Row>('Issue', [
        'name', 'subject', 'customer', 'status', 'priority', 'raised_by',
        'issue_type', 'first_response_time', 'resolution_time', 'modified',
      ]),
      safeList<Row>('Communication', [
        'name', 'subject', 'sender', 'recipients', 'communication_type',
        'status', 'reference_doctype', 'reference_name', 'modified',
      ]),
      safeList<Row>('ToDo', [
        'name', 'description', 'reference_type', 'reference_name',
        'status', 'priority', 'date', 'modified',
      ]),
    ])

    const open = issues.filter((i) => i.status === 'Open').length
    const resolved = issues.filter((i) => i.status === 'Resolved' || i.status === 'Closed').length
    const urgent = issues.filter((i) => i.priority === 'Urgent' || i.priority === 'High').length

    const statusMap: Record<string, number> = {}
    for (const i of issues) {
      const s = String(i.status || 'Open')
      statusMap[s] = (statusMap[s] || 0) + 1
    }
    const byStatus = Object.entries(statusMap).map(([status, count]) => ({ status, count }))

    const priorityMap: Record<string, number> = {}
    for (const i of issues) {
      const p = String(i.priority || 'Medium')
      priorityMap[p] = (priorityMap[p] || 0) + 1
    }
    const byPriority = Object.entries(priorityMap).map(([priority, count]) => ({ priority, count }))

    return NextResponse.json({
      issues,
      communications: comms.slice(0, 50),
      todos: todos.slice(0, 50),
      totals: {
        total: issues.length,
        open,
        resolved,
        urgent,
      },
      byStatus,
      byPriority,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not load support data' },
      { status: 500 }
    )
  }
}
