import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider";

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) {
    const to = `${location.pathname}${location.search}`;
    return <Navigate to="/login" state={{ from: to }} replace />;
  }
  return <>{children}</>;
}
