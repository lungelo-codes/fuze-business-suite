"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import PublicHeader from "@/components/PublicHeader";
import Link from "next/link";

type LoginResponse = {
  success?: boolean;
  role?: "admin" | "customer";
  redirectTo?: string;
  error?: string;
  details?: unknown;
};

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const reason = params?.get("reason");
  const redirect = params?.get("redirect");

  async function login(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setMessage("");

    if (!email.trim() || !password) {
      setMessage("Enter your email and password.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const text = await res.text();
      let json: LoginResponse = {};
      try {
        json = text ? (JSON.parse(text) as LoginResponse) : {};
      } catch {
        json = { error: text || "Invalid server response." };
      }

      if (!res.ok || !json.success) {
        setMessage(json.error || "Login failed. Check your email and password.");
        return;
      }

      const target = redirect || json.redirectTo || (json.role === "admin" ? "/admin" : "/portal");
      setMessage("Login successful. Opening dashboard…");
      router.replace(target);
      router.refresh();

      setTimeout(() => {
        window.location.assign(target);
      }, 400);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not connect to the login server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="public-root">
      <PublicHeader />
      <div className="signup-wrap" style={{ maxWidth: 480 }}>
        <div className="signup-card">
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div className="brand-mark" style={{ margin: "0 auto 12px", width: 44, height: 44, borderRadius: 12, fontSize: 18 }}>FB</div>
            <h1 className="signup-heading" style={{ marginBottom: 6 }}>Welcome back</h1>
            <p className="signup-sub" style={{ margin: 0 }}>Sign in to your Fuze portal</p>
          </div>

          {reason === "admin_required" && (
            <div style={{ background: "var(--danger-bg)", color: "var(--danger)", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>
              Admin access required. Please log in with a System Manager account.
            </div>
          )}

          <form onSubmit={login}>
            <label className="label">Email Address</label>
            <input
              className="inp"
              type="email"
              placeholder="jane@acme.co.za"
              value={email}
              autoComplete="email"
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
            <label className="label">Password</label>
            <input
              className="inp"
              type="password"
              placeholder="Your password"
              value={password}
              autoComplete="current-password"
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />

            <button className="btn btn-primary" style={{ width: "100%", padding: "11px 0", marginTop: 4 }} type="submit" disabled={loading}>
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>

          {message && (
            <div className="error" style={{ marginTop: 10, whiteSpace: "pre-wrap" }}>
              {message}
            </div>
          )}

          <div style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "var(--muted)" }}>
            Don&apos;t have an account?{" "}
            <Link href="/signup" style={{ color: "var(--teal)", fontWeight: 700 }}>Start free trial →</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
