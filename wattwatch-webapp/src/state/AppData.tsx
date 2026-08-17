// Loads prices + alerts once signed in, applies live prices to the engine.
import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { api, Alert } from '../lib/api';
import { setLivePrices, priceAt, slotFor } from '../lib/pricing';
import { checkAlerts, checkCheapWindow, resetCheapWindowState } from '../lib/notifications';
import { useAuth } from './AuthContext';

interface AppDataState {
  alerts: Alert[];
  priceSource: string;
  refreshAlerts: () => Promise<void>;
}
const Ctx = createContext<AppDataState | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [priceSource, setPriceSource] = useState('built-in');

  const refreshAlerts = useCallback(async () => {
    try { setAlerts(await api.listAlerts()); } catch {}
  }, []);

  useEffect(() => {
    if (!user) {
      resetCheapWindowState();
      return;
    }
    (async () => {
      try {
        const prices = await api.getPrices();
        if (prices?.prices) { setLivePrices(prices.prices, prices.source); setPriceSource(prices.source); }
      } catch {}
      refreshAlerts();
    })();
  }, [user, refreshAlerts]);

  // Check price every minute: custom alerts + automatic cheap-window push.
  useEffect(() => {
    if (!user) return;
    const tick = () => {
      try {
        const price = priceAt(slotFor());
        checkCheapWindow(price);
        if (alerts.length > 0) checkAlerts(alerts, price);
      } catch {}
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [user, alerts]);

  return <Ctx.Provider value={{ alerts, priceSource, refreshAlerts }}>{children}</Ctx.Provider>;
}
export function useAppData() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAppData must be inside AppDataProvider');
  return c;
}
