import { NextResponse } from 'next/server'
import { erpList } from '@/lib/server/erpnext'

type Row = Record<string, unknown>

function n(v: unknown): number {
  return typeof v === 'number' ? v : Number(v || 0)
}

async function safeList<T extends Row>(doctype: string, fields: string[], filters?: unknown[]): Promise<T[]> {
  try {
    return await erpList<T>(doctype, { fields, filters, limit: 300, orderBy: 'modified desc' })
  } catch {
    return []
  }
}

export async function GET() {
  try {
    const [employees, attendance, leaveApps, salarySlips, payrollEntries, leaveAllocs] = await Promise.all([
      safeList<Row>('Employee', [
        'name', 'employee_name', 'status', 'department', 'designation',
        'date_of_joining', 'company_email', 'cell_number', 'modified',
      ]),
      safeList<Row>('Attendance', [
        'name', 'employee', 'employee_name', 'attendance_date', 'status',
        'in_time', 'out_time', 'working_hours', 'late_entry', 'early_exit', 'modified',
      ]),
      safeList<Row>('Leave Application', [
        'name', 'employee', 'employee_name', 'leave_type', 'from_date', 'to_date',
        'total_leave_days', 'status', 'description', 'posting_date', 'modified',
      ]),
      safeList<Row>('Salary Slip', [
        'name', 'employee', 'employee_name', 'start_date', 'end_date',
        'gross_pay', 'total_deduction', 'net_pay', 'status', 'docstatus', 'modified',
      ]),
      safeList<Row>('Payroll Entry', [
        'name', 'posting_date', 'status', 'salary_slips_created',
        'salary_slips_submitted', 'total_amount', 'modified',
      ]),
      safeList<Row>('Leave Allocation', [
        'name', 'employee', 'employee_name', 'leave_type',
        'total_leaves_allocated', 'new_leaves_allocated', 'from_date', 'to_date', 'modified',
      ]),
    ])

    const activeEmployees = employees.filter((e) => e.status === 'Active')
    const presentToday = attendance.filter((a) => a.status === 'Present').length
    const onLeave = attendance.filter((a) => a.status === 'On Leave').length
    const pendingLeave = leaveApps.filter((l) => l.status === 'Open').length
    const approvedLeave = leaveApps.filter((l) => l.status === 'Approved').length

    // Department breakdown
    const deptMap: Record<string, number> = {}
    for (const emp of employees) {
      const dept = String(emp.department || 'General')
      deptMap[dept] = (deptMap[dept] || 0) + 1
    }
    const byDepartment = Object.entries(deptMap)
      .sort((a, b) => b[1] - a[1])
      .map(([department, count]) => ({ department, count }))

    // Payroll totals
    const totalGross = salarySlips.reduce((s, r) => s + n(r.gross_pay), 0)
    const totalDeductions = salarySlips.reduce((s, r) => s + n(r.total_deduction), 0)
    const totalNet = salarySlips.reduce((s, r) => s + n(r.net_pay), 0)

    // Leave type breakdown
    const leaveTypeMap: Record<string, number> = {}
    for (const l of leaveApps) {
      const lt = String(l.leave_type || 'Annual')
      leaveTypeMap[lt] = (leaveTypeMap[lt] || 0) + n(l.total_leave_days)
    }
    const leaveByType = Object.entries(leaveTypeMap).map(([type, days]) => ({ type, days }))

    return NextResponse.json({
      employees,
      activeEmployees,
      attendance: attendance.slice(0, 100),
      leaveApplications: leaveApps.slice(0, 100),
      salarySlips: salarySlips.slice(0, 50),
      payrollEntries: payrollEntries.slice(0, 20),
      leaveAllocations: leaveAllocs.slice(0, 100),
      totals: {
        employees: employees.length,
        active: activeEmployees.length,
        presentToday,
        onLeave,
        pendingLeave,
        approvedLeave,
        totalGross,
        totalDeductions,
        totalNet,
      },
      byDepartment,
      leaveByType,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not load HR dashboard' },
      { status: 500 }
    )
  }
}
