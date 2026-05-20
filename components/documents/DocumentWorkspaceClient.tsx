"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type ERPFile = {
  name?: string;
  file_name?: string;
  file_url?: string;
  attached_to_doctype?: string;
  attached_to_name?: string;
  modified?: string;
};

type CloudFile = {
  id?: string;
  name?: string;
  mimeType?: string;
  webViewLink?: string;
  path_lower?: string;
  ".tag"?: string;
  modifiedTime?: string;
  client_modified?: string;
};

type Props = {
  initialFiles: ERPFile[];
  googleConnected?: boolean;
  dropboxConnected?: boolean;
};

const STORAGE_GUIDE = [
  "Choose Google Drive or Dropbox from the cards below.",
  "Approve access using your business storage account.",
  "Return to Business Suite and open the Documents module.",
  "Attach cloud files to customers, invoices, quotations, projects or support tickets.",
  "Files linked here are saved as Business Suite engine File records so they can be used across the system.",
];

function providerLabel(provider: "google" | "dropbox") {
  return provider === "google" ? "Google Drive" : "Dropbox";
}

export default function DocumentWorkspaceClient({ initialFiles, googleConnected = false, dropboxConnected = false }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [files, setFiles] = useState<ERPFile[]>(initialFiles || []);
  const [provider, setProvider] = useState<"erpnext" | "google" | "dropbox">("erpnext");
  const [googleFiles, setGoogleFiles] = useState<CloudFile[]>([]);
  const [dropboxFiles, setDropboxFiles] = useState<CloudFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [attachedToDoctype, setAttachedToDoctype] = useState("Customer");
  const [attachedToName, setAttachedToName] = useState("");

  async function loadCloud(which: "google" | "dropbox") {
    setLoading(true);
    setNotice("");
    try {
      const res = await fetch(`/api/documents/${which}/files`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || !json.connected) {
        setNotice(`${providerLabel(which)} is not connected yet. Connect it first.`);
        return;
      }
      if (which === "google") setGoogleFiles(json.data || []);
      else setDropboxFiles(json.data || []);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not load cloud files.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (provider === "google") void loadCloud("google");
    if (provider === "dropbox") void loadCloud("dropbox");
  }, [provider]);

  async function attachGoogle(file: CloudFile) {
    setLoading(true);
    setNotice("");
    try {
      const res = await fetch("/api/documents/google/attach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: file.name,
          webViewLink: file.webViewLink,
          attached_to_doctype: attachedToDoctype,
          attached_to_name: attachedToName,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not attach Google Drive file");
      setFiles((current) => [json.data, ...current]);
      setNotice("Google Drive file linked to Business Suite engine successfully.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not attach file.");
    } finally {
      setLoading(false);
    }
  }

  async function attachDropbox(file: CloudFile) {
    setLoading(true);
    setNotice("");
    try {
      const res = await fetch("/api/documents/dropbox/attach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: file.name,
          path_lower: file.path_lower,
          attached_to_doctype: attachedToDoctype,
          attached_to_name: attachedToName,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not attach Dropbox file");
      setFiles((current) => [json.data, ...current]);
      setNotice("Dropbox file linked to Business Suite engine successfully.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not attach file.");
    } finally {
      setLoading(false);
    }
  }

  async function uploadLocal(file?: File | null) {
    if (!file) return;
    setLoading(true);
    setNotice("");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("is_private", "0");
      if (attachedToDoctype) form.append("doctype", attachedToDoctype);
      if (attachedToName) form.append("docname", attachedToName);
      const res = await fetch("/api/documents/upload", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Upload failed");
      const uploaded = json.message || json.data || json;
      setFiles((current) => [uploaded, ...current]);
      setNotice("File uploaded to Business Suite engine successfully.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not upload file.");
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const visibleErpFiles = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return files;
    return files.filter((file) => `${file.file_name || ""} ${file.attached_to_doctype || ""} ${file.attached_to_name || ""}`.toLowerCase().includes(q));
  }, [files, query]);

  const cloudList = provider === "google" ? googleFiles : dropboxFiles;

  return (
    <div className="space-y-6">
      <section className="demo-hero">
        <div className="demo-hero-grid">
          <div>
        {/* Removed paid badge from documents – all tenants can now access this module */}
            <h1 className="demo-hero-title">Document Management</h1>
            <p className="demo-hero-copy">Connect Google Drive or Dropbox, upload documents into Business Suite engine, and attach files to customers, invoices, quotations, projects and support tickets.</p>
            <div className="demo-hero-actions">
              <a className="btn btn-teal" href="/api/documents/google/connect">Connect Google Drive</a>
              <a className="btn btn-primary" href="/api/documents/dropbox/connect">Connect Dropbox</a>
              <button type="button" className="btn" onClick={() => inputRef.current?.click()}>Upload File</button>
              <input ref={inputRef} type="file" className="hidden" onChange={(e) => uploadLocal(e.target.files?.[0])} />
            </div>
          </div>
          <div className="demo-hero-plan">
            <div className="demo-eyebrow">Connection status</div>
            <h3>Storage Integrations</h3>
            <div className="demo-pill-row">
              <div className="demo-pill-box"><span>Google Drive</span><b>{googleConnected ? "Connected" : "Not connected"}</b></div>
              <div className="demo-pill-box"><span>Dropbox</span><b>{dropboxConnected ? "Connected" : "Not connected"}</b></div>
            </div>
          </div>
        </div>
      </section>

      {notice ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">{notice}</div> : null}

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {[{ key: "google", title: "Google Drive", connected: googleConnected }, { key: "dropbox", title: "Dropbox", connected: dropboxConnected }, { key: "erpnext", title: "Business Suite engine Files", connected: true }].map((item) => (
          <button key={item.key} type="button" onClick={() => setProvider(item.key as "google" | "dropbox" | "erpnext")} className={`demo-panel p-5 text-left hover:-translate-y-1 transition ${provider === item.key ? "ring-4 ring-emerald-500/20" : ""}`}>
            <div className="w-12 h-12 rounded-xl bg-purple-600 text-white grid place-items-center mb-4">▣</div>
            <h3 className="font-black text-lg">{item.title}</h3>
            <p className="text-sm text-slate-500 mt-2 leading-6">{item.key === "erpnext" ? "Files saved directly in Business Suite engine and available to all modules." : `Connect ${item.title} and link cloud files into Business Suite.`}</p>
            <span className={`chip ${item.connected ? "ok" : "warn"}`}>{item.connected ? "Ready" : "Connect"}</span>
          </button>
        ))}
      </section>

      <section className="demo-grid">
        <div className="demo-panel">
          <div className="demo-panel-head"><div><h3>Attach files to records</h3><p>Choose where uploaded or cloud-linked files should be used in the system.</p></div></div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <select value={attachedToDoctype} onChange={(e) => setAttachedToDoctype(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none">
              {['Customer','Lead','Opportunity','Quotation','Sales Invoice','Project','Task','Issue'].map((dt) => <option key={dt}>{dt}</option>)}
            </select>
            <input value={attachedToName} onChange={(e) => setAttachedToName(e.target.value)} placeholder="Record name e.g. CUST-0001" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none md:col-span-2" />
          </div>
          <div className="px-4 pb-4 text-xs text-slate-500">Tip: leave record name blank to save a general file, or enter a customer/invoice/project ID to link it directly.</div>
        </div>
        <div className="demo-panel">
          <div className="demo-panel-head"><div><h3>Customer guide</h3><p>How to link storage and use files inside Business Suite.</p></div></div>
          <div className="p-3 space-y-2">
            {STORAGE_GUIDE.map((step, index) => <div key={step} className="demo-alert"><b>Step {index + 1}</b><span>{step}</span></div>)}
          </div>
        </div>
      </section>

      {provider === "erpnext" ? (
        <section className="demo-panel">
          <div className="demo-panel-head"><div><h3>Business Suite engine Files</h3><p>Files already linked into your tenant system.</p></div><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search files..." className="rounded-xl border border-slate-200 px-4 py-2 text-sm" /></div>
          <div className="overflow-auto">
            <table className="demo-table"><thead><tr><th>File</th><th>Attached To</th><th>Record</th><th>Modified</th><th>Open</th></tr></thead><tbody>
              {visibleErpFiles.length ? visibleErpFiles.map((file) => <tr key={file.name || file.file_url || file.file_name}><td><b>{file.file_name || file.name}</b></td><td>{file.attached_to_doctype || '-'}</td><td>{file.attached_to_name || '-'}</td><td>{file.modified?.split(' ')[0] || '-'}</td><td>{file.file_url ? <a href={file.file_url} target="_blank" rel="noreferrer" className="btn btn-sm">Open</a> : '-'}</td></tr>) : <tr><td colSpan={5}>No files found yet.</td></tr>}
            </tbody></table>
          </div>
        </section>
      ) : (
        <section className="demo-panel">
          <div className="demo-panel-head"><div><h3>{providerLabel(provider)} Files</h3><p>Choose a file to link into Business Suite engine so it can be used across the system.</p></div><button className="btn btn-sm" onClick={() => loadCloud(provider)} disabled={loading}>Refresh</button></div>
          <div className="overflow-auto">
            <table className="demo-table"><thead><tr><th>File</th><th>Type</th><th>Modified</th><th>Action</th></tr></thead><tbody>
              {cloudList.length ? cloudList.map((file) => <tr key={file.id || file.path_lower || file.name}><td><b>{file.name}</b></td><td>{file.mimeType || file['.tag'] || 'File'}</td><td>{file.modifiedTime?.split('T')[0] || file.client_modified?.split('T')[0] || '-'}</td><td><button className="btn btn-sm" disabled={loading} onClick={() => provider === 'google' ? attachGoogle(file) : attachDropbox(file)}>Use in system</button></td></tr>) : <tr><td colSpan={4}>{loading ? 'Loading files...' : 'No cloud files loaded. Connect or refresh this provider.'}</td></tr>}
            </tbody></table>
          </div>
        </section>
      )}
    </div>
  );
}
