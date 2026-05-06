import Link from "next/link";

export default function NotFound() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "var(--bg)",
        textAlign: "center",
        padding: "0 24px",
      }}
    >
      <div style={{ fontSize: 72, marginBottom: 24, lineHeight: 1 }}>404</div>
      <h1
        style={{
          fontSize: 28,
          fontWeight: 800,
          color: "var(--navy-ink)",
          margin: "0 0 12px",
          letterSpacing: "-0.02em",
        }}
      >
        Page not found
      </h1>
      <p style={{ fontSize: 15, color: "var(--muted)", margin: "0 0 32px", maxWidth: 400 }}>
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
        <Link
          href="/portal"
          className="btn btn-primary"
          style={{ padding: "10px 22px" }}
        >
          Go to Portal
        </Link>
        <Link
          href="/"
          className="btn"
          style={{ padding: "10px 22px" }}
        >
          Home
        </Link>
      </div>
    </div>
  );
}
