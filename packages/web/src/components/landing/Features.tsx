import type { ReactNode } from "react";
import { Card } from "@smartmath/ui";

interface Feature {
  title: string;
  body: string;
  icon: ReactNode;
}

const FEATURES: Feature[] = [
  {
    title: "Interactive tasks",
    body: "Solve maths problems, get instant feedback, and explore personalised challenges that adapt to your pace.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 6h16M4 12h10M4 18h16" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "Learn through play",
    body: "Interactive exercises, smart feedback, and gamified challenges make mastering maths an enjoyable experience.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9" />
        <path d="M9 10l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "Level-based progression",
    body: "Structured challenges adapt to your skill level. Unlock new tasks, earn progress, and conquer each level with confidence.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 20V10M12 20V4M20 20v-8" strokeLinecap="round" />
      </svg>
    ),
  },
];

export function Features() {
  return (
    <section className="section" id="features">
      <div className="container">
        <div className="section__heading">
          <div className="section__eyebrow">Why SmartMath</div>
          <h2 className="section__title">Built for how students really learn.</h2>
          <p className="section__lede">
            Three ideas we keep coming back to when we design each exercise.
          </p>
        </div>
        <div className="features">
          {FEATURES.map((f) => (
            <Card key={f.title} variant="interactive" padding="lg">
              <div className="feature-card__icon">{f.icon}</div>
              <h3 className="feature-card__title">{f.title}</h3>
              <p className="feature-card__body">{f.body}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
