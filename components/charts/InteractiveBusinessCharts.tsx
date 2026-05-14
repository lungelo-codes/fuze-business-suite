'use client'

import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

type ChartPoint = Record<string, string | number>

function cardTitle(title: string, subtitle?: string) {
  return <div className="demo-panel-head"><div><h3>{title}</h3>{subtitle ? <p>{subtitle}</p> : null}</div></div>
}

export function DashboardCharts({ revenue, activity }: { revenue: ChartPoint[]; activity: ChartPoint[] }) {
  return (
    <section className="demo-grid">
      <div className="demo-panel interactive-chart-card">
        {cardTitle('Revenue Movement', 'Interactive view of invoices, outstanding balances and payments.')}
        <div className="chart-canvas">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={revenue} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip formatter={(value) => `R${Number(value || 0).toLocaleString('en-ZA')}`} />
              <Legend />
              <Line type="monotone" dataKey="revenue" strokeWidth={3} dot />
              <Line type="monotone" dataKey="outstanding" strokeWidth={3} dot />
              <Line type="monotone" dataKey="paid" strokeWidth={3} dot />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="demo-panel interactive-chart-card">
        {cardTitle('Operations Activity', 'CRM, finance, compliance and work volume in one place.')}
        <div className="chart-canvas">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={activity} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  )
}

export function WorkspaceCharts({ statusData, valueData }: { statusData: ChartPoint[]; valueData: ChartPoint[] }) {
  if (!statusData.length && !valueData.length) return null
  return (
    <section className="demo-grid">
      <div className="demo-panel interactive-chart-card">
        {cardTitle('Status Breakdown', 'Click the status cards below to filter the workspace.')}
        <div className="chart-canvas chart-canvas-sm">
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={statusData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="demo-panel interactive-chart-card">
        {cardTitle('Value Trend', 'Financial value from the latest records in this module.')}
        <div className="chart-canvas chart-canvas-sm">
          <ResponsiveContainer width="100%" height={230}>
            <LineChart data={valueData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip formatter={(value) => `R${Number(value || 0).toLocaleString('en-ZA')}`} />
              <Line type="monotone" dataKey="value" strokeWidth={3} dot />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  )
}
