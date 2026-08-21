import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './state/AuthContext';
import { ThemeProvider } from './state/ThemeContext';
import { AppDataProvider } from './state/AppData';
import { api } from './lib/api';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { Dashboard } from './pages/Dashboard';
import { Analytics } from './pages/Analytics';
import { Alerts } from './pages/Alerts';
import { Calendar } from './pages/Calendar';
import { Devices } from './pages/Devices';
import { Explainer } from './pages/Explainer';
import { Profile } from './pages/Profile';
import { ThemeSettings } from './pages/settings/Theme';
import { ChangePassword } from './pages/settings/Password';
import { Privacy } from './pages/settings/Privacy';
import { Rate } from './pages/settings/Rate';
import { DeleteAccount } from './pages/settings/DeleteAccount';
import { DownloadData } from './pages/DownloadData';
import { Support } from './pages/Support';
import { Help } from './pages/Help';
import { Billing } from './pages/Billing';

function Loading() {
  return <div style={{ display: 'grid', placeItems: 'center', height: '100vh', color: 'var(--muted)' }}>Loading…</div>;
}

// Ensure onboarding record exists (supplier pulled from profile on the API).
// Household/device questions are skipped — users go straight to the app after login.
function Gate({ children }: { children: JSX.Element }) {
  const { ready, user } = useAuth();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!user) { setChecked(false); return; }
    api.getOnboarding()
      .then(async (o: any) => {
        if (!o) {
          await api.saveOnboarding({ devices: [], householdSize: null, supplier: null });
        }
      })
      .catch(() => {}) // don't block the app if onboarding sync fails
      .finally(() => setChecked(true));
  }, [user]);

  if (!ready) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  if (!checked) return <Loading />;
  return children;
}

function PublicOnly({ children }: { children: JSX.Element }) {
  const { ready, user } = useAuth();
  if (!ready) return <Loading />;
  if (user) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
            <Route path="/signup" element={<PublicOnly><Signup /></PublicOnly>} />
            <Route element={<Gate><AppDataProvider><Layout /></AppDataProvider></Gate>}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/devices" element={<Devices />} />
              <Route path="/explainer" element={<Explainer />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/download-data" element={<DownloadData />} />
              <Route path="/settings/theme" element={<ThemeSettings />} />
              <Route path="/settings/password" element={<ChangePassword />} />
              <Route path="/settings/privacy" element={<Privacy />} />
              <Route path="/settings/rate" element={<Rate />} />
              <Route path="/settings/delete" element={<DeleteAccount />} />
              <Route path="/support" element={<Support />} />
              <Route path="/billing" element={<Billing />} />
              <Route path="/help" element={<Help />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
