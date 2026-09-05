import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

export function Login() {
  const { login } = useAuth();
  const location = useLocation();
  const from =
    (location.state as { from?: string } | null)?.from ?? "/dashboard";

  useEffect(() => {
    void login(from);
  }, [login, from]);

  return (
    <div className="auth-status">
      <p>Redirecting you to sign in…</p>
    </div>
  );
}
