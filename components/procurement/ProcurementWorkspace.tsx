"use client";
import { useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

type Row = Record<string, unknown>;
const COLORS = ["#28A486","#242048","#F59E0B","#EF4444","#6366F1","#14B8A6"];
const TABS = ["Overview","Suppliers","Purchase Orders"];

function money(v: unknown) { const n = Number(v||0); return n ? `R ${n.toLocaleString("en-ZA",{maximumFractionDigits:0})}` : "—"; }
function text(v: unknown) { return v === null||v === undefined||v === "" ? "—" : String(v); }
function statusCls(v: unknown) {
  const s = String(v||"").toLowerCase();
  if (s.includes("cancel")||s.includes("close")) return "chip danger";
  if (s.includes("draft")||s.includes("pending")||s.includes("partial")) return "chip warn";
  if (s.includes("submit")||s.includes("paid")||s.includes("deliver")||s.includes("receiv")||s.includes("active")) return "chip ok";
  return "chip info";
}

function KPI({ label, value, hint, color="teal" }: { label:string; value:string|number; hint:string; color?:string }) {
  const bg:Record<string,string> = { teal:"#E3F6F0", navy:"#EEEDF7", warn:"#FFF6E0", blue:"#E8EFFD" };
  const fg:Record<string,string> = { teal:"#28a486", navy:"#242048", warn:"#E89B0E", blue:"#2E6BE5" };
  return (
    <div style={{ background:"#fff",border:"1px solid var(--line)",borderRadius:12,padding:"16px 18px",boxShadow:"var(--shadow)" }}>
      <div style={{ width:36,height:36,borderRadius:9,background:bg[color]||bg.teal,color:fg[color]||fg.teal,display:"grid",placeItems:"center",marginBottom:12,fontSize:16,fontWeight:800 }}>▸</div>
      <div style={{ fontSize:10.5,fontWeight:800,color:"var(--muted)",letterSpacing:".7px",textTransform:"uppercase" }}>{label}</div>
      <div style={{ fontSize:26,fontWeight:800,color:"var(--navy-ink)",margin:"4px 0 2px" }}>{value}</div>
      <div style={{ fontSize:11.5,color:"var(--muted-2)" }}>{hint}</div>
    </div>
  );
}

const tt = { contentStyle:{ background:"var(--card)",border:"1px solid var(--line)",borderRadius:12,boxShadow:"0 8px 24px rgba(22,26,45,.12)",fontSize:12,color:"var(--text)" }, cursor:{ fill:"var(--demo-soft,#f5f6fa)" } };

type ModalField = { name:string; label:string; type?:string; required?:boolean; options?:string[] };
function Modal({ title, fields, onClose, onSubmit, busy, error }: { title:string; fields:ModalField[]; onClose:()=>void; onSubmit:(v:Row)=>Promise<void>; busy:boolean; error:string }) {
  const [values, setValues] = useState<Row>({});
  const set = (k:string, v:unknown) => setValues((p) => ({ ...p, [k]:v }));
  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(20,20,40,.55)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(2px)" }}>
      <div style={{ background:"var(--card)",borderRadius:18,padding:28,width:"100%",maxWidth:500,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(22,26,45,.22)" }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20 }}>
          <h2 style={{ margin:0,fontSize:18,fontWeight:800,color:"var(--navy-ink)" }}>{title}</h2>
          <button type="button" onClick={onClose} style={{ border:"none",background:"none",fontSize:20,cursor:"pointer",color:"var(--muted)" }}>✕</button>
        </div>
        <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
          {fields.map((f) => (
            <div key={f.name}>
              <label style={{ fontSize:12,fontWeight:700,color:"var(--muted)",display:"block",marginBottom:4 }}>{f.label}{f.required && <span style={{ color:"var(--danger)" }}> *</span>}</label>
              {f.options ? (
                <select value={String(values[f.name]??"")} onChange={(e) => set(f.name,e.target.value)} style={{ width:"100%",padding:"10px 12px",border:"1px solid var(--line)",borderRadius:9,fontSize:14,background:"#fff" }}>
                  <option value="">Select…</option>
                  {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input type={f.type||"text"} value={String(values[f.name]??"")} onChange={(e) => set(f.name,e.target.value)} style={{ width:"100%",padding:"10px 12px",border:"1px solid var(--line)",borderRadius:9,fontSize:14 }} />
              )}
            </div>
          ))}
        </div>
        {error && <div style={{ color:"var(--danger)",fontSize:13,marginTop:12,padding:"8px 12px",background:"var(--danger-bg)",borderRadius:8 }}>{error}</div>}
        <div style={{ display:"flex",gap:10,marginTop:20,justifyContent:"flex-end" }}>
          <button type="button" onClick={onClose} className="btn">Cancel</button>
          <button type="button" onClick={() => onSubmit(values)} disabled={busy} className="btn btn-teal">{busy ? "Saving…" : "Save"}</button>
        </div>
      </div>
    </div>
  );
}

export default function ProcurementWorkspace({ initialSuppliers, initialPurchaseOrders }: { initialSuppliers:Row[]; initialPurchaseOrders:Row[] }) {
  const [tab, setTab] = useState("Overview");
  const [suppliers, setSuppliers] = useState<Row[]>(initialSuppliers);
  const [orders, setOrders] = useState<Row[]>(initialPurchaseOrders);
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<null|"supplier"|"order">(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");

  const totalOrderValue = orders.reduce((s,o) => s+Number(o.grand_total||0), 0);
  const pendingOrders = orders.filter((o) => String(o.status||"").toLowerCase().includes("deliver")||String(o.status||"").toLowerCase().includes("draft")).length;

  const supplierGroupData = useMemo(() => {
    const map:Record<string,number> = {};
    suppliers.forEach((s) => { const g = String(s.supplier_group||s.supplier_type||"Other"); map[g]=(map[g]||0)+1; });
    return Object.entries(map).map(([name,count]) => ({ name,count })).sort((a,b) => b.count-a.count);
  }, [suppliers]);

  const orderStatusData = useMemo(() => {
    const map:Record<string,number> = {};
    orders.forEach((o) => { const s = String(o.status||"Draft"); map[s]=(map[s]||0)+1; });
    return Object.entries(map).map(([status,count]) => ({ status,count }));
  }, [orders]);

  const orderValueBySupplier = useMemo(() => {
    const map:Record<string,number> = {};
    orders.forEach((o) => { const s=String(o.supplier_name||o.supplier||"Unknown"); map[s]=(map[s]||0)+Number(o.grand_total||0); });
    return Object.entries(map).sort((a,b) => b[1]-a[1]).slice(0,8).map(([name,value]) => ({ name:name.slice(0,16), value }));
  }, [orders]);

  function filter(rows:Row[]) {
    const q = query.toLowerCase().trim();
    return q ? rows.filter((r) => JSON.stringify(r).toLowerCase().includes(q)) : rows;
  }

  async function submit(module:string, values:Row, onSuccess:(r:Row)=>void) {
    setBusy(true); setFormError("");
    try {
      const res = await fetch(`/api/crud/${module}`, { method:"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(values) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error||"Failed");
      onSuccess(json.data||json);
      setModal(null);
      setNotice("Record saved."); setTimeout(() => setNotice(""), 3000);
    } catch (e:unknown) { setFormError(e instanceof Error ? e.message : "Error"); }
    finally { setBusy(false); }
  }

  return (
    <div className="demo-workspace animate-fade-up">
      <section className="demo-module-titlebar">
        <div>
          <div className="demo-eyebrow">Operations</div>
          <h1>Procurement</h1>
          <p>Manage suppliers and purchase orders in one consolidated workspace.</p>
        </div>
        <div className="demo-module-actions">
          <button type="button" className="btn btn-teal" onClick={() => setModal("supplier")}>+ Add Supplier</button>
          <button type="button" className="btn" onClick={() => setModal("order")}>+ Purchase Order</button>
        </div>
      </section>

      {notice && <div style={{ background:"var(--ok-bg)",border:"1px solid var(--ok)",color:"var(--ok)",borderRadius:9,padding:"10px 16px",marginBottom:14,fontSize:13,fontWeight:600 }}>✓ {notice}</div>}

      <section className="demo-tabbar">
        {TABS.map((t) => (
          <button key={t} type="button" onClick={() => { setTab(t); setQuery(""); }} className={tab===t?"active":""}>
            {t==="Suppliers"?`Suppliers (${suppliers.length})`:t==="Purchase Orders"?`Purchase Orders (${orders.length})`:t}
          </button>
        ))}
      </section>

      {tab === "Overview" && (
        <>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:18 }}>
            <KPI label="Total Suppliers" value={suppliers.length} hint="Active vendor accounts" color="teal" />
            <KPI label="Purchase Orders" value={orders.length} hint="All purchase orders" color="navy" />
            <KPI label="Pending Delivery" value={pendingOrders} hint="Awaiting receipt" color="warn" />
            <KPI label="Total Order Value" value={money(totalOrderValue)} hint="Sum of all POs" color="blue" />
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16 }}>
            <div className="demo-panel">
              <div className="demo-panel-head"><div><h3>Suppliers by Group</h3><p>Vendor category breakdown</p></div></div>
              <div style={{ height:240,padding:"8px 16px 16px" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={supplierGroupData} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={85} innerRadius={40}>
                      {supplierGroupData.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                    </Pie>
                    <Tooltip {...tt} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize:12,color:"var(--muted)" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="demo-panel">
              <div className="demo-panel-head"><div><h3>Purchase Orders by Status</h3><p>Current order pipeline</p></div></div>
              <div style={{ height:240,padding:"8px 16px 16px" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={orderStatusData} margin={{ top:4,right:8,left:0,bottom:0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                    <XAxis dataKey="status" tick={{ fontSize:10,fill:"var(--muted)" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize:11,fill:"var(--muted)" }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip {...tt} />
                    <Bar dataKey="count" fill="#242048" radius={[6,6,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          {orderValueBySupplier.length > 0 && (
            <div className="demo-panel">
              <div className="demo-panel-head"><div><h3>Top Suppliers by Order Value</h3><p>Spend analysis by vendor</p></div></div>
              <div style={{ height:240,padding:"8px 16px 16px" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={orderValueBySupplier} margin={{ top:4,right:8,left:0,bottom:32 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize:10,fill:"var(--muted)" }} axisLine={false} tickLine={false} angle={-20} textAnchor="end" />
                    <YAxis tick={{ fontSize:11,fill:"var(--muted)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `R${(v/1000).toFixed(0)}k`} />
                    <Tooltip {...tt} formatter={(v:number) => [money(v),"Spend"]} />
                    <Bar dataKey="value" fill="#28a486" radius={[6,6,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      )}

      {tab === "Suppliers" && (
        <div className="demo-panel">
          <div className="demo-panel-head">
            <div><h3>Suppliers <span style={{ fontSize:12,fontWeight:600,color:"var(--muted)" }}>({suppliers.length})</span></h3></div>
            <div style={{ display:"flex",gap:8 }}>
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search suppliers…" style={{ padding:"8px 12px",border:"1px solid var(--line)",borderRadius:9,fontSize:13 }} />
              <button type="button" className="btn btn-teal" onClick={() => setModal("supplier")}>+ Add Supplier</button>
            </div>
          </div>
          <div style={{ overflowX:"auto" }}>
            <table className="demo-table">
              <thead><tr><th>Supplier</th><th>Type</th><th>Group</th><th>Email</th><th>Phone</th><th>Status</th></tr></thead>
              <tbody>
                {filter(suppliers).slice(0,50).map((s,i) => (
                  <tr key={String(s.name||i)}>
                    <td><b>{text(s.supplier_name||s.name)}</b></td>
                    <td>{text(s.supplier_type)}</td>
                    <td>{text(s.supplier_group)}</td>
                    <td>{text(s.email_id)}</td>
                    <td>{text(s.mobile_no)}</td>
                    <td><span className={statusCls(s.status||"Active")}>{text(s.status||"Active")}</span></td>
                  </tr>
                ))}
                {!filter(suppliers).length && <tr><td colSpan={6} style={{ textAlign:"center",color:"var(--muted)",padding:32 }}>No suppliers found.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "Purchase Orders" && (
        <div className="demo-panel">
          <div className="demo-panel-head">
            <div><h3>Purchase Orders <span style={{ fontSize:12,fontWeight:600,color:"var(--muted)" }}>({orders.length})</span></h3></div>
            <div style={{ display:"flex",gap:8 }}>
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search orders…" style={{ padding:"8px 12px",border:"1px solid var(--line)",borderRadius:9,fontSize:13 }} />
              <button type="button" className="btn btn-teal" onClick={() => setModal("order")}>+ New PO</button>
            </div>
          </div>
          <div style={{ overflowX:"auto" }}>
            <table className="demo-table">
              <thead><tr><th>Order</th><th>Supplier</th><th>Date</th><th>Expected Delivery</th><th>Total</th><th>Status</th></tr></thead>
              <tbody>
                {filter(orders).slice(0,50).map((o,i) => (
                  <tr key={String(o.name||i)}>
                    <td><b>{text(o.name)}</b></td>
                    <td>{text(o.supplier_name||o.supplier)}</td>
                    <td>{text(o.transaction_date)}</td>
                    <td>{text(o.schedule_date)}</td>
                    <td style={{ fontWeight:700 }}>{money(o.grand_total)}</td>
                    <td><span className={statusCls(o.status||o.docstatus)}>{text(o.status||(o.docstatus===1?"Submitted":"Draft"))}</span></td>
                  </tr>
                ))}
                {!filter(orders).length && <tr><td colSpan={6} style={{ textAlign:"center",color:"var(--muted)",padding:32 }}>No purchase orders found.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal === "supplier" && (
        <Modal title="Add Supplier" fields={[
          { name:"supplier_name", label:"Supplier Name", required:true },
          { name:"supplier_type", label:"Supplier Type", options:["Company","Individual","Partnership"] },
          { name:"supplier_group", label:"Supplier Group" },
          { name:"email_id", label:"Email", type:"email" },
          { name:"mobile_no", label:"Mobile No", type:"tel" },
          { name:"country", label:"Country" },
        ]} onClose={() => { setModal(null); setFormError(""); }} onSubmit={(v) => submit("suppliers", v, (r) => setSuppliers((p) => [r,...p]))} busy={busy} error={formError} />
      )}
      {modal === "order" && (
        <Modal title="New Purchase Order" fields={[
          { name:"supplier", label:"Supplier ID", required:true },
          { name:"transaction_date", label:"Order Date", type:"date", required:true },
          { name:"schedule_date", label:"Expected Delivery", type:"date" },
        ]} onClose={() => { setModal(null); setFormError(""); }} onSubmit={(v) => submit("purchase-orders", v, (r) => setOrders((p) => [r,...p]))} busy={busy} error={formError} />
      )}
    </div>
  );
}
