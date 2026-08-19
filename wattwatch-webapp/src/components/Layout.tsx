import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../state/AuthContext';
import { useTheme } from '../state/ThemeContext';
import { ChatWidget } from '../chatbot/ChatWidget';

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

const TAB_ROUTES: [string, string, string][] = [
  ['/', 'Home', '📊'],
  ['/analytics', 'Stats', '📈'],
  ['/alerts', 'Alerts', '🔔'],
  ['/calendar', 'Calendar', '📅'],
];

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/analytics': 'Analytics',
  '/alerts': 'Alerts',
  '/calendar': 'Calendar',
  '/devices': 'Devices',
  '/explainer': 'How it works',
  '/profile': 'My details',
  '/billing': 'Billing',
  '/support': 'My tickets',
  '/download-data': 'Download data',
  '/settings/theme': 'Theme',
  '/settings/password': 'Change password',
  '/help': 'Help',
  '/settings/privacy': 'Privacy & data',
  '/settings/rate': 'Rate the app',
  '/settings/delete': 'Delete account',
};

function pageTitle(pathname: string) {
  return PAGE_TITLES[pathname] ?? 'WattWatch';
}

export function Layout() {
  const { user, signOut } = useAuth();
  const { mode } = useTheme();
  const location = useLocation();
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.classList.toggle('nav-open', navOpen);
    return () => document.body.classList.remove('nav-open');
  }, [navOpen]);

  const title = pageTitle(location.pathname);
  const tabActive = TAB_ROUTES.some(([path]) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path),
  );

  return (
    <div className={`shell${navOpen ? ' nav-open' : ''}`}>
      <header className="mobile-topbar">
        <button
          type="button"
          className="menu-btn"
          aria-label={navOpen ? 'Close menu' : 'Open menu'}
          onClick={() => setNavOpen((o) => !o)}
        >
          {navOpen ? '✕' : '☰'}
        </button>
        <div className="mobile-topbar-title">
          <span className="mobile-topbar-brand">⚡</span>
          <span>{title}</span>
        </div>
        <div className="mobile-topbar-spacer" aria-hidden />
      </header>

      {navOpen && (
        <button
          type="button"
          className="nav-overlay"
          aria-label="Close menu"
          onClick={() => setNavOpen(false)}
        />
      )}

      <aside className="sidebar">
        <div className="sidebar-head">
          <div className="logo"><span className="bolt">⚡</span> WattWatch</div>
          <button type="button" className="sidebar-close" aria-label="Close menu" onClick={() => setNavOpen(false)}>✕</button>
        </div>
        <nav className="nav">
          {SECTIONS.map((sec, i) => (
            <div key={i} className="nav-group">
              {sec.title && <div className="nav-section">{sec.title}</div>}
              {sec.links.map(([to, label, icon]) => (
                <NavLink key={to} to={to} end={to === '/'} onClick={() => setNavOpen(false)}>
                  <span>{icon}</span> {label}
                </NavLink>
              ))}
            </div>
          ))}
          <div className="nav-group">
            <button type="button" className="nav-logout" onClick={signOut}>
              <span>🚪</span> Log out
            </button>
          </div>
        </nav>
        <div className="side-foot">
          <div className="side-foot-email">{user?.email}</div>
          <div className="muted side-foot-theme">{mode === 'dark' ? 'Dark theme' : 'Light theme'}</div>
        </div>
      </aside>

      <main className="main">
        <Outlet />
      </main>

      <nav className="bottom-nav" aria-label="Main navigation">
        {TAB_ROUTES.map(([to, label, icon]) => (
          <NavLink key={to} to={to} end={to === '/'} className="bottom-nav-item">
            <span className="bottom-nav-icon">{icon}</span>
            <span className="bottom-nav-label">{label}</span>
          </NavLink>
        ))}
        <button
          type="button"
          className={`bottom-nav-item menu-tab${!tabActive ? ' active' : ''}`}
          aria-label="More menu"
          onClick={() => setNavOpen(true)}
        >
          <span className="bottom-nav-icon">☰</span>
          <span className="bottom-nav-label">Menu</span>
        </button>
      </nav>

      <ChatWidget />
    </div>
  );
}
