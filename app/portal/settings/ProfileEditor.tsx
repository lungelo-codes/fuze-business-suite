"use client";
import { useState } from "react";

interface ProfileEditorProps {
  company: string;
  plan: string;
  role: string;
  modules: string[];
}

export default function ProfileEditor({ company, plan, role, modules }: ProfileEditorProps) {
  const [profile, setProfile] = useState({ fullName: "", mobile: "", phone: "" });
  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [passwordMsg, setPasswordMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileLoading(true);
    setProfileMsg(null);
    try {
      const res = await fetch("/api/portal/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: profile.fullName || undefined,
          mobile_no: profile.mobile || undefined,
          phone: profile.phone || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setProfileMsg({ type: "ok", text: "Profile updated successfully." });
      } else {
        setProfileMsg({ type: "err", text: data.error || "Update failed." });
      }
    } catch {
      setProfileMsg({ type: "err", text: "Network error. Please try again." });
    } finally {
      setProfileLoading(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (passwords.next !== passwords.confirm) {
      setPasswordMsg({ type: "err", text: "New passwords do not match." });
      return;
    }
    if (passwords.next.length < 8) {
      setPasswordMsg({ type: "err", text: "Password must be at least 8 characters." });
      return;
    }
    setPasswordLoading(true);
    setPasswordMsg(null);
    try {
      const res = await fetch("/api/portal/profile/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: passwords.current, newPassword: passwords.next }),
      });
      const data = await res.json();
      if (res.ok) {
        setPasswordMsg({ type: "ok", text: "Password changed successfully." });
        setPasswords({ current: "", next: "", confirm: "" });
      } else {
        setPasswordMsg({ type: "err", text: data.error || "Password change failed." });
      }
    } catch {
      setPasswordMsg({ type: "err", text: "Network error. Please try again." });
    } finally {
      setPasswordLoading(false);
    }
  }

  return (
    <div>
      {/* Profile update form */}
      <div className="card card-pad" style={{ marginBottom: 18 }}>
        <h3 style={{ marginTop: 0, marginBottom: 16 }}>Update Profile</h3>
        <form onSubmit={saveProfile}>
          <div className="field-row">
            <div className="field">
              <label className="label">Full Name</label>
              <input
                className="inp"
                type="text"
                placeholder="Your full name"
                value={profile.fullName}
                onChange={(e) => setProfile((p) => ({ ...p, fullName: e.target.value }))}
                disabled={profileLoading}
              />
            </div>
            <div className="field">
              <label className="label">Mobile Number</label>
              <input
                className="inp"
                type="tel"
                placeholder="+27 82 000 0000"
                value={profile.mobile}
                onChange={(e) => setProfile((p) => ({ ...p, mobile: e.target.value }))}
                disabled={profileLoading}
              />
            </div>
          </div>
          <div className="field">
            <label className="label">Phone Number</label>
            <input
              className="inp"
              type="tel"
              placeholder="+27 11 000 0000"
              value={profile.phone}
              onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
              disabled={profileLoading}
            />
          </div>
          {profileMsg && (
            <div
              className={profileMsg.type === "ok" ? "success" : "error"}
              style={{ marginBottom: 12 }}
            >
              {profileMsg.text}
            </div>
          )}
          <button
            className="btn btn-primary"
            type="submit"
            disabled={profileLoading}
            style={{ minWidth: 160 }}
          >
            {profileLoading ? "Saving…" : "Save Changes"}
          </button>
        </form>
      </div>

      {/* Change password */}
      <div className="card card-pad" style={{ marginBottom: 18 }}>
        <h3 style={{ marginTop: 0, marginBottom: 16 }}>Change Password</h3>
        <form onSubmit={changePassword}>
          <div className="field">
            <label className="label">Current Password</label>
            <input
              className="inp"
              type="password"
              placeholder="••••••••"
              value={passwords.current}
              onChange={(e) => setPasswords((p) => ({ ...p, current: e.target.value }))}
              disabled={passwordLoading}
            />
          </div>
          <div className="field-row">
            <div className="field">
              <label className="label">New Password</label>
              <input
                className="inp"
                type="password"
                placeholder="Min. 8 characters"
                value={passwords.next}
                onChange={(e) => setPasswords((p) => ({ ...p, next: e.target.value }))}
                disabled={passwordLoading}
              />
            </div>
            <div className="field">
              <label className="label">Confirm New Password</label>
              <input
                className="inp"
                type="password"
                placeholder="Repeat new password"
                value={passwords.confirm}
                onChange={(e) => setPasswords((p) => ({ ...p, confirm: e.target.value }))}
                disabled={passwordLoading}
              />
            </div>
          </div>
          {passwordMsg && (
            <div
              className={passwordMsg.type === "ok" ? "success" : "error"}
              style={{ marginBottom: 12 }}
            >
              {passwordMsg.text}
            </div>
          )}
          <button
            className="btn btn-primary"
            type="submit"
            disabled={passwordLoading}
            style={{ minWidth: 180 }}
          >
            {passwordLoading ? "Updating…" : "Change Password"}
          </button>
        </form>
      </div>

      {/* Account info */}
      <div className="two-col">
        <div className="card card-pad">
          <h3 style={{ marginTop: 0, marginBottom: 16 }}>Account Information</h3>
          <div className="list">
            <div className="list-row">
              <div>
                <div className="t">Company</div>
                <div className="s">{company}</div>
              </div>
            </div>
            <div className="list-row">
              <div>
                <div className="t">Current Plan</div>
                <div className="s">{plan}</div>
              </div>
              <div className="r">
                <a className="btn" href="/portal/billing" style={{ fontSize: 12, padding: "5px 10px" }}>
                  Manage →
                </a>
              </div>
            </div>
            <div className="list-row">
              <div>
                <div className="t">Role</div>
                <div className="s" style={{ textTransform: "capitalize" }}>{role}</div>
              </div>
            </div>
            <div className="list-row">
              <div>
                <div className="t">Active Modules</div>
                <div className="s">{modules.length > 0 ? `${modules.length} modules` : "All modules"}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="card card-pad">
          <h3 style={{ marginTop: 0, marginBottom: 16 }}>Quick Actions</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <a href="/portal/billing" className="btn" style={{ justifyContent: "center" }}>
              💳 Billing &amp; Plan
            </a>
            <a href="/portal/support" className="btn" style={{ justifyContent: "center" }}>
              🎧 Contact Support
            </a>
            <a
              href="/api/auth/logout"
              className="btn"
              style={{ justifyContent: "center", borderColor: "var(--danger)", color: "var(--danger)" }}
            >
              Sign Out
            </a>
          </div>
        </div>
      </div>

      {modules.length > 0 && (
        <div className="card card-pad" style={{ marginTop: 18 }}>
          <h3 style={{ marginTop: 0, marginBottom: 14 }}>Active Modules</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {modules.map((m) => (
              <span
                key={m}
                className="chip info"
                style={{ textTransform: "capitalize", padding: "5px 12px", fontSize: 12 }}
              >
                {m}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
