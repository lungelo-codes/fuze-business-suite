import Link from "next/link";

export default function PublicHeader() {
  return (
    <header className="pub-header">
      <Link href="/" className="pub-brand" style={{ textDecoration: "none" }}>
        <div className="brand-mark">FB</div>
        <span>Fuze Business Suite</span>
      </Link>
      <nav className="pub-nav">
        <Link href="/features">Features</Link>
        <Link href="/#pricing">Pricing</Link>
        <Link href="/about">About</Link>
        <Link href="/contact">Contact</Link>
        <Link href="/login">Login</Link>
        <Link href="/signup" className="nav-cta">Start Free Trial</Link>
      </nav>
    </header>
  );
}
