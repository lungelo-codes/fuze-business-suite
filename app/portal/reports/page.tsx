"use client";
import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend, AreaChart, Area,
} from "recharts";

interface ReportData {
  // Finance
  invoicesByMonth: { month:string; total:number; count:number }[];
  paymentsByMonth: { month:string; total:number }[];
  invoicesByStatus: { status:string; count:number }[];
  outstanding: number;
  totalRevenue: number;
  // Customers
  topCustomers: { name:string; total:number }[];
  customersByGroup: { group:string; count:number }[];
  // HR
  employeesByDept: { dept:string; count:number }[];
  employeesByStatus: { status:string; count:number }[];
  leaveByType: { type:string; count:number }[];
  payrollByMonth: { month:string; gross:number; net:number }[];
  totalEmployees: number;
  // Sales pipeline
  quotationsByMonth: { month:string; total:number }[];
  salesOrdersByStatus: { status:string; count:number }[];
  salesRevenue: number;
  quoteTotal: number;
  conversionRate: number;
  totalQuotes: number;
  totalSalesOrders: number;
  // Procurement
  suppliersByGroup: { group:string; count:number }[];
  purchaseOrdersByStatus: { status:string; count:number }[];
  totalPoValue: number;
  totalSuppliers: number;
  totalPurchaseOrders: number;
  // Inventory
  itemsByGroup: { group:string; count:number }[];
  totalItems: number;
  // Operations
  tasksByStatus: { status:string; count:number }[];
  supportByStatus: { status:string; count:number }[];
  totalTasks: number;
  totalIssues: number;
}

const COLORS = ["#28A486","#242048","#F59E0B","#EF4444","#6366F1","#EC4899","#14B8A6","#8B5CF6"];
const TABS = ["Overview","Finance","HR & Payroll","Sales Pipeline","Procurement","Operations"] as const;
type Tab = typeof TABS[number];

function money(v: number) { return `R ${v.toLocaleString("en-ZA",{ maximumFractionDigits:0 })}`; }

const tt = {
  contentStyle:{ background:"var(--card)",border:"1px solid var(--line)",borderRadius:12,boxShadow:"0 8px 24px rgba(22,26,45,.12)",fontSize:12,color:"var(--text)" },
  cursor:{ fill:"var(--demo-soft,#f5f6fa)" },
};

function StatCard({ label, value, hint, icon }:{ label:string; value:string|number; hint:string; icon:string }) {
  return (
    <div className="demo-stat-card">
      <div className="demo-stat-top">
        <div>
          <div className="demo-stat-label">{label}</div>
          <div className="demo-stat-value">{value}</div>
          <div className="demo-stat-hint">{hint}</div>
        </div>
        <div className="demo-stat-icon">{icon}</div>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize:11,fontWeight:900,color:"var(--muted)",textTransform:"uppercase",letterSpacing:".12em",marginBottom:14 }}>{children}</div>;
}

function ChartPanel({ title, subtitle, children, height=240 }: { title:string; subtitle?:string; children:React.ReactNode; height?:number }) {
  return (
    <div className="demo-panel">
      <div className="demo-panel-head"><div><h3>{title}</h3>{subtitle && <p>{subtitle}</p>}</div></div>
      <div style={{ height, padding:"8px 16px 16px" }}>{children}</div>
    </div>
  );
}

const skeleton = { background:"var(--demo-soft,#f0f1f7)", borderRadius:8 } as const;

