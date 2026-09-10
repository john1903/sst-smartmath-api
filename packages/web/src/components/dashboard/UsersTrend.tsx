export function UsersTrend() {
  return (
    <section className="card">
      <div className="card__head">
        <span className="skeleton skeleton--line" style={{ width: 160 }} />
        <span className="skeleton skeleton--line" style={{ width: 120 }} />
      </div>
      <div className="card__chart">
        <span className="skeleton skeleton--block" style={{ height: 280 }} />
      </div>
    </section>
  );
}
