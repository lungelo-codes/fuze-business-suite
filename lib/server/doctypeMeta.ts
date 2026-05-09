import type { CrudField, CrudModuleConfig } from '@/lib/crudConfig'

type Any = Record<string, any>
export type DocFieldMeta = { fieldname: string; label?: string; fieldtype?: string; options?: string; reqd?: 0 | 1; read_only?: 0 | 1; hidden?: 0 | 1; default?: unknown }
export type ModuleMeta = { doctype: string; title: string; fields: CrudField[]; tableFields: CrudField[]; listFields: string[]; defaults: Record<string, unknown>; allowedFieldnames: string[]; rawFields: DocFieldMeta[]; fromERPNext: boolean }
const SYSTEM = new Set(['name','owner','creation','modified','modified_by','idx','docstatus','parent','parentfield','parenttype'])

// IMPORTANT:
// This file intentionally no longer calls ERPNext DocType metadata endpoints.
// The SaaS frontend must not depend on raw ERPNext permissions/fields.
// Module contracts come from lib/crudConfig.ts and data flows through
// fuze_suite.api.business_crud.* on the backend.

export async function loadDocTypeFields(_doctype:string):Promise<DocFieldMeta[]> { return [] }

export async function getModuleMeta(config:CrudModuleConfig):Promise<ModuleMeta>{
  const allowed = new Set<string>(['name','modified','docstatus'])
  for (const field of [...config.listFields, ...config.tableFields.map(f=>f.name), ...config.formFields.map(f=>f.name)]) {
    if (field && !SYSTEM.has(field)) allowed.add(field)
  }
  const listFields = Array.from(new Set(['name', ...config.listFields, 'modified'].filter(Boolean)))
  return {
    doctype: config.doctype,
    title: config.title,
    fields: config.formFields,
    tableFields: config.tableFields,
    listFields,
    defaults: config.defaults || {},
    allowedFieldnames: Array.from(allowed),
    rawFields: [],
    fromERPNext: false,
  }
}

export function sanitizeDocFromMeta(values:Record<string,unknown>, meta:ModuleMeta){
  const allowed = new Set(meta.allowedFieldnames)
  const doc:Record<string,unknown> = {}
  for (const [key,value] of Object.entries(values || {})) {
    if (SYSTEM.has(key) || !allowed.has(key) || value === undefined || value === '') continue
    doc[key] = value
  }
  return doc
}
