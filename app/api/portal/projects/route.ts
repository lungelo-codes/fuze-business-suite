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
    const [projects, tasks, events, timesheets] = await Promise.all([
      safeList<Row>('Project', [
        'name', 'project_name', 'status', 'customer', 'percent_complete',
        'expected_start_date', 'expected_end_date', 'actual_start_date',
        'actual_end_date', 'priority', 'modified',
      ]),
      safeList<Row>('Task', [
        'name', 'subject', 'project', 'status', 'priority', 'assigned_to',
        'exp_start_date', 'exp_end_date', 'actual_time', 'progress', 'modified',
      ]),
      safeList<Row>('Event', [
        'name', 'subject', 'starts_on', 'ends_on', 'event_type',
        'status', 'description', 'modified',
      ]),
      safeList<Row>('Timesheet', [
        'name', 'employee', 'employee_name', 'start_date', 'end_date',
        'total_hours', 'status', 'modified',
      ]),
    ])

    const openProjects = projects.filter((p) => p.status === 'Open').length
    const completedProjects = projects.filter((p) => p.status === 'Completed').length
    const openTasks = tasks.filter((t) => t.status === 'Open').length
    const overdueTasks = tasks.filter((t) => {
      if (!t.exp_end_date) return false
      return new Date(String(t.exp_end_date)) < new Date() && t.status !== 'Completed' && t.status !== 'Cancelled'
    }).length

    // Status breakdown for tasks
    const taskStatusMap: Record<string, number> = {}
    for (const t of tasks) {
      const s = String(t.status || 'Open')
      taskStatusMap[s] = (taskStatusMap[s] || 0) + 1
    }
    const tasksByStatus = Object.entries(taskStatusMap).map(([status, count]) => ({ status, count }))

    return NextResponse.json({
      projects,
      tasks,
      events: events.slice(0, 50),
      timesheets: timesheets.slice(0, 50),
      totals: {
        projects: projects.length,
        openProjects,
        completedProjects,
        tasks: tasks.length,
        openTasks,
        overdueTasks,
      },
      tasksByStatus,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not load projects data' },
      { status: 500 }
    )
  }
}
