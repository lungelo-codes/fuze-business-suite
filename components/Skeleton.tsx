export default function Skeleton({ rows = 8, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div>
      {/* KPI skeletons */}
      <div className="kpi-grid" style={{ marginBottom: 18 }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="kpi" style={{ minHeight: 110 }}>
            <div className="sk-block" style={{ width: 38, height: 38, borderRadius: 9, marginBottom: 14 }} />
            <div className="sk-block" style={{ width: 60, height: 10, marginBottom: 8 }} />
            <div className="sk-block" style={{ width: 80, height: 26 }} />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="card">
        <div className="card-head">
          <div className="sk-block" style={{ width: 140, height: 18 }} />
        </div>
        <div className="card-body">
          <div className="table-wrap">
            <table className="data" style={{ opacity: 0.5 }}>
              <thead>
                <tr>
                  {Array.from({ length: cols }).map((_, i) => (
                    <th key={i}><div className="sk-block" style={{ width: 70, height: 10 }} /></th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: rows }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: cols }).map((_, j) => (
                      <td key={j}><div className="sk-block" style={{ width: `${60 + Math.random() * 40}%`, height: 12 }} /></td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 10, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="card">
      <div className="card-head">
        <div className="sk-block" style={{ width: 160, height: 18 }} />
      </div>
      <div className="card-body">
        <div className="toolbar">
          <div className="sk-block" style={{ width: 280, height: 36, borderRadius: 9 }} />
        </div>
        <table className="data" style={{ opacity: 0.5 }}>
          <thead>
            <tr>
              {Array.from({ length: cols }).map((_, i) => (
                <th key={i}><div className="sk-block" style={{ width: 80, height: 10 }} /></th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, i) => (
              <tr key={i}>
                {Array.from({ length: cols }).map((_, j) => (
                  <td key={j}><div className="sk-block" style={{ width: "70%", height: 12 }} /></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
