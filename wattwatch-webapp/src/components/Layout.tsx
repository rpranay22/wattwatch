import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../state/AuthContext';
import { useTheme } from '../state/ThemeContext';
import { ChatWidget } from '../chatbot/ChatWidget';

// Sidebar grouped into segments so related things sit together.
const SECTIONS: { title: string | null; links: [string, string, string][] }[] = [
  {
    title: null,
    links: [
      ['/', 'Dashboard', '📊'],
      ['/analytics', 'Analytics', '📈'],
      ['/alerts', 'Alerts', '🔔'],
      ['/calendar', 'Calendar', '📅'],
      ['/devices', 'Devices', '🔌'],
      ['/explainer', 'How it works', '💡'],
    ],
  },
  {
    title: 'Profile',
    links: [
      ['/profile', 'My details', '👤'],
      ['/billing', 'Billing', '💳'],
      ['/support', 'My tickets', '🎫'],
      ['/download-data', 'Download data', '⬇️'],
    ],
  },
  {
    title: 'Settings',
    links: [
      ['/settings/theme', 'Theme', '🎨'],
      ['/settings/password', 'Change password', '🔑'],
      ['/help', 'Help', '❓'],
      ['/settings/privacy', 'Privacy & data', '🔒'],
      ['/settings/rate', 'Rate the app', '⭐'],
      ['/settings/delete', 'Delete account', '🗑️'],
    ],
  },
];

export function Layout() {
  const { user, signOut } = useAuth();
  const { mode } = useTheme();
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="logo"><span className="bolt">⚡</span> WattWatch</div>
        <nav className="nav" style={{ overflowY: 'auto', flex: 1, paddingRight: 4 }}>
          {SECTIONS.map((sec, i) => (
            <div key={i} style={{ marginBottom: 14 }}>
              {sec.title && <div className="nav-section">{sec.title}</div>}
              {sec.links.map(([to, label, icon]) => (
                <NavLink key={to} to={to} end={to === '/'}>
                  <span>{icon}</span> {label}
                </NavLink>
              ))}
            </div>
          ))}
          <div style={{ marginBottom: 14 }}>
            <button className="nav-logout" onClick={signOut}>
              <span>🚪</span> Log out
            </button>
          </div>
        </nav>
        <div className="side-foot">
          <div style={{ fontSize: 12, wordBreak: 'break-all', marginBottom: 4 }}>{user?.email}</div>
          <div className="muted" style={{ fontSize: 11 }}>{mode === 'dark' ? 'Dark theme' : 'Light theme'}</div>
        </div>
      </aside>
      <main className="main"><Outlet /></main>
      <ChatWidget />
    </div>
  );
}
