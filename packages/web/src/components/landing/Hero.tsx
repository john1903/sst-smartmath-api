import { Button } from "@smartmath/ui";
import { Phone } from "./Phone";

export function Hero() {
  return (
    <section className="hero">
      <div className="container hero__grid">
        <div>
          <h1 className="hero__title">
            Top-quality <span className="hero__title-accent">education</span>,
            now more accessible than{" "}
            <span className="hero__title-accent">ever.</span>
          </h1>
          <p className="hero__lede">
            SmartMath turns curriculum requirements into interactive exercises
            with instant feedback, AI-graded free-form answers, and progress
            reports students and teachers can actually read.
          </p>
          <div className="hero__actions">
            <Button as="a" href="#get-started" variant="primary">
              Get started
            </Button>
            <Button as="a" href="#learn-more" variant="outline">
              Learn more
            </Button>
          </div>
        </div>
        <div className="hero__visual">
          <Phone src="/home-screen.png" alt="SmartMath mobile app home screen" />
        </div>
      </div>
    </section>
  );
}
