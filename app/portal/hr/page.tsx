import HrWorkspaceClient from "@/components/hr/HrWorkspaceClient";

/**
 * HR Workspace page.
 * All data fetching is done client-side in HrWorkspaceClient via:
 *
 *   GET  /api/hr/dashboard
 *   GET  /api/hr/employees            POST /api/hr/employees
 *   GET  /api/hr/employees/[id]       PUT  /api/hr/employees/[id]
 *   GET  /api/hr/org-chart
 *   GET  /api/hr/departments          GET  /api/hr/designations
 *   GET  /api/hr/branches             GET  /api/hr/employment-types
 *   GET  /api/hr/employee-grades
 *   GET  /api/hr/shift-types
 *   GET  /api/hr/shift-assignments    POST /api/hr/shift-assignments
 *   GET  /api/hr/shift-requests
 *   GET  /api/hr/attendance           POST /api/hr/attendance
 *   GET  /api/hr/attendance-requests  POST /api/hr/attendance-requests
 *   GET  /api/hr/checkins
 *   GET  /api/hr/leave-types          GET  /api/hr/holiday-lists
 *   GET  /api/hr/leave-requests       POST /api/hr/leave-requests
 *   PUT  /api/hr/leave-requests/[id]/approve
 *   PUT  /api/hr/leave-requests/[id]/reject
 *   GET  /api/hr/leave-allocations
 *   GET  /api/hr/leave-balance
 *   GET  /api/hr/leave-encashments
 *   GET  /api/hr/compensatory-leave
 *   GET  /api/hr/appraisal-cycles
 *   GET  /api/hr/appraisals           GET  /api/hr/appraisals/[id]
 *   GET  /api/hr/goals                POST /api/hr/goals
 *   GET  /api/hr/performance-feedback
 *   GET  /api/hr/salary-structures    GET  /api/hr/salary-structure-assignments
 *   GET  /api/hr/payroll-summary      GET  /api/hr/payroll-entries
 *   GET  /api/hr/salary-slips/[id]    GET  /api/hr/salary-components
 *   GET  /api/hr/job-openings         POST /api/hr/job-openings
 *   GET  /api/hr/job-applicants       POST /api/hr/job-applicants
 *   PUT  /api/hr/job-applicants/[id]
 *   GET  /api/hr/interviews           POST /api/hr/interviews
 *   GET  /api/hr/job-offers           GET  /api/hr/job-requisitions
 *   GET  /api/hr/training-programs    GET  /api/hr/training-events
 *   GET  /api/hr/training-results
 *   GET  /api/hr/expense-claims       POST /api/hr/expense-claims
 *   GET  /api/hr/expense-claims/[id]  PUT  /api/hr/expense-claims/[id]/approve
 *   GET  /api/hr/employee-advances    POST /api/hr/employee-advances
 *   GET  /api/hr/travel-requests
 *   GET  /api/hr/onboardings          GET  /api/hr/separations
 *   GET  /api/hr/promotions           GET  /api/hr/transfers
 *   GET  /api/hr/exit-interviews      GET  /api/hr/skill-map
 *   GET  /api/hr/vehicles             GET  /api/hr/vehicle-logs
 *   GET  /api/hr/referrals
 */
export default function HRPage() {
  return <HrWorkspaceClient />;
}
