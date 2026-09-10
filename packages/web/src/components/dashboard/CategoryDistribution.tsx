export function CategoryDistribution() {
  return (
    <section className="card">
      <div className="card__head">
        <span className="skeleton skeleton--line" style={{ width: 180 }} />
      </div>
      <div className="donut">
        <div className="donut__chart">
          <span className="skeleton skeleton--circle" />
        </div>
        <ul className="donut__legend">
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i}>
              <span className="skeleton skeleton--dot" />
              <span className="skeleton skeleton--line" />
              <span className="skeleton skeleton--line" style={{ width: 28 }} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
