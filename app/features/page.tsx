import PublicHeader from "@/components/PublicHeader";

export default function Page() {
  return (
    <main>
      <PublicHeader />
      <div className="content-wrap">
        <div className="card card-pad" style={{ marginTop: 28 }}>
          <h1 className="page-title">Features</h1>
          <p className="page-sub">Fuze Business Suite features page.</p>
        </div>
      </div>
    </main>
  );
}
