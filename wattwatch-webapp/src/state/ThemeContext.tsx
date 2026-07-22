import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';

type Mode = 'light' | 'dark';
interface ThemeState { mode: Mode; toggle: () => void; }
const Ctx = createContext<ThemeState | null>(null);
const KEY = 'ww_theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode>(() => (localStorage.getItem(KEY) as Mode) || 'light');
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', mode);
    localStorage.setItem(KEY, mode);
  }, [mode]);
  const value = useMemo(() => ({ mode, toggle: () => setMode((m) => (m === 'dark' ? 'light' : 'dark')) }), [mode]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export function useTheme() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useTheme must be inside ThemeProvider');
  return c;
}
