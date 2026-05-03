import PublicHeader from "@/components/PublicHeader";

export default function Page() {
  return (
    <main>
      <PublicHeader />
      <div className="content-wrap">
        <div className="card card-pad" style={{ marginTop: 28 }}>
          <h1 className="page-title">About Us</h1>
          <p className="page-sub">Fuze Business Suite about us page.</p>
        </div>
      </div>
    </main>
  );
}
