'use client'

import { MouseEvent, useEffect, useMemo, useState } from 'react'
import BusinessModal from '@/components/modals/BusinessModal'
import DetailDrawer from '@/components/drawers/DetailDrawer'
import DynamicForm from '@/components/forms/DynamicForm'
import StatusChip from '@/components/StatusChip'
import { WorkspaceCharts } from '@/components/charts/InteractiveBusinessCharts'
import type { CrudField, CrudModuleConfig } from '@/lib/crudConfig'

type Row = Record<string, unknown>
type EmailTemplate = { name: string; subject?: string; response?: string }
type MetadataResponse = {
  doctype: string
  fields: CrudField[]
  tableFields: CrudField[]
  listFields: string[]
  defaults: Record<string, unknown>
  fromERPNext: boolean
}

const SYSTEM_FIELDS = new Set(['owner', 'creation', 'modified_by', 'parent', 'parentfield', 'parenttype', 'idx'])
const PRINTABLE_DOCTYPES = new Set(['Sales Invoice', 'Quotation', 'Salary Slip'])

function defaultRecipient(row: Row): string {
  return String(row.email_id || row.contact_email || row.customer_email || row.employee_email || row.prefered_email || row.email || '')
}

function isPrintableDoctype(doctype: string): boolean {
  return PRINTABLE_DOCTYPES.has(doctype)
}

function getRowId(row: Row | null): string {
  return row ? String(row.name || row.id || '') : ''
}

