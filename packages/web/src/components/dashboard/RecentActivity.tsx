export function RecentActivity() {
  return (
    <section className="card">
      <div className="card__head">
        <span className="skeleton skeleton--line" style={{ width: 160 }} />
      </div>
      <ul className="activity">
        {Array.from({ length: 4 }).map((_, i) => (
          <li key={i} className="activity__row">
            <span className="skeleton skeleton--dot" />
            <div className="activity__body">
              <span className="skeleton skeleton--line" style={{ width: "60%" }} />
              <span
                className="skeleton skeleton--line"
                style={{ width: "40%", marginTop: 6 }}
              />
            </div>
            <span className="skeleton skeleton--line" style={{ width: 48 }} />
          </li>
        ))}
      </ul>
    </section>
  );
}
