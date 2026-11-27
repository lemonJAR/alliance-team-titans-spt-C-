import { useState, useEffect } from 'react';
import { notify } from '../../components/toastBus';
import { PageHeader, SectionHeader } from '../../components/ui';
import { s } from './adminHelpers';
import { UserPagination } from './AdminShared';
import { fetchNotifications } from '../../controllers/adminController';

export function NotificationsTab() {
  const NOTIFICATIONS_PER_PAGE = 10;
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [notificationPage, setNotificationPage] = useState(1);

  async function loadNotifications() {
    setLoading(true);
    try {
      const { data } = await fetchNotifications(showUnreadOnly ? { unread: '1' } : undefined);
      setNotifications(data || []);
      setNotificationPage(1);
    } catch {
      notify('Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    queueMicrotask(() => loadNotifications().catch(console.error));
  // loadNotifications reads the current filter state for this tab.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showUnreadOnly]);

  const notificationPageCount = Math.max(1, Math.ceil(notifications.length / NOTIFICATIONS_PER_PAGE));
  const visibleNotifications = notifications.slice(
    (notificationPage - 1) * NOTIFICATIONS_PER_PAGE,
    notificationPage * NOTIFICATIONS_PER_PAGE,
  );

  return (
    <>
      <PageHeader title="Notifications" subtitle="Recent system updates for admin actions, offerings, enrollment, and grades." />

      <div style={{ ...s.panel, padding: 0, overflow: 'hidden' }}>
        <SectionHeader
          title="Recent Notifications"
          right={(
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <select
                style={{
                  ...s.input,
                  width: 'auto',
                  fontSize: 12,
                  padding: '6px 10px',
                }}
                value={showUnreadOnly ? 'unread' : 'all'}
                onChange={(e) => setShowUnreadOnly(e.target.value === 'unread')}
              >
                <option value="all">All</option>
                <option value="unread">Unread only</option>
              </select>
              <button
                style={{
                  ...s.submitBtn(false),
                  marginTop: 0,
                  padding: '6px 12px',
                  fontSize: 12,
                }}
                onClick={loadNotifications}
              >
                Refresh
              </button>
              <span style={{ color: 'var(--app-muted)', fontSize: 11 }}>
                {notifications.length} items
              </span>
            </div>
          )}
        />
        {loading ? (
          <div style={{ padding: 16, color: 'var(--app-muted)' }}>Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div style={{ padding: 16, color: 'var(--app-muted)' }}>No notifications found.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: 'var(--app-panel)' }}>
                {['Status', 'Recipient', 'Category', 'Title', 'Message', 'When'].map((h) => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleNotifications.map((item) => (
                <tr key={item.id}>
                  <td style={s.td}>{item.is_read ? 'Read' : 'Unread'}</td>
                  <td style={s.td}>{item.recipient_email || '--'}</td>
                  <td style={s.td}>{item.category}</td>
                  <td style={s.td}>{item.title}</td>
                  <td style={s.td}>{item.message}</td>
                  <td style={s.td}>{new Date(item.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && notifications.length > NOTIFICATIONS_PER_PAGE && (
          <UserPagination
            page={notificationPage}
            totalPages={notificationPageCount}
            totalItems={notifications.length}
            pageSize={NOTIFICATIONS_PER_PAGE}
            onPageChange={setNotificationPage}
            itemLabel="notifications"
          />
        )}
      </div>
    </>
  );
}


// Report values include text typed by users (remarks, names, subject titles). Escape before writing HTML.
