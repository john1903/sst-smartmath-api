import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { userManager } from "../auth/userManager";

export function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    userManager
      .signinCallback()
      .then((u) => {
        const returnTo =
          (u?.state as { returnTo?: string } | null)?.returnTo ?? "/dashboard";
        navigate(returnTo, { replace: true });
      })
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : String(e)),
      );
  }, [navigate]);

  if (error) {
    return (
      <div className="auth-status">
        <h1>Sign-in failed</h1>
        <p>{error}</p>
        <a href="/">Back home</a>
      </div>
    );
  }
  return (
    <div className="auth-status">
      <p>Signing you in…</p>
    </div>
  );
}
