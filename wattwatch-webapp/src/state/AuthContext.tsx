import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { api, AuthUser, clearToken, getToken, setToken } from '../lib/api';
import { initMobilePush, teardownMobilePush, isNativeApp } from '../lib/push';

interface AuthState {
  ready: boolean;
  user: AuthUser | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName?: string) => Promise<void>;
  signOut: () => void;
}
const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    (async () => {
      if (getToken()) {
        try { const { user } = await api.me(); setUser(user); }
        catch { clearToken(); }
      }
      setReady(true);
    })();
  }, []);

  // Register FCM device token after sign-in (APK).
  useEffect(() => {
    if (!user || !isNativeApp()) return;
    initMobilePush().catch(() => {});
  }, [user]);

  const value = useMemo<AuthState>(() => ({
    ready, user,
    signIn: async (email, password) => {
      const { token, user } = await api.login(email, password);
      setToken(token); setUser(user);
    },
    signUp: async (email, password, fullName) => {
      const { token, user } = await api.signup(email, password, fullName);
      setToken(token); setUser(user);
    },
    signOut: () => {
      teardownMobilePush().catch(() => {});
      clearToken(); setUser(null);
    },
  }), [ready, user]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth must be inside AuthProvider');
  return c;
}
