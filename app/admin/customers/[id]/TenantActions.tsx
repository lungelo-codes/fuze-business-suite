"use client";

import { useState } from "react";

interface TenantActionsProps {
  tenantId: string;
  currentStatus?: string;
}

export default function TenantActions({ tenantId, currentStatus }: TenantActionsProps) {
  const [status, setStatus] = useState(currentStatus);
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function updateStatus(action: "activate" | "suspend") {
    setLoading(action);
    setMessage("");
    try {
      const res = await fetch(`/api/admin/tenants/${encodeURIComponent(tenantId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Update failed");
      setStatus(action === "activate" ? "Active" : "Suspended");
      setMessage(json.message || `Tenant ${action}d successfully`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Action failed");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div>
      <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 0 }}>
        Manage the tenant account status. Changes are applied via the Business Suite API.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
        <button
          className="btn btn-teal"
          style={{ justifyContent: "center" }}
          onClick={() => updateStatus("activate")}
          disabled={loading !== null || status === "Active"}
        >
          {loading === "activate" ? "Activating…" : "✓ Activate Tenant"}
        </button>

        <button
          className="btn"
          style={{ justifyContent: "center", borderColor: "var(--danger)", color: "var(--danger)" }}
          onClick={() => updateStatus("suspend")}
          disabled={loading !== null || status === "Suspended"}
        >
          {loading === "suspend" ? "Suspending…" : "✗ Suspend Tenant"}
        </button>
      </div>

      {message && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 9,
            fontSize: 13,
            background: message.toLowerCase().includes("fail") || message.toLowerCase().includes("error")
              ? "var(--danger-bg)"
              : "var(--ok-bg)",
            color: message.toLowerCase().includes("fail") || message.toLowerCase().includes("error")
              ? "var(--danger)"
              : "var(--ok)",
          }}
        >
          {message}
        </div>
      )}

    </div>
  );
}
