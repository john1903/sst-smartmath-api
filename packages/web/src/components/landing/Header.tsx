export function Header() {
  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <a href="#" className="site-header__logo" aria-label="SmartMath home">
          <img src="/smartmath-logo.png" alt="SmartMath" />
        </a>
        <nav className="site-header__nav" aria-label="Primary">
          <a href="#features">Features</a>
          <a href="#why">Why SmartMath</a>
          <a href="#about">About</a>
        </nav>
        <div className="site-header__cta">
          <a href="#login" className="site-header__login">
            Log in
          </a>
        </div>
      </div>
    </header>
  );
}
