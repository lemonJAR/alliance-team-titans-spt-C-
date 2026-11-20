// Single sidebar + main-area shell shared by Admin, Student and Teacher.
// Replaces three near-identical copies of the sidebar markup and style objects.
import { useState } from 'react';
import Logo from '../assets/Logo.png';
import Icon from './Icons';
import { ToastHost } from './Toast';

export default function DashboardLayout({
  portalLabel,          // "ADMIN PANEL" | "STUDENT PORTAL" | "TEACHER PORTAL"
  navLabel = 'Navigation',
  tabs = [],            // [{ key, label, icon }]
  activeTab,
  onTabChange,
  sidebarExtra = null,  // render-prop: (collapsed) => node, shown between nav and footer
  profileCard = null,   // { name, line1, line2 }
  topBar = null,        // node shown at the top-right of the main area (e.g. bell)
  onLogout,
  children,
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="dash-root">
      <aside className={`dashboard-sidebar${collapsed ? ' collapsed' : ''}`}>
        <button
          type="button"
          className="sidebar-brand"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          onClick={() => setCollapsed((v) => !v)}
        >
          <img src={Logo} alt="Alliance Team Titans logo" />
          {!collapsed && <span>{portalLabel}</span>}
        </button>

        {tabs.length > 0 && !collapsed && <div className="sidebar-label">{navLabel}</div>}
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            title={tab.label}
            aria-label={tab.label}
            aria-current={activeTab === tab.key ? 'page' : undefined}
            className={`sidebar-nav-action${activeTab === tab.key ? ' active' : ''}`}
            onClick={() => onTabChange(tab.key)}
          >
            <Icon name={tab.icon} />
            {!collapsed && <span>{tab.label}</span>}
          </button>
        ))}

        {sidebarExtra && sidebarExtra(collapsed)}

        <div className="sidebar-footer">
          {profileCard && !collapsed && (
            <div className="sidebar-profile">
              <div className="sidebar-profile-name">{profileCard.name}</div>
              {profileCard.line1 && <div className="sidebar-profile-id">{profileCard.line1}</div>}
              {profileCard.line2 && <div className="sidebar-profile-extra">{profileCard.line2}</div>}
            </div>
          )}
          <button type="button" className="sidebar-logout" title="Log out" aria-label="Log out" onClick={onLogout}>
            <Icon name="logout" />
            {!collapsed && <span>Log out</span>}
          </button>
        </div>
      </aside>

      <main className="dash-main">
        {topBar && <div className="dash-topbar">{topBar}</div>}
        {children}
      </main>
      <ToastHost />
    </div>
  );
}