function valueToText(value: unknown): string {
  if (value === undefined || value === null || value === '') return '—'
  if (typeof value === 'number') return value.toLocaleString('en-ZA')
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (Array.isArray(value)) return `${value.length} item${value.length === 1 ? '' : 's'}`
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function isStatusField(name: string): boolean {
  const n = name.toLowerCase()
  return n.includes('status') || n === 'docstatus'
}

function singularTitle(title: string): string {
  if (title === 'Sales Invoices') return 'Sales Invoice'
  if (title === 'Payment Entries') return 'Payment Entry'
  if (title.endsWith('ies')) return `${title.slice(0, -3)}y`
  if (title.endsWith('s')) return title.slice(0, -1)
  return title
}

function cleanCreateValues(config: CrudModuleConfig): Row {
  const values: Row = { ...(config.defaults || {}) }
  for (const field of config.formFields) {
    if (values[field.name] === undefined && field.type === 'checkbox') values[field.name] = 0
  }
  return values
}

function uniqueFields(config: CrudModuleConfig): CrudField[] {
  const map = new Map<string, CrudField>()
  map.set('name', { name: 'name', label: 'Record ID', readOnly: true })
  for (const field of [...config.tableFields, ...config.formFields]) {
    if (!map.has(field.name)) map.set(field.name, field)
  }
  map.set('modified', { name: 'modified', label: 'Last Updated', readOnly: true })
  return Array.from(map.values())
}

function childTables(row: Row | null): Array<[string, Row[]]> {
  if (!row) return []
  return Object.entries(row).filter(([, value]) => Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') as Array<[string, Row[]]>
}

function buildConfig(base: CrudModuleConfig, meta?: MetadataResponse | null): CrudModuleConfig {
  if (!meta) return base
  return {
    ...base,
    doctype: meta.doctype || base.doctype,
    listFields: meta.listFields?.length ? meta.listFields : base.listFields,
    tableFields: meta.tableFields?.length ? meta.tableFields : base.tableFields,
    formFields: meta.fields?.length ? meta.fields : base.formFields,
    defaults: { ...(base.defaults || {}), ...(meta.defaults || {}) },
  }
}

function money(value: unknown) {
  const n = Number(value || 0)
  if (!Number.isFinite(n) || n === 0) return '—'
  return `R${n.toLocaleString('en-ZA')}`
}

function getLikelyValue(row: Row): unknown {
  return row.grand_total || row.outstanding_amount || row.paid_amount || row.opportunity_amount || row.amount || row.total || row.base_grand_total
}

function getPrimary(row: Row, config: CrudModuleConfig): string {
  return valueToText(row[config.nameField] || row.customer_name || row.lead_name || row.party_name || row.employee_name || row.subject || row.title || row.name)
}

function getSecondary(row: Row): string {
  return valueToText(row.company || row.customer || row.status || row.email_id || row.modified || row.owner)
}

function stageTitle(field: string) {
  return field.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase())
}

export default function CrudModulePage({ moduleId, config, initialRows = [] }: { moduleId: string; config: CrudModuleConfig; initialRows?: Row[] }) {
  const [meta, setMeta] = useState<MetadataResponse | null>(null)
  const [rows, setRows] = useState<Row[]>(initialRows || [])
  const [query, setQuery] = useState('')
  const [stageFilter, setStageFilter] = useState('')
  const [tab, setTab] = useState('Dashboard')
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
  const [emailOpen, setEmailOpen] = useState(false)
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [emailValues, setEmailValues] = useState({ to: '', cc: '', bcc: '', template: '', subject: '', content: '', attach_pdf: true })

  const activeConfig = useMemo(() => buildConfig(config, meta), [config, meta])
  const tableFields = activeConfig.tableFields.filter((field) => !field.hideOnTable).slice(0, 6)
  const detailFields = useMemo(() => uniqueFields(activeConfig), [activeConfig])
  const statusField = useMemo(
    () => tableFields.find((field) => field.name === 'status')?.name || activeConfig.formFields.find((field) => field.name === 'status')?.name || '',
    [tableFields, activeConfig.formFields]
  )

  const stageCards = useMemo(() => {
    if (!statusField) return [] as Array<{ stage: string; count: number }>
    const counts = new Map<string, number>()
    for (const row of rows) {
      const stage = valueToText(row[statusField])
      if (!stage || stage === '—') continue
      counts.set(stage, (counts.get(stage) || 0) + 1)
    }
    return Array.from(counts.entries()).map(([stage, count]) => ({ stage, count })).sort((a, b) => a.stage.localeCompare(b.stage))
  }, [rows, statusField])

  const visibleRows = useMemo(() => {
    const term = query.trim().toLowerCase()
    return rows.filter((row) => {
      const stageOk = !stageFilter || !statusField || valueToText(row[statusField]) === stageFilter
      const queryOk = !term || JSON.stringify(row).toLowerCase().includes(term)
      return stageOk && queryOk
    })
  }, [rows, query, stageFilter, statusField])

  const totalValue = useMemo(() => rows.reduce((sum, row) => sum + Number(getLikelyValue(row) || 0), 0), [rows])
  const activeCount = useMemo(() => rows.filter((row) => !String(row[statusField] || '').toLowerCase().match(/closed|cancel|lost|inactive/)).length, [rows, statusField])
  const chartStatusData = useMemo(() => stageCards.map((card) => ({ label: card.stage, count: card.count })), [stageCards])
  const chartValueData = useMemo(() => rows.slice(0, 8).reverse().map((row, index) => ({ label: String(row.name || row.title || row.subject || `#${index + 1}`).slice(0, 10), value: Number(getLikelyValue(row) || 0) })), [rows])

  useEffect(() => { setStageFilter(''); setTab('Dashboard') }, [moduleId])

  useEffect(() => {
    let active = true
    async function loadMeta() {
      try {
        const res = await fetch(`/api/crud/${moduleId}/metadata`, { cache: 'no-store' })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Could not load fields')
        if (!active) return
        setMeta(json.data)
        if (json.data?.fromERPNext) setMetaNotice(`${config.doctype} fields are loaded from your tenant backend.`)
      } catch (err) {
        if (active) setMetaNotice(err instanceof Error ? `Using fallback fields: ${err.message}` : 'Using fallback fields.')
      }
    }
    loadMeta()
    return () => { active = false }
  }, [moduleId, config.doctype])

  function openCreate(e?: MouseEvent) {
    e?.preventDefault(); e?.stopPropagation()
    setMode('create'); setSelected(null); setValues(cleanCreateValues(activeConfig)); setError(''); setNotice(''); setFormOpen(true)
  }

  function openEdit(row: Row, e?: MouseEvent) {
    e?.preventDefault(); e?.stopPropagation()
    setMode('edit'); setSelected(row); setValues({ ...(activeConfig.defaults || {}), ...row }); setError(''); setNotice(''); setFormOpen(true)
  }

  function duplicateRecord(row: Row, e?: MouseEvent) {
    e?.preventDefault(); e?.stopPropagation()
    const copy = { ...(activeConfig.defaults || {}), ...row }
    for (const key of ['name', 'owner', 'creation', 'modified', 'modified_by', 'docstatus']) delete copy[key]
    setMode('duplicate'); setSelected(null); setValues(copy); setError(''); setNotice(''); setFormOpen(true)
  }

  async function openDetails(row: Row, e?: MouseEvent) {
    e?.preventDefault(); e?.stopPropagation()
    const id = getRowId(row)
    setSelected(row); setDrawerOpen(true); setError('')
    if (!id) return
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/crud/${moduleId}/${encodeURIComponent(id)}`, { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not load record details')
      const full = data.data || row
      setSelected(full)
      setRows((prev) => prev.map((r) => (getRowId(r) === id ? { ...r, ...full } : r)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load record details')
    } finally {
      setDetailLoading(false)
    }
  }

  async function reloadRecords(e?: MouseEvent) {
    e?.preventDefault(); e?.stopPropagation()
    setLoading(true); setError('')
    try {
      const res = await fetch(`/api/crud/${moduleId}`, { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not refresh records')
      setRows(data.data || [])
      setNotice(`${activeConfig.title} refreshed.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not refresh records')
    } finally {
      setLoading(false)
    }
  }

  async function saveRecord(e?: MouseEvent) {
    e?.preventDefault(); e?.stopPropagation()
    const missing = activeConfig.formFields
      .filter((field) => field.required && (values[field.name] === undefined || values[field.name] === null || values[field.name] === ''))
      .map((field) => field.label)
    if (missing.length) { setError(`Required field missing: ${missing.join(', ')}`); return }
    setLoading(true); setError(''); setNotice('')
    try {
      const id = selected ? getRowId(selected) : ''
      const isEdit = mode === 'edit' && Boolean(id)
      const res = await fetch(isEdit ? `/api/crud/${moduleId}/${encodeURIComponent(id)}` : `/api/crud/${moduleId}`, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not save record')
      const saved = data.data || data.message || values
      const savedId = getRowId(saved) || getRowId(selected)
      if (isEdit) {
        setRows((prev) => prev.map((r) => (getRowId(r) === id ? { ...r, ...saved } : r)))
        setSelected((prev) => (prev ? { ...prev, ...saved } : saved))
      } else {
        setRows((prev) => [saved, ...prev])
        setSelected(saved)
      }
      setFormOpen(false)
      setNotice(`${singularTitle(activeConfig.title)} saved${savedId ? `: ${savedId}` : ''}.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save record')
    } finally {
      setLoading(false)
    }
  }

  async function deleteRecord(row: Row, e?: MouseEvent) {
    e?.preventDefault(); e?.stopPropagation()
    const id = getRowId(row)
    if (!id || !window.confirm(`Delete ${id}?`)) return
    setLoading(true); setError('')
    try {
      const res = await fetch(`/api/crud/${moduleId}/${encodeURIComponent(id)}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Could not delete record')
      setRows((prev) => prev.filter((r) => getRowId(r) !== id))
      setDrawerOpen(false); setSelected(null); setNotice(`${id} deleted.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete record')
    } finally {
      setLoading(false)
    }
  }

  async function performAction(action: 'submit' | 'cancel', row: Row, e?: MouseEvent) {
    e?.preventDefault(); e?.stopPropagation()
    const id = getRowId(row)
    if (!id) return
    setLoading(true); setError('')
    try {
      const res = await fetch(`/api/crud/${moduleId}/${encodeURIComponent(id)}/${action}`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `Could not ${action} record`)
      const updated = data.data || data.message || row
      setRows((prev) => prev.map((r) => (getRowId(r) === id ? { ...r, ...updated } : r)))
      setSelected((prev) => (prev ? { ...prev, ...updated } : updated))
      setNotice(`${id} ${action === 'submit' ? 'submitted' : 'cancelled'}.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : `Could not ${action} record`)
    } finally {
      setLoading(false)
    }
  }

  async function openPrint(row: Row, e?: MouseEvent) {
    e?.preventDefault(); e?.stopPropagation()
    const id = getRowId(row)
    if (!id || !isPrintableDoctype(activeConfig.doctype)) return
    setLoading(true); setError('')
    try {
      const res = await fetch(`/api/documents/print?doctype=${encodeURIComponent(activeConfig.doctype)}&name=${encodeURIComponent(id)}&pdf=1`, { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Could not open print view')
      const payload = json.data?.data || json.data || {}
      if (payload.pdf) {
        const byteCharacters = atob(payload.pdf)
        const byteNumbers = Array.from(byteCharacters, (char) => char.charCodeAt(0))
        const blob = new Blob([new Uint8Array(byteNumbers)], { type: 'application/pdf' })
        const url = URL.createObjectURL(blob)
        window.open(url, '_blank', 'noopener,noreferrer')
      } else if (payload.html) {
        const win = window.open('', '_blank', 'noopener,noreferrer')
        win?.document.write(payload.html)
        win?.document.close()
      } else {
        throw new Error('No printable document was returned')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open print view')
    } finally {
      setLoading(false)
    }
  }

  async function openEmailComposer(row: Row, e?: MouseEvent) {
    e?.preventDefault(); e?.stopPropagation()
    const id = getRowId(row)
    if (!id || !isPrintableDoctype(activeConfig.doctype)) return
    setSelected(row)
    setEmailValues({
      to: defaultRecipient(row),
      cc: '',
      bcc: '',
      template: '',
      subject: `${singularTitle(activeConfig.title)} ${id}`,
      content: `Please find attached ${singularTitle(activeConfig.title).toLowerCase()} ${id}.`,
      attach_pdf: true,
    })
    setEmailOpen(true)
    try {
      const res = await fetch(`/api/email/templates?doctype=${encodeURIComponent(activeConfig.doctype)}`, { cache: 'no-store' })
      const json = await res.json()
      setTemplates(Array.isArray(json.data) ? json.data : [])
    } catch {
      setTemplates([])
    }
  }

  async function renderTemplate(templateName: string) {
    setEmailValues((prev) => ({ ...prev, template: templateName }))
    const id = selected ? getRowId(selected) : ''
    if (!templateName || !id) return
    try {
      const res = await fetch('/api/email/render-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template: templateName, doctype: activeConfig.doctype, name: id }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Could not render template')
      const payload = json.data?.data || json.data || {}
      setEmailValues((prev) => ({ ...prev, subject: payload.subject || prev.subject, content: payload.content || prev.content }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not render template')
    }
  }

  async function sendDocumentEmail(e?: MouseEvent) {
    e?.preventDefault(); e?.stopPropagation()
    const id = selected ? getRowId(selected) : ''
    if (!id) return
    if (!emailValues.to.trim()) { setError('Recipient email is required'); return }
    setLoading(true); setError(''); setNotice('')
    try {
      const res = await fetch('/api/documents/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctype: activeConfig.doctype,
          name: id,
          to: emailValues.to,
          cc: emailValues.cc,
          bcc: emailValues.bcc,
          template: emailValues.template || undefined,
          subject: emailValues.subject,
          content: emailValues.content,
          attach_pdf: emailValues.attach_pdf ? 1 : 0,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Could not send email')
      setEmailOpen(false)
      setNotice(`Email queued for ${id}.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send email')
    } finally {
      setLoading(false)
    }
  }

  function shareRecord(row: Row, e?: MouseEvent) {
    if (isPrintableDoctype(activeConfig.doctype)) return openEmailComposer(row, e)
    e?.preventDefault(); e?.stopPropagation()
    const id = getRowId(row)
    if (!id) return
    const subject = `${activeConfig.title}: ${id}`
    const body = `Please find ${activeConfig.doctype} ${id}. You can print or download it from Business Suite.`
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  const titleValue = selected ? valueToText(selected[activeConfig.nameField] || selected.name) : ''
  const children = childTables(selected)
  const selectedDocStatus = Number(selected?.docstatus ?? 0)
  const tabs = ['Dashboard', 'Records', 'Create', 'Activity']
  const stageLabel = statusField ? stageTitle(statusField) : 'Status'

  return (
    <div className="demo-workspace animate-fade-up crud-demo-workspace">
      <section className="demo-hero demo-hero-lift">
        <div className="demo-hero-grid">
          <div>
            <div className="demo-eyebrow">{activeConfig.doctype}</div>
            <h1 className="demo-hero-title">{activeConfig.title}</h1>
            <p className="demo-hero-copy">{activeConfig.subtitle}</p>
            {metaNotice ? <p className="demo-hero-note">{metaNotice}</p> : null}
            <div className="demo-hero-actions">
              <button type="button" onClick={openCreate} className="btn btn-teal">+ Add {singularTitle(activeConfig.title)}</button>
              <button type="button" onClick={reloadRecords} disabled={loading} className="btn">{loading ? 'Refreshing…' : 'Refresh'}</button>
            </div>
          </div>
          <div className="demo-hero-plan">
            <div className="demo-eyebrow">Workspace summary</div>
            <h3>{rows.length} records</h3>
            <p className="demo-hero-copy">Tenant-safe records from Business Suite engine with modern daily workflows.</p>
            <div className="demo-pill-row">
              <div className="demo-pill-box"><span>Active</span><b>{activeCount}</b></div>
              <div className="demo-pill-box"><span>Value</span><b>{money(totalValue)}</b></div>
            </div>
          </div>
        </div>
      </section>

      {(error || notice) ? <div className={`demo-banner ${error ? 'danger' : 'ok'}`}>{error || notice}</div> : null}

      <section className="demo-tabbar">
        {tabs.map((item) => <button key={item} type="button" onClick={() => setTab(item)} className={tab === item ? 'active' : ''}>{item}</button>)}
      </section>

      {tab === 'Dashboard' ? (
        <section className="demo-stat-grid">
          <button type="button" onClick={() => setTab('Records')} className="demo-stat-card demo-interactive-card">
            <div className="demo-stat-top"><div><div className="demo-stat-label">Total Records</div><div className="demo-stat-value">{rows.length}</div><div className="demo-stat-hint">Click to open records</div></div><div className="demo-stat-icon">↗</div></div>
          </button>
          <button type="button" onClick={() => setStageFilter('')} className="demo-stat-card demo-interactive-card">
            <div className="demo-stat-top"><div><div className="demo-stat-label">Active Work</div><div className="demo-stat-value">{activeCount}</div><div className="demo-stat-hint">Open and actionable items</div></div><div className="demo-stat-icon">✓</div></div>
          </button>
          <button type="button" className="demo-stat-card demo-interactive-card">
            <div className="demo-stat-top"><div><div className="demo-stat-label">Total Value</div><div className="demo-stat-value">{money(totalValue)}</div><div className="demo-stat-hint">Based on visible financial fields</div></div><div className="demo-stat-icon">R</div></div>
          </button>
          <button type="button" onClick={openCreate} className="demo-stat-card demo-interactive-card">
            <div className="demo-stat-top"><div><div className="demo-stat-label">Quick Create</div><div className="demo-stat-value">+</div><div className="demo-stat-hint">Add a new {singularTitle(activeConfig.title)}</div></div><div className="demo-stat-icon">＋</div></div>
          </button>
        </section>
      ) : null}

      {tab === 'Dashboard' ? <WorkspaceCharts statusData={chartStatusData} valueData={chartValueData} /> : null}

      {tab === 'Dashboard' && stageCards.length > 0 ? (
        <section className="demo-panel">
          <div className="demo-panel-head"><div><h3>{stageLabel} Overview</h3><p>Click a stage to filter this workspace.</p></div></div>
          <div className="crud-stage-grid">
            {stageCards.map((card) => (
              <button key={card.stage} type="button" onClick={() => { setStageFilter(stageFilter === card.stage ? '' : card.stage); setTab('Records') }} className={`crud-stage-card ${stageFilter === card.stage ? 'active' : ''}`}>
                <span>{stageLabel}</span>
                <StatusChip status={card.stage} />
                <b>{card.count}</b>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {tab === 'Create' ? (
        <section className="demo-panel crud-create-panel">
          <div className="demo-panel-head"><div><h3>Create {singularTitle(activeConfig.title)}</h3><p>Use the same secure business backend with a cleaner SaaS form.</p></div></div>
          <div className="p-5"><DynamicForm fields={activeConfig.formFields} values={values} onChange={setValues} /><div className="crud-form-actions"><button type="button" onClick={() => setTab('Dashboard')} className="btn">Cancel</button><button type="button" disabled={loading} onClick={saveRecord} className="btn btn-teal">{loading ? 'Saving…' : 'Save Record'}</button></div></div>
        </section>
      ) : null}

      {tab === 'Activity' ? (
        <section className="demo-grid">
          <div className="demo-panel"><div className="demo-panel-head"><div><h3>Activity Timeline</h3><p>Recent movement in this workspace.</p></div></div><div className="p-5"><div className="demo-timeline">{rows.slice(0, 6).map((row, index) => <button key={getRowId(row) || index} type="button" onClick={(e) => openDetails(row, e)} className="demo-timeline-item"><span className="demo-timeline-dot" /><strong>{index === 0 ? 'Latest update' : 'Record activity'}</strong><em>{getPrimary(row, activeConfig)}</em><small>{getSecondary(row)}</small></button>)}</div></div></div>
          <div className="demo-panel"><div className="demo-panel-head"><div><h3>Quick Actions</h3><p>Daily actions for this module.</p></div></div><div className="demo-alert-list"><button type="button" onClick={openCreate} className="demo-alert">Create record<span>Add a new {singularTitle(activeConfig.title)}</span></button><button type="button" onClick={reloadRecords} className="demo-alert">Refresh data<span>Pull latest tenant records</span></button><button type="button" onClick={() => setTab('Records')} className="demo-alert">View table<span>Search and open all records</span></button></div></div>
        </section>
      ) : null}

      {tab === 'Dashboard' || tab === 'Records' ? (
        <section className="demo-grid crud-record-grid">
          <div className="demo-panel crud-record-panel">
            <div className="demo-panel-head">
              <div><h3>{stageFilter ? `${stageFilter} Records` : `${visibleRows.length} Records`}</h3><p>Search, filter and open working Business Suite engine records without leaving the portal.</p></div>
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${activeConfig.title.toLowerCase()}...`} className="crud-search-input" />
            </div>
            {stageFilter ? <div className="crud-active-filter">Showing {visibleRows.length} record{visibleRows.length === 1 ? '' : 's'} with {stageLabel} <b>{stageFilter}</b>. <button type="button" onClick={() => setStageFilter('')}>Clear</button></div> : null}
            <div className="overflow-auto">
              <table className="demo-table crud-demo-table">
                <thead><tr>{tableFields.map((field) => <th key={field.name}>{field.label}</th>)}<th>Actions</th></tr></thead>
                <tbody>
                  {visibleRows.length === 0 ? (
                    <tr><td colSpan={tableFields.length + 1}><div className="crud-empty"><b>No records found.</b><span>Create your first record or clear filters.</span><button type="button" onClick={openCreate} className="btn btn-teal">Create first record</button></div></td></tr>
                  ) : visibleRows.map((row, index) => (
                    <tr key={getRowId(row) || index} onClick={(e) => openDetails(row, e)}>
                      {tableFields.map((field) => <td key={field.name}>{isStatusField(field.name) ? <StatusChip status={valueToText(row[field.name])} /> : valueToText(row[field.name])}</td>)}
                      <td><div className="crud-actions"><button type="button" onClick={(e) => openDetails(row, e)} className="btn btn-sm">View</button><button type="button" onClick={(e) => openEdit(row, e)} className="btn btn-sm">Edit</button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="demo-panel">
            <div className="demo-panel-head"><div><h3>Smart Actions</h3><p>Quick actions for this workspace.</p></div></div>
            <div className="demo-alert-list">
              <button type="button" onClick={openCreate} className="demo-alert">Add {singularTitle(activeConfig.title)}<span>Create a record using Business Suite engine fields</span></button>
              <button type="button" onClick={reloadRecords} className="demo-alert">Refresh live data<span>Load latest tenant records</span></button>
              <button type="button" onClick={() => setTab('Activity')} className="demo-alert">Open activity<span>Review recent records</span></button>
              {stageCards.slice(0, 4).map((card) => <button key={card.stage} type="button" onClick={() => { setStageFilter(card.stage); setTab('Records') }} className="demo-alert">{card.stage}<span>{card.count} record{card.count === 1 ? '' : 's'}</span></button>)}
            </div>
          </div>
        </section>
      ) : null}

      <BusinessModal open={formOpen} title={`${mode === 'edit' ? 'Edit' : mode === 'duplicate' ? 'Duplicate' : 'Create'} ${singularTitle(activeConfig.title)}`} onClose={() => setFormOpen(false)} size="xl">
        <DynamicForm fields={activeConfig.formFields} values={values} onChange={setValues} />
        <div className="crud-form-actions"><button type="button" onClick={() => setFormOpen(false)} className="btn">Cancel</button><button type="button" disabled={loading} onClick={saveRecord} className="btn btn-teal">{loading ? 'Saving…' : 'Save Record'}</button></div>
      </BusinessModal>


      <BusinessModal open={emailOpen} title={`Email ${selected ? getRowId(selected) : ''}`} onClose={() => setEmailOpen(false)} size="lg">
        <div className="crud-form-actions" style={{ display: 'grid', gap: 12 }}>
          <label className="crud-detail-card"><span>To</span><input className="crud-search-input" value={emailValues.to} onChange={(e) => setEmailValues((prev) => ({ ...prev, to: e.target.value }))} placeholder="customer@example.com" /></label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label className="crud-detail-card"><span>CC</span><input className="crud-search-input" value={emailValues.cc} onChange={(e) => setEmailValues((prev) => ({ ...prev, cc: e.target.value }))} /></label>
            <label className="crud-detail-card"><span>BCC</span><input className="crud-search-input" value={emailValues.bcc} onChange={(e) => setEmailValues((prev) => ({ ...prev, bcc: e.target.value }))} /></label>
          </div>
          <label className="crud-detail-card"><span>ERPNext Email Template</span><select className="crud-search-input" value={emailValues.template} onChange={(e) => renderTemplate(e.target.value)}><option value="">No template</option>{templates.map((tpl) => <option key={tpl.name} value={tpl.name}>{tpl.name}</option>)}</select></label>
          <label className="crud-detail-card"><span>Subject</span><input className="crud-search-input" value={emailValues.subject} onChange={(e) => setEmailValues((prev) => ({ ...prev, subject: e.target.value }))} /></label>
          <label className="crud-detail-card"><span>Message</span><textarea className="crud-search-input" rows={7} value={emailValues.content} onChange={(e) => setEmailValues((prev) => ({ ...prev, content: e.target.value }))} /></label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}><input type="checkbox" checked={emailValues.attach_pdf} onChange={(e) => setEmailValues((prev) => ({ ...prev, attach_pdf: e.target.checked }))} /> Attach branded PDF</label>
          <div className="crud-form-actions"><button type="button" onClick={() => setEmailOpen(false)} className="btn">Cancel</button><button type="button" disabled={loading} onClick={sendDocumentEmail} className="btn btn-teal">{loading ? 'Sending…' : 'Send Email'}</button></div>
        </div>
      </BusinessModal>

      <DetailDrawer open={drawerOpen} title={titleValue || activeConfig.title} subtitle={selected ? getRowId(selected) : ''} onClose={() => setDrawerOpen(false)}>
        {selected ? <div className="crud-drawer-space">
          {detailLoading ? <div className="demo-banner">Loading full record...</div> : null}
          <div className="demo-panel crud-drawer-actions"><div className="demo-panel-head"><div><h3>Record Actions</h3><p>Work with this record directly from Business Suite.</p></div></div><div className="crud-action-strip"><button type="button" onClick={(e) => openEdit(selected, e)} className="btn btn-teal">Edit</button><button type="button" onClick={(e) => duplicateRecord(selected, e)} className="btn">Duplicate</button>{isPrintableDoctype(activeConfig.doctype) ? <button type="button" onClick={(e) => openPrint(selected, e)} className="btn">Print / PDF</button> : null}{isPrintableDoctype(activeConfig.doctype) ? <button type="button" onClick={(e) => openEmailComposer(selected, e)} className="btn">Email</button> : null}<button type="button" onClick={(e) => shareRecord(selected, e)} className="btn">Share</button>{activeConfig.submitEnabled && selectedDocStatus === 0 ? <button type="button" onClick={(e) => performAction('submit', selected, e)} disabled={loading} className="btn btn-teal">Submit</button> : null}{activeConfig.submitEnabled && selectedDocStatus === 1 ? <button type="button" onClick={(e) => performAction('cancel', selected, e)} disabled={loading} className="btn">Cancel</button> : null}<button type="button" onClick={(e) => deleteRecord(selected, e)} disabled={loading || selectedDocStatus === 1} className="btn crud-danger">Delete</button></div></div>
          <div className="crud-detail-grid">{detailFields.map((field) => <div key={field.name} className="crud-detail-card"><span>{field.label}</span><b>{isStatusField(field.name) ? <StatusChip status={valueToText(selected[field.name])} /> : valueToText(selected[field.name])}</b></div>)}</div>
          {children.map(([key, items]) => <div key={key} className="demo-panel"><div className="demo-panel-head"><div><h3>{key.replace(/_/g, ' ')}</h3><p>Linked child table records</p></div></div><div className="overflow-auto"><table className="demo-table"><tbody>{items.map((item, idx) => <tr key={idx}><td>#{idx + 1}</td><td>{Object.entries(item).filter(([k, v]) => !SYSTEM_FIELDS.has(k) && v !== undefined && v !== null && v !== '').slice(0, 8).map(([k, v]) => <span key={k} className="crud-inline-field"><b>{k.replace(/_/g, ' ')}:</b> {valueToText(v)}</span>)}</td></tr>)}</tbody></table></div></div>)}
        </div> : null}
      </DetailDrawer>
    </div>
  )
}
