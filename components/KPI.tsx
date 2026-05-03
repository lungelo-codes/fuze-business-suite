interface KPIProps {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "blue" | "teal" | "warn" | "purple";
  icon?: string;
}

export default function KPI({ label, value, hint, tone = "blue", icon = "•" }: KPIProps) {
  return (
    <div className={`kpi ${tone === "blue" ? "" : tone}`}>
      <div className="ic-wrap">{icon}</div>
      <div className="label">{label}</div>
      <div className="val">{value}</div>
      {hint ? <div className="hint">{hint}</div> : null}
    </div>
  );
}
