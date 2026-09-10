export function KpiRow() {
  return (
    <div className="kpi-row">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="kpi-tile">
          <div className="kpi-tile__head">
            <span className="skeleton skeleton--icon" />
            <span className="skeleton skeleton--line" style={{ width: "40%" }} />
          </div>
          <span className="skeleton skeleton--line skeleton--xl" style={{ width: "55%" }} />
          <span className="skeleton skeleton--line" style={{ width: "45%" }} />
          <div className="kpi-tile__spark">
            <span className="skeleton skeleton--block" style={{ height: 40 }} />
          </div>
        </div>
      ))}
    </div>
  );
}