export default function ReportsPage() {
  const [data, setData] = useState<ReportData|null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("Overview");

  useEffect(() => {
    fetch("/api/portal/reports").then((r) => r.ok ? r.json() : null).then(setData).catch(() => setData(null)).finally(() => setLoading(false));
  }, []);

  async function downloadExport(format: "pdf"|"xlsx") {
    try {
      const res = await fetch(`/api/reports/export?report_name=${encodeURIComponent("Sales Invoice")}&format=${format}`);
      const json = await res.json();
      if (!res.ok||json.error) { alert(json.error||"Unable to export"); return; }
      const { filename, mime, content } = json;
      const link = document.createElement("a");
      link.href = `data:${mime};base64,${content}`;
      link.download = filename;
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
    } catch (e:unknown) { alert(e instanceof Error ? e.message : "Error"); }
  }

  if (loading) {
    return (
      <div className="demo-workspace animate-fade-up">
        <div className="demo-module-titlebar"><div><h1>Reports</h1><p>Loading analytics…</p></div></div>
        <div className="demo-stat-grid">{[1,2,3,4].map((i) => <div key={i} className="demo-stat-card"><div style={{ ...skeleton,height:12,width:"60%",marginBottom:10 }} /><div style={{ ...skeleton,height:30,width:"80%",marginBottom:6 }} /><div style={{ ...skeleton,height:10,width:"50%" }} /></div>)}</div>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:18 }}>{[1,2,3,4].map((i) => <div key={i} className="demo-panel" style={{ height:280 }}><div className="demo-panel-head"><div style={{ ...skeleton,height:14,width:160 }} /></div><div style={{ padding:20 }}><div style={{ ...skeleton,height:200 }} /></div></div>)}</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="demo-workspace animate-fade-up">
        <div className="demo-module-titlebar"><div><h1>Reports</h1><p>Business analytics and insights</p></div></div>
        <div className="demo-panel" style={{ textAlign:"center",padding:"56px 24px" }}>
          <div style={{ fontSize:48,marginBottom:16 }}>📊</div>
          <h3 style={{ color:"var(--demo-text)",fontSize:20,fontWeight:900,margin:"0 0 8px" }}>No report data yet</h3>
          <p style={{ color:"var(--demo-muted)",fontSize:14,maxWidth:440,margin:"0 auto" }}>Analytics appear once your workspace has data across modules.</p>
          <div style={{ display:"flex",gap:10,justifyContent:"center",marginTop:24 }}>
            <a href="/portal/invoices" className="btn btn-teal">Create Invoice</a>
            <a href="/portal/customers" className="btn">Add Customer</a>
          </div>
        </div>
      </div>
    );
  }

  const totalRevenue = data.invoicesByMonth.reduce((s,r) => s+r.total, 0);
  const totalPayments = data.paymentsByMonth.reduce((s,r) => s+r.total, 0);

  return (
    <div className="demo-workspace animate-fade-up">
      {/* Header */}
      <div className="demo-module-titlebar">
        <div>
          <div className="demo-eyebrow">Analytics</div>
          <h1>Reports</h1>
          <p>Business analytics and insights across all modules</p>
        </div>
        <div className="demo-module-actions">
          <button className="btn" onClick={() => downloadExport("xlsx")}>Export XLSX</button>
          <button className="btn btn-teal" onClick={() => downloadExport("pdf")}>Print PDF</button>
        </div>
      </div>

      {/* Global KPI strip */}
      <div className="demo-stat-grid">
        <StatCard label="Total Revenue" value={money(totalRevenue)} hint="All invoices" icon="💰" />
        <StatCard label="Payments Received" value={money(totalPayments)} hint="Cleared payments" icon="✓" />
        <StatCard label="Active Employees" value={data.totalEmployees} hint="Current headcount" icon="👥" />
        <StatCard label="Total Suppliers" value={data.totalSuppliers} hint="Vendor accounts" icon="🏭" />
        <StatCard label="Quotes Sent" value={data.totalQuotes} hint="Sales pipeline" icon="📄" />
        <StatCard label="Purchase Orders" value={data.totalPurchaseOrders} hint="Procurement" icon="📦" />
        <StatCard label="Open Tasks" value={data.totalTasks} hint="Work items" icon="✅" />
        <StatCard label="Support Tickets" value={data.totalIssues} hint="Customer issues" icon="🎯" />
      </div>

      {/* Tab navigation */}
      <div className="demo-panel" style={{ marginBottom:0,padding:0 }}>
        <div style={{ padding:"14px 18px 0",borderBottom:"1px solid var(--demo-line,var(--line))" }}>
          <div className="demo-tabbar" style={{ padding:0,marginBottom:-1 }}>
            {TABS.map((t) => (
              <button key={t} className={tab===t?"active":""} onClick={() => setTab(t)}>{t}</button>
            ))}
          </div>
        </div>

        {/* ── Overview ── */}
        {tab === "Overview" && (
          <div>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr" }}>
              <div style={{ padding:"20px 20px 24px",borderRight:"1px solid var(--line)" }}>
                <SectionTitle>Revenue Trend (last 12 months)</SectionTitle>
                <div style={{ height:230 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.invoicesByMonth} margin={{ top:4,right:8,left:0,bottom:0 }}>
                      <defs><linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#28a486" stopOpacity={0.2}/><stop offset="95%" stopColor="#28a486" stopOpacity={0}/></linearGradient></defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize:11,fill:"var(--muted)" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize:11,fill:"var(--muted)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `R${(v/1000).toFixed(0)}k`} />
                      <Tooltip {...tt} formatter={(v:number) => [money(v),"Revenue"]} />
                      <Area type="monotone" dataKey="total" fill="url(#revGrad)" stroke="#28a486" strokeWidth={2.5} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div style={{ padding:"20px 20px 24px" }}>
                <SectionTitle>Payments Received</SectionTitle>
                <div style={{ height:230 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.paymentsByMonth} margin={{ top:4,right:8,left:0,bottom:0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize:11,fill:"var(--muted)" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize:11,fill:"var(--muted)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `R${(v/1000).toFixed(0)}k`} />
                      <Tooltip {...tt} formatter={(v:number) => [money(v),"Payments"]} />
                      <Line type="monotone" dataKey="total" stroke="#242048" strokeWidth={2.5} dot={{ r:4,fill:"#242048" }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            <div style={{ borderTop:"1px solid var(--line)",display:"grid",gridTemplateColumns:"1fr 1fr" }}>
              <div style={{ padding:"20px 20px 24px",borderRight:"1px solid var(--line)" }}>
                <SectionTitle>Employees by Department</SectionTitle>
                <div style={{ height:220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.employeesByDept} margin={{ top:4,right:8,left:0,bottom:40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                      <XAxis dataKey="dept" tick={{ fontSize:10,fill:"var(--muted)" }} axisLine={false} tickLine={false} angle={-20} textAnchor="end" />
                      <YAxis tick={{ fontSize:11,fill:"var(--muted)" }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip {...tt} />
                      <Bar dataKey="count" fill="#6366F1" radius={[6,6,0,0]} name="Employees" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div style={{ padding:"20px 20px 24px" }}>
                <SectionTitle>Tasks & Support by Status</SectionTitle>
                <div style={{ height:220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[...data.tasksByStatus.map((t) => ({ label:`Task: ${t.status}`,count:t.count })),...data.supportByStatus.map((s) => ({ label:`Support: ${s.status}`,count:s.count }))]} layout="vertical" margin={{ top:4,right:16,left:8,bottom:0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize:11,fill:"var(--muted)" }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <YAxis type="category" dataKey="label" tick={{ fontSize:10,fill:"var(--muted)" }} axisLine={false} tickLine={false} width={110} />
                      <Tooltip {...tt} />
                      <Bar dataKey="count" fill="#242048" radius={[0,6,6,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Finance ── */}
        {tab === "Finance" && (
          <div>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr" }}>
              <div style={{ padding:"20px 20px 24px",borderRight:"1px solid var(--line)" }}>
                <SectionTitle>Revenue &amp; Invoice Count by Month</SectionTitle>
                <div style={{ height:260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.invoicesByMonth} margin={{ top:4,right:16,left:0,bottom:0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize:11,fill:"var(--muted)" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize:11,fill:"var(--muted)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `R${(v/1000).toFixed(0)}k`} />
                      <Tooltip {...tt} formatter={(v:number,n:string) => n==="total"?[money(v),"Revenue"]:[v,"Invoices"]} />
                      <Legend wrapperStyle={{ fontSize:12,color:"var(--muted)" }} />
                      <Bar dataKey="total" fill="#28a486" radius={[6,6,0,0]} name="Revenue" />
                      <Bar dataKey="count" fill="rgba(36,32,72,.25)" radius={[6,6,0,0]} name="Count" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div style={{ padding:"20px 20px 24px" }}>
                <SectionTitle>Invoice Status Breakdown</SectionTitle>
                <div style={{ height:260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={data.invoicesByStatus} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={95} innerRadius={45}>
                        {data.invoicesByStatus.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                      </Pie>
                      <Tooltip {...tt} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize:12,color:"var(--muted)" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            <div style={{ borderTop:"1px solid var(--line)",padding:"20px 20px 24px" }}>
              <SectionTitle>Top Customers by Invoice Value</SectionTitle>
              {data.topCustomers.length ? (
                <table className="demo-table">
                  <thead><tr><th style={{ width:48 }}>#</th><th>Customer</th><th>Total Invoiced</th><th>Revenue Share</th></tr></thead>
                  <tbody>
                    {data.topCustomers.map((c,idx) => {
                      const grand = data.topCustomers.reduce((s,x) => s+x.total, 0);
                      const pct = grand>0 ? ((c.total/grand)*100).toFixed(1) : "0";
                      return (
                        <tr key={c.name}>
                          <td style={{ color:"var(--muted)",fontSize:12,fontWeight:900 }}>{idx+1}</td>
                          <td><div style={{ display:"flex",alignItems:"center",gap:10 }}><div style={{ width:32,height:32,borderRadius:10,background:COLORS[idx%COLORS.length],color:"#fff",display:"grid",placeItems:"center",fontSize:11,fontWeight:900,flexShrink:0 }}>{c.name.slice(0,2).toUpperCase()}</div><span style={{ fontWeight:800 }}>{c.name}</span></div></td>
                          <td style={{ fontWeight:800 }}>{money(c.total)}</td>
                          <td><div style={{ display:"flex",alignItems:"center",gap:10 }}><div style={{ flex:1,height:7,background:"var(--demo-soft,#f0f1f7)",borderRadius:4,overflow:"hidden",maxWidth:120 }}><div style={{ width:`${pct}%`,height:"100%",background:"linear-gradient(90deg,#28a486,#2E6BE5)",borderRadius:4 }} /></div><span style={{ fontSize:12,fontWeight:800,color:"var(--muted)" }}>{pct}%</span></div></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : <div style={{ textAlign:"center",color:"var(--muted)",padding:40 }}>No customer data yet.</div>}
            </div>
          </div>
        )}

        {/* ── HR & Payroll ── */}
        {tab === "HR & Payroll" && (
          <div>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr" }}>
              <div style={{ padding:"20px 20px 24px",borderRight:"1px solid var(--line)" }}>
                <SectionTitle>Employees by Department</SectionTitle>
                <div style={{ height:260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.employeesByDept} margin={{ top:4,right:8,left:0,bottom:40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                      <XAxis dataKey="dept" tick={{ fontSize:10,fill:"var(--muted)" }} axisLine={false} tickLine={false} angle={-25} textAnchor="end" />
                      <YAxis tick={{ fontSize:11,fill:"var(--muted)" }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip {...tt} />
                      <Bar dataKey="count" fill="#6366F1" radius={[6,6,0,0]} name="Employees" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div style={{ padding:"20px 20px 24px" }}>
                <SectionTitle>Employee Status Distribution</SectionTitle>
                <div style={{ height:260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={data.employeesByStatus} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={95} innerRadius={45}>
                        {data.employeesByStatus.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                      </Pie>
                      <Tooltip {...tt} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize:12,color:"var(--muted)" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            <div style={{ borderTop:"1px solid var(--line)",display:"grid",gridTemplateColumns:"1fr 1fr" }}>
              <div style={{ padding:"20px 20px 24px",borderRight:"1px solid var(--line)" }}>
                <SectionTitle>Leave Applications by Type</SectionTitle>
                <div style={{ height:220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.leaveByType} layout="vertical" margin={{ top:4,right:16,left:8,bottom:0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize:11,fill:"var(--muted)" }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <YAxis type="category" dataKey="type" tick={{ fontSize:10,fill:"var(--muted)" }} axisLine={false} tickLine={false} width={120} />
                      <Tooltip {...tt} />
                      <Bar dataKey="count" fill="#F59E0B" radius={[0,6,6,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div style={{ padding:"20px 20px 24px" }}>
                <SectionTitle>Payroll — Gross vs Net Pay</SectionTitle>
                <div style={{ height:220 }}>
                  {data.payrollByMonth.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.payrollByMonth} margin={{ top:4,right:8,left:0,bottom:0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                        <XAxis dataKey="month" tick={{ fontSize:11,fill:"var(--muted)" }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize:11,fill:"var(--muted)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `R${(v/1000).toFixed(0)}k`} />
                        <Tooltip {...tt} formatter={(v:number) => [money(v)]} />
                        <Legend wrapperStyle={{ fontSize:12,color:"var(--muted)" }} />
                        <Bar dataKey="gross" fill="#28a486" radius={[4,4,0,0]} name="Gross Pay" />
                        <Bar dataKey="net" fill="#242048" radius={[4,4,0,0]} name="Net Pay" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <div style={{ display:"flex",alignItems:"center",justifyContent:"center",height:"100%",color:"var(--muted)",fontSize:13 }}>Payroll data will appear here once salary slips are processed.</div>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Sales Pipeline ── */}
        {tab === "Sales Pipeline" && (
          <div>
            <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:0,borderBottom:"1px solid var(--line)" }}>
              {[{ label:"Quotation Value", value:money(data.quoteTotal), hint:`${data.totalQuotes} quotes`, icon:"📄" },
                { label:"Sales Revenue", value:money(data.salesRevenue), hint:`${data.totalSalesOrders} orders`, icon:"💼" },
                { label:"Conversion Rate", value:`${data.conversionRate}%`, hint:"Quotes → Orders", icon:"🎯" },
              ].map((s) => (
                <div key={s.label} style={{ padding:"20px 24px",borderRight:"1px solid var(--line)" }}>
                  <div style={{ fontSize:28,marginBottom:8 }}>{s.icon}</div>
                  <div style={{ fontSize:10.5,fontWeight:800,color:"var(--muted)",textTransform:"uppercase",letterSpacing:".7px" }}>{s.label}</div>
                  <div style={{ fontSize:24,fontWeight:800,color:"var(--navy-ink)",margin:"4px 0 2px" }}>{s.value}</div>
                  <div style={{ fontSize:11.5,color:"var(--muted-2)" }}>{s.hint}</div>
                </div>
              ))}
            </div>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr" }}>
              <div style={{ padding:"20px 20px 24px",borderRight:"1px solid var(--line)" }}>
                <SectionTitle>Quotation Value by Month</SectionTitle>
                <div style={{ height:240 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.quotationsByMonth} margin={{ top:4,right:8,left:0,bottom:0 }}>
                      <defs><linearGradient id="quoteGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366F1" stopOpacity={0.2}/><stop offset="95%" stopColor="#6366F1" stopOpacity={0}/></linearGradient></defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize:11,fill:"var(--muted)" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize:11,fill:"var(--muted)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `R${(v/1000).toFixed(0)}k`} />
                      <Tooltip {...tt} formatter={(v:number) => [money(v),"Quote Value"]} />
                      <Area type="monotone" dataKey="total" fill="url(#quoteGrad)" stroke="#6366F1" strokeWidth={2.5} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div style={{ padding:"20px 20px 24px" }}>
                <SectionTitle>Sales Orders by Status</SectionTitle>
                <div style={{ height:240 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={data.salesOrdersByStatus} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={90} innerRadius={40}>
                        {data.salesOrdersByStatus.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                      </Pie>
                      <Tooltip {...tt} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize:12,color:"var(--muted)" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Procurement ── */}
        {tab === "Procurement" && (
          <div>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr" }}>
              <div style={{ padding:"20px 20px 24px",borderRight:"1px solid var(--line)" }}>
                <SectionTitle>Suppliers by Group</SectionTitle>
                <div style={{ height:260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={data.suppliersByGroup} dataKey="count" nameKey="group" cx="50%" cy="50%" outerRadius={95} innerRadius={45}>
                        {data.suppliersByGroup.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                      </Pie>
                      <Tooltip {...tt} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize:12,color:"var(--muted)" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div style={{ padding:"20px 20px 24px" }}>
                <SectionTitle>Purchase Orders by Status</SectionTitle>
                <div style={{ height:260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.purchaseOrdersByStatus} margin={{ top:4,right:8,left:0,bottom:0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                      <XAxis dataKey="status" tick={{ fontSize:11,fill:"var(--muted)" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize:11,fill:"var(--muted)" }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip {...tt} />
                      <Bar dataKey="count" fill="#F59E0B" radius={[6,6,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            <div style={{ borderTop:"1px solid var(--line)",padding:"20px 24px" }}>
              <SectionTitle>Inventory — Items by Group</SectionTitle>
              <div style={{ height:220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.itemsByGroup} margin={{ top:4,right:8,left:0,bottom:30 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                    <XAxis dataKey="group" tick={{ fontSize:10,fill:"var(--muted)" }} axisLine={false} tickLine={false} angle={-20} textAnchor="end" />
                    <YAxis tick={{ fontSize:11,fill:"var(--muted)" }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip {...tt} />
                    <Bar dataKey="count" fill="#14B8A6" radius={[6,6,0,0]} name="Items" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* ── Operations ── */}
        {tab === "Operations" && (
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr" }}>
            <div style={{ padding:"20px 20px 24px",borderRight:"1px solid var(--line)" }}>
              <SectionTitle>Tasks by Status</SectionTitle>
              <div style={{ height:240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data.tasksByStatus} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={90} innerRadius={40}>
                      {data.tasksByStatus.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                    </Pie>
                    <Tooltip {...tt} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize:12,color:"var(--muted)" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div style={{ padding:"20px 20px 24px" }}>
              <SectionTitle>Support Tickets by Status</SectionTitle>
              <div style={{ height:240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.supportByStatus} layout="vertical" margin={{ top:4,right:16,left:8,bottom:0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize:11,fill:"var(--muted)" }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <YAxis type="category" dataKey="status" tick={{ fontSize:11,fill:"var(--muted)" }} axisLine={false} tickLine={false} width={80} />
                    <Tooltip {...tt} />
                    <Bar dataKey="count" fill="#242048" radius={[0,6,6,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
