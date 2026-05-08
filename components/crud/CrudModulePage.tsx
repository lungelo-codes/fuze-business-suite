'use client'

import { MouseEvent, useEffect, useMemo, useState } from 'react'
import BusinessModal from '@/components/modals/BusinessModal'
import DetailDrawer from '@/components/drawers/DetailDrawer'
import DynamicForm from '@/components/forms/DynamicForm'
import StatusChip from '@/components/StatusChip'
import type { CrudField, CrudModuleConfig } from '@/lib/crudConfig'

type Row = Record<string, unknown>
type MetadataResponse = { doctype: string; fields: CrudField[]; tableFields: CrudField[]; listFields: string[]; defaults: Record<string, unknown>; fromERPNext: boolean }
const SYSTEM_FIELDS = new Set(['owner', 'creation', 'modified_by', 'parent', 'parentfield', 'parenttype', 'idx'])

function getRowId(row: Row | null): string { return row ? String(row.name || row.id || '') : '' }
function valueToText(value: unknown): string {
  if (value === undefined || value === null || value === '') return '—'
  if (typeof value === 'number') return value.toLocaleString('en-ZA')
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (Array.isArray(value)) return `${value.length} item${value.length === 1 ? '' : 's'}`
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}
function isStatusField(name: string): boolean { const n = name.toLowerCase(); return n.includes('status') || n === 'docstatus' }
function singularTitle(title: string): string { if (title === 'Sales Invoices') return 'Sales Invoice'; if (title === 'Payment Entries') return 'Payment Entry'; if (title.endsWith('ies')) return `${title.slice(0, -3)}y`; if (title.endsWith('s')) return title.slice(0, -1); return title }
function cleanCreateValues(config: CrudModuleConfig): Row { const values: Row = { ...(config.defaults || {}) }; for (const field of config.formFields) if (values[field.name] === undefined && field.type === 'checkbox') values[field.name] = 0; return values }
function uniqueFields(config: CrudModuleConfig): CrudField[] { const map = new Map<string, CrudField>(); map.set('name', { name: 'name', label: 'Record ID', readOnly: true }); for (const field of [...config.tableFields, ...config.formFields]) if (!map.has(field.name)) map.set(field.name, field); map.set('modified', { name: 'modified', label: 'Last Updated', readOnly: true }); return Array.from(map.values()) }
function childTables(row: Row | null): Array<[string, Row[]]> { if (!row) return []; return Object.entries(row).filter(([, value]) => Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') as Array<[string, Row[]]> }
function buildConfig(base: CrudModuleConfig, meta?: MetadataResponse | null): CrudModuleConfig { if (!meta) return base; return { ...base, doctype: meta.doctype || base.doctype, listFields: meta.listFields?.length ? meta.listFields : base.listFields, tableFields: meta.tableFields?.length ? meta.tableFields : base.tableFields, formFields: meta.fields?.length ? meta.fields : base.formFields, defaults: { ...(base.defaults || {}), ...(meta.defaults || {}) } } }

export default function CrudModulePage({ moduleId, config, initialRows = [] }: { moduleId: string; config: CrudModuleConfig; initialRows?: Row[] }) {
  const [meta, setMeta] = useState<MetadataResponse | null>(null)
  const [rows, setRows] = useState<Row[]>(initialRows || [])
  const [query, setQuery] = useState('')
  const [stageFilter, setStageFilter] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selected, setSelected] = useState<Row | null>(null)
  const [values, setValues] = useState<Row>(cleanCreateValues(config))
  const [mode, setMode] = useState<'create' | 'edit' | 'duplicate'>('create')
  const [loading, setLoading] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [metaNotice, setMetaNotice] = useState('')

  const activeConfig = useMemo(() => buildConfig(config, meta), [config, meta])
  const tableFields = activeConfig.tableFields.filter((f) => !f.hideOnTable)
  const detailFields = useMemo(() => uniqueFields(activeConfig), [activeConfig])
  const statusField = useMemo(() => tableFields.find((f) => f.name === 'status')?.name || activeConfig.formFields.find((f) => f.name === 'status')?.name || '', [tableFields, activeConfig.formFields])
  const stageCards = useMemo(() => { if (!statusField) return [] as Array<{ stage: string; count: number }>; const counts = new Map<string, number>(); for (const row of rows) { const stage = valueToText(row[statusField]); if (!stage || stage === '—') continue; counts.set(stage, (counts.get(stage) || 0) + 1); } return Array.from(counts.entries()).map(([stage, count]) => ({ stage, count })).sort((a, b) => a.stage.localeCompare(b.stage)); }, [rows, statusField])
  const visibleRows = useMemo(() => { const term = query.trim().toLowerCase(); return rows.filter((row) => { const stageOk = !stageFilter || !statusField || valueToText(row[statusField]) === stageFilter; const queryOk = !term || JSON.stringify(row).toLowerCase().includes(term); return stageOk && queryOk; }) }, [rows, query, stageFilter, statusField])

  useEffect(() => { setStageFilter('') }, [moduleId])

  useEffect(() => { let active = true; async function loadMeta() { try { const res = await fetch(`/api/crud/${moduleId}/metadata`, { cache: 'no-store' }); const json = await res.json(); if (!res.ok) throw new Error(json.error || 'Could not load fields'); if (!active) return; setMeta(json.data); if (json.data?.fromERPNext) setMetaNotice(`${config.doctype} fields are loaded from your business backend.`) } catch (err) { if (active) setMetaNotice(err instanceof Error ? `Using fallback fields: ${err.message}` : 'Using fallback fields.') } } loadMeta(); return () => { active = false } }, [moduleId, config.doctype])

  function openCreate(e?: MouseEvent) { e?.preventDefault(); e?.stopPropagation(); setMode('create'); setSelected(null); setValues(cleanCreateValues(activeConfig)); setError(''); setNotice(''); setFormOpen(true) }
  function openEdit(row: Row, e?: MouseEvent) { e?.preventDefault(); e?.stopPropagation(); setMode('edit'); setSelected(row); setValues({ ...(activeConfig.defaults || {}), ...row }); setError(''); setNotice(''); setFormOpen(true) }
  function duplicateRecord(row: Row, e?: MouseEvent) { e?.preventDefault(); e?.stopPropagation(); const copy = { ...(activeConfig.defaults || {}), ...row }; for (const key of ['name','owner','creation','modified','modified_by','docstatus']) delete copy[key]; setMode('duplicate'); setSelected(null); setValues(copy); setError(''); setNotice(''); setFormOpen(true) }

  async function openDetails(row: Row, e?: MouseEvent) {
    e?.preventDefault(); e?.stopPropagation(); const id = getRowId(row); setSelected(row); setDrawerOpen(true); setError(''); if (!id) return
    setDetailLoading(true)
    try { const res = await fetch(`/api/crud/${moduleId}/${encodeURIComponent(id)}`, { cache: 'no-store' }); const data = await res.json(); if (!res.ok) throw new Error(data.error || 'Could not load record details'); const full = data.data || row; setSelected(full); setRows((prev) => prev.map((r) => (getRowId(r) === id ? { ...r, ...full } : r))) }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not load record details') }
    finally { setDetailLoading(false) }
  }
  async function reloadRecords(e?: MouseEvent) { e?.preventDefault(); e?.stopPropagation(); setLoading(true); setError(''); try { const res = await fetch(`/api/crud/${moduleId}`, { cache: 'no-store' }); const data = await res.json(); if (!res.ok) throw new Error(data.error || 'Could not refresh records'); setRows(data.data || []); setNotice(`${activeConfig.title} refreshed.`) } catch (err) { setError(err instanceof Error ? err.message : 'Could not refresh records') } finally { setLoading(false) } }
  async function saveRecord(e?: MouseEvent) {
    e?.preventDefault(); e?.stopPropagation(); const missing = activeConfig.formFields.filter((field) => field.required && (values[field.name] === undefined || values[field.name] === null || values[field.name] === '')).map((field) => field.label); if (missing.length) { setError(`Required field missing: ${missing.join(', ')}`); return }
    setLoading(true); setError(''); setNotice('')
    try { const id = selected ? getRowId(selected) : ''; const isEdit = mode === 'edit' && Boolean(id); const res = await fetch(isEdit ? `/api/crud/${moduleId}/${encodeURIComponent(id)}` : `/api/crud/${moduleId}`, { method: isEdit ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) }); const data = await res.json(); if (!res.ok) throw new Error(data.error || 'Could not save record'); const saved = data.data || data.message || values; const savedId = getRowId(saved) || getRowId(selected); if (isEdit) { setRows((prev) => prev.map((r) => (getRowId(r) === id ? { ...r, ...saved } : r))); setSelected((prev) => (prev ? { ...prev, ...saved } : saved)) } else { setRows((prev) => [saved, ...prev]); setSelected(saved) } setFormOpen(false); setNotice(`${singularTitle(activeConfig.title)} saved${savedId ? `: ${savedId}` : ''}.`) }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not save record') }
    finally { setLoading(false) }
  }
  async function deleteRecord(row: Row, e?: MouseEvent) { e?.preventDefault(); e?.stopPropagation(); const id = getRowId(row); if (!id) return; if (!window.confirm(`Delete ${id}?`)) return; setLoading(true); setError(''); try { const res = await fetch(`/api/crud/${moduleId}/${encodeURIComponent(id)}`, { method: 'DELETE' }); const data = await res.json().catch(() => ({})); if (!res.ok) throw new Error(data.error || 'Could not delete record'); setRows((prev) => prev.filter((r) => getRowId(r) !== id)); setDrawerOpen(false); setSelected(null); setNotice(`${id} deleted.`) } catch (err) { setError(err instanceof Error ? err.message : 'Could not delete record') } finally { setLoading(false) } }
  async function performAction(action: 'submit' | 'cancel', row: Row, e?: MouseEvent) { e?.preventDefault(); e?.stopPropagation(); const id = getRowId(row); if (!id) return; setLoading(true); setError(''); try { const res = await fetch(`/api/crud/${moduleId}/${encodeURIComponent(id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) }); const data = await res.json(); if (!res.ok) throw new Error(data.error || `Could not ${action} record`); const updated = data.data?.data || data.data || data.message || { ...row, docstatus: action === 'submit' ? 1 : 2, status: action === 'submit' ? 'Submitted' : 'Cancelled' }; setRows((prev) => prev.map((r) => (getRowId(r) === id ? { ...r, ...updated } : r))); setSelected((prev) => (prev ? { ...prev, ...updated } : updated)); setNotice(`${id} ${action === 'submit' ? 'submitted' : 'cancelled'}.`) } catch (err) { setError(err instanceof Error ? err.message : `Could not ${action} record`) } finally { setLoading(false) } }


  function defaultPrintFormat(doctype: string): string {
    if (doctype === 'Sales Invoice') { try { return window.localStorage.getItem('business-suite-invoice-format') || 'Sales Invoice Standard' } catch { return 'Sales Invoice Standard' } }
    if (doctype === 'Quotation') { try { return window.localStorage.getItem('business-suite-quote-format') || 'Quotation' } catch { return 'Quotation' } }
    return 'Standard'
  }
  async function openPrint(row: Row, e?: MouseEvent) {
    e?.preventDefault(); e?.stopPropagation(); const id = getRowId(row); if (!id) return;
    try {
      const format = defaultPrintFormat(activeConfig.doctype);
      const res = await fetch(`/api/documents/print-url?doctype=${encodeURIComponent(activeConfig.doctype)}&name=${encodeURIComponent(id)}&format=${encodeURIComponent(format)}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not open print view');
      window.open(data.data.url, '_blank', 'noopener,noreferrer');
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not open print view') }
  }
  function shareRecord(row: Row, e?: MouseEvent) {
    e?.preventDefault(); e?.stopPropagation(); const id = getRowId(row); if (!id) return;
    const subject = `${activeConfig.title}: ${id}`;
    const body = `Please find ${activeConfig.doctype} ${id}. You can print or download it from Business Suite.`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  const titleValue = selected ? valueToText(selected[activeConfig.nameField] || selected.name) : ''
  const children = childTables(selected)
  const selectedDocStatus = Number(selected?.docstatus ?? 0)

  return <div className="space-y-6">
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><div className="text-xs font-black uppercase tracking-[0.22em] text-emerald-600">Business Suite</div><h1 className="mt-2 text-3xl font-black tracking-tight text-[#15132E]">{activeConfig.title}</h1><p className="mt-1 max-w-2xl text-sm text-slate-500">{activeConfig.subtitle}</p>{metaNotice ? <p className="mt-2 text-xs font-semibold text-slate-400">{metaNotice}</p> : null}</div><div className="flex flex-wrap gap-2"><button type="button" onClick={reloadRecords} disabled={loading} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60">Refresh</button><button type="button" onClick={openCreate} className="rounded-xl bg-[#242048] px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-[#1b1837]">+ Add {singularTitle(activeConfig.title)}</button></div></div></div>
    {(error || notice) && <div className={`rounded-2xl border p-4 text-sm font-semibold ${error ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{error || notice}</div>}
    {stageFilter ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">Showing {visibleRows.length} record{visibleRows.length === 1 ? '' : 's'} with status <strong>{stageFilter}</strong>. <button type="button" onClick={() => setStageFilter('')} className="ml-3 rounded-lg border border-emerald-200 bg-white px-3 py-1 text-xs font-black text-emerald-700">Clear</button></div> : null}
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-col gap-3 border-b border-slate-200 p-4 md:flex-row md:items-center md:justify-between"><div><div className="text-sm font-black text-[#15132E]">{visibleRows.length} records</div><div className="text-xs text-slate-500">Click a row to open the working record drawer.</div></div><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${activeConfig.title.toLowerCase()}...`} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 md:max-w-sm" /></div><div className="overflow-x-auto"><table className="w-full border-collapse text-sm"><thead><tr className="bg-[#F9FAFC]">{tableFields.map((field) => <th key={field.name} className="border-b border-slate-200 px-4 py-3 text-left text-[11px] font-black uppercase tracking-wide text-slate-500">{field.label}</th>)}<th className="border-b border-slate-200 px-4 py-3 text-right text-[11px] font-black uppercase tracking-wide text-slate-500">Actions</th></tr></thead><tbody>{visibleRows.length === 0 ? <tr><td colSpan={tableFields.length + 1} className="px-4 py-12 text-center text-slate-500"><div className="font-bold text-slate-700">No records found.</div><button type="button" onClick={openCreate} className="mt-4 rounded-xl bg-[#242048] px-4 py-2 text-sm font-bold text-white">Create first record</button></td></tr> : visibleRows.map((row, index) => <tr key={getRowId(row) || index} onClick={(e) => openDetails(row, e)} className="cursor-pointer border-b border-slate-100 transition hover:bg-[#FAFBFE]">{tableFields.map((field) => <td key={field.name} className="px-4 py-3 text-slate-700">{isStatusField(field.name) ? <StatusChip status={valueToText(row[field.name])} /> : valueToText(row[field.name])}</td>)}<td className="px-4 py-3 text-right"><div className="inline-flex gap-2"><button type="button" onClick={(e) => openDetails(row, e)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50">View</button><button type="button" onClick={(e) => openEdit(row, e)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50">Edit</button></div></td></tr>)}</tbody></table></div></div>
    <BusinessModal open={formOpen} title={`${mode === 'edit' ? 'Edit' : mode === 'duplicate' ? 'Duplicate' : 'Create'} ${singularTitle(activeConfig.title)}`} onClose={() => setFormOpen(false)} size="xl"><DynamicForm fields={activeConfig.formFields} values={values} onChange={setValues} /><div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-5"><button type="button" onClick={() => setFormOpen(false)} className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">Cancel</button><button type="button" disabled={loading} onClick={saveRecord} className="rounded-xl bg-[#242048] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">{loading ? 'Saving...' : 'Save Record'}</button></div></BusinessModal>
    <DetailDrawer open={drawerOpen} title={titleValue || activeConfig.title} subtitle={selected ? getRowId(selected) : ''} onClose={() => setDrawerOpen(false)}>{selected ? <div className="space-y-5">{detailLoading ? <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-500">Loading full record...</div> : null}<div className="rounded-2xl border border-slate-200 bg-white p-5"><h3 className="m-0 text-base font-black text-[#15132E]">Record Actions</h3><p className="mt-1 text-sm text-slate-500">Work with this record directly from the portal.</p><div className="mt-4 flex flex-wrap gap-3"><button type="button" onClick={(e) => openEdit(selected, e)} className="rounded-xl bg-[#242048] px-4 py-2 text-sm font-bold text-white">Edit</button><button type="button" onClick={(e) => duplicateRecord(selected, e)} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700">Duplicate</button>{['Sales Invoice','Quotation','Payment Entry','Purchase Order','Sales Order'].includes(activeConfig.doctype) ? <button type="button" onClick={(e) => openPrint(selected, e)} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700">Print / PDF</button> : null}<button type="button" onClick={(e) => shareRecord(selected, e)} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700">Share</button>{activeConfig.submitEnabled && selectedDocStatus === 0 ? <button type="button" onClick={(e) => performAction('submit', selected, e)} disabled={loading} className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700 disabled:opacity-60">Submit</button> : null}{activeConfig.submitEnabled && selectedDocStatus === 1 ? <button type="button" onClick={(e) => performAction('cancel', selected, e)} disabled={loading} className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-bold text-orange-700 disabled:opacity-60">Cancel</button> : null}<button type="button" onClick={(e) => deleteRecord(selected, e)} disabled={loading || selectedDocStatus === 1} className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-700 disabled:opacity-50">Delete</button></div></div><div className="grid grid-cols-1 gap-4 md:grid-cols-2">{detailFields.map((field) => <div key={field.name} className="rounded-2xl border border-slate-200 bg-white p-4"><div className="text-[11px] font-black uppercase tracking-wide text-slate-500">{field.label}</div><div className="mt-2 break-words text-sm font-bold text-[#15132E]">{isStatusField(field.name) ? <StatusChip status={valueToText(selected[field.name])} /> : valueToText(selected[field.name])}</div></div>)}</div>{children.map(([key, items]) => <div key={key} className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="border-b border-slate-200 px-5 py-4"><h3 className="m-0 text-base font-black capitalize text-[#15132E]">{key.replace(/_/g, ' ')}</h3></div><div className="overflow-x-auto"><table className="w-full text-sm"><tbody>{items.map((item, idx) => <tr key={idx} className="border-b border-slate-100"><td className="px-4 py-3 font-bold text-slate-500">#{idx + 1}</td><td className="px-4 py-3 text-slate-700">{Object.entries(item).filter(([k, v]) => !SYSTEM_FIELDS.has(k) && v !== undefined && v !== null && v !== '').slice(0, 8).map(([k, v]) => <span key={k} className="mr-4 inline-block"><span className="font-black text-slate-400">{k.replace(/_/g, ' ')}:</span> {valueToText(v)}</span>)}</td></tr>)}</tbody></table></div></div>)}</div> : null}</DetailDrawer>
  </div>
}
