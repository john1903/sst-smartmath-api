export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container site-footer__inner">
        <div>© {new Date().getFullYear()} SmartMath. All rights reserved.</div>
        <nav className="site-footer__links" aria-label="Footer">
          <a href="#privacy">Privacy</a>
          <a href="#terms">Terms</a>
        </nav>
      </div>
    </footer>
  );
}
