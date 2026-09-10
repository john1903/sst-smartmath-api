import { Link } from "react-router-dom";
import { useAuth } from "../../auth/AuthProvider";
import { UserMenu } from "./UserMenu";

export function Header() {
  const { isAuthenticated } = useAuth();

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
            <UserMenu />
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
