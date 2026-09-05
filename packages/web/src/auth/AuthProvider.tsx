import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User } from "oidc-client-ts";
import { cognitoLogoutUrl, userManager } from "./userManager";

export interface AuthUser {
  sub: string;
  email?: string;
  name?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (returnTo?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function toAuthUser(u: User | null): AuthUser | null {
  if (!u) return null;
  const p = u.profile;
  return {
    sub: String(p.sub),
    email: typeof p.email === "string" ? p.email : undefined,
    name: typeof p.name === "string" ? p.name : undefined,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    userManager
      .getUser()
      .then((u) => {
        if (!mounted) return;
        if (u && !u.expired) {
          setUser(toAuthUser(u));
          setAccessToken(u.access_token);
        }
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    const onUserLoaded = (u: User) => {
      setUser(toAuthUser(u));
      setAccessToken(u.access_token);
    };
    const onUserUnloaded = () => {
      setUser(null);
      setAccessToken(null);
    };
    const onSignoutSuccess = onUserUnloaded;

    userManager.events.addUserLoaded(onUserLoaded);
    userManager.events.addUserUnloaded(onUserUnloaded);
    userManager.events.addUserSignedOut(onSignoutSuccess);

    return () => {
      mounted = false;
      userManager.events.removeUserLoaded(onUserLoaded);
      userManager.events.removeUserUnloaded(onUserUnloaded);
      userManager.events.removeUserSignedOut(onSignoutSuccess);
    };
  }, []);

  const login = useCallback(async (returnTo?: string) => {
    await userManager.signinRedirect({
      state: returnTo ? { returnTo } : undefined,
    });
  }, []);

  const logout = useCallback(async () => {
    await userManager.removeUser();
    window.location.assign(cognitoLogoutUrl());
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      accessToken,
      isAuthenticated: Boolean(user),
      isLoading,
      login,
      logout,
    }),
    [user, accessToken, isLoading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
