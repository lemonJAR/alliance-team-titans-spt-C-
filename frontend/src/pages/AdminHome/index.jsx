import { useNavigate } from 'react-router-dom';
import { useUrlState } from '../../hooks/useUrlState';
import DashboardLayout from '../../components/DashboardLayout';
import { NotificationBell } from '../../components/ui';
import { signOut } from '../../controllers/authController';
import { fetchNotifications } from '../../controllers/adminController';
import { SchoolTab } from './SchoolTab';
import { PeopleTab } from './PeopleTab';
import { OfferingsTab } from './OfferingsTab';
import { GradeManagementTab } from './GradeManagementTab';
import { ReportsTab } from './ReportsTab';
import { AuditLogTab } from './AuditLogTab';
import { NotificationsTab } from './NotificationsTab';

const TABS = [
  { key: 'school',    label: 'School Setup',      icon: 'school' },
  { key: 'people',    label: 'People',            icon: 'people' },
  { key: 'offerings', label: 'Subject Offerings', icon: 'calendar' },
  { key: 'grades',    label: 'Grade Overrides',   icon: 'grades' },
  { key: 'reports',   label: 'Reports',           icon: 'chart' },
  { key: 'audit',     label: 'Audit Logs',        icon: 'audit' },
];

function AdminHome() {
  const navigate = useNavigate();
  // The open tab lives in the URL (?tab=...), so a refresh stays on the same page.
  const [activeTab, changeTab] = useUrlState('tab', 'school', [...TABS.map((t) => t.key), 'notifications']);

  async function handleLogout() {
    try {
      await signOut();
    } catch (err) {
      console.warn('logout request failed, clearing local session anyway', err);
    } finally {
      navigate('/login');
    }
  }

  return (
    <DashboardLayout
      portalLabel="ADMIN PANEL"
      navLabel="Management"
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={changeTab}
      onLogout={handleLogout}
      topBar={
        <NotificationBell
          fetchItems={() => fetchNotifications()}
          onViewAll={() => changeTab('notifications')}
        />
      }
    >
      {activeTab === 'school'        && <SchoolTab />}
      {activeTab === 'people'        && <PeopleTab />}
      {activeTab === 'offerings'     && <OfferingsTab />}
      {activeTab === 'grades'        && <GradeManagementTab />}
      {activeTab === 'reports'       && <ReportsTab />}
      {activeTab === 'audit'         && <AuditLogTab />}
      {/* Opened from the bell's "View all"; not a sidebar item. */}
      {activeTab === 'notifications' && <NotificationsTab />}
    </DashboardLayout>
  );
}


export default AdminHome;
