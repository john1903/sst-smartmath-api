import { Link } from "react-router-dom";
import { useAuth } from "../../auth/AuthProvider";

export function Header() {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <Link to="/" className="site-header__logo" aria-label="SmartMath home">
          <img src="/smartmath-logo.png" alt="SmartMath" />
        </Link>
        <nav className="site-header__nav" aria-label="Primary">
          <a href="#features">Features</a>
          <a href="#why">Why SmartMath</a>
          <a href="#about">About</a>
        </nav>
        <div className="site-header__cta">
          {isAuthenticated ? (
            <>
              <Link to="/dashboard" className="site-header__login">
                Dashboard
              </Link>
              <span
                className="site-header__login"
                title={user?.email ?? undefined}
                style={{ cursor: "default" }}
              >
                {user?.email ?? user?.sub}
              </span>
              <button
                type="button"
                className="site-header__login"
                onClick={logout}
                style={{ background: "none", border: 0, cursor: "pointer" }}
              >
                Log out
              </button>
            </>
          ) : (
            <Link to="/login" className="site-header__login">
              Log in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
