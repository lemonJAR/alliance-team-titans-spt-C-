// Shared building blocks used by the Admin, Student and Teacher dashboards.
// These used to be re-declared (slightly differently) inside each page file.
import { useEffect, useRef, useState } from 'react';
import Icon from './Icons';

export function PanelTitle({ children }) {
  return <div className="ui-panel-title"><span className="ui-dot" />{children}</div>;
}

export function Field({ label, required = false, hint, error, children }) {
  return (
    <div style={{ minWidth: 0 }}>
      <label className="ui-label">
        {label}
        {required && <span style={{ color: 'var(--app-danger)', marginLeft: 4 }} aria-label="required">*</span>}
      </label>
      {children}
      {hint && !error && (
        <div style={{ marginTop: 5, fontSize: 11, lineHeight: 1.4, color: 'var(--app-muted)' }}>{hint}</div>
      )}
      {error && (
        <div role="alert" style={{ marginTop: 5, fontSize: 11, lineHeight: 1.4, color: 'var(--app-danger)' }}>{error}</div>
      )}
    </div>
  );
}

export function StatCard({ label, value, sub, accent }) {
  return (
    <div className="ui-stat">
      <div className="ui-stat-label">{label}</div>
      <div className="ui-stat-value" style={accent ? { color: accent } : undefined}>{value ?? '—'}</div>
      {sub && <div className="ui-stat-sub">{sub}</div>}
    </div>
  );
}

export function SectionHeader({ title, right }) {
  return (
    <div className="ui-section-header">
      <span className="ui-dot" />
      {title}
      {right && <span className="ui-section-right">{right}</span>}
    </div>
  );
}

export function PageHeader({ title, subtitle, right }) {
  return (
    <div className="ui-page-header">
      <div>
        <h1 className="ui-page-title">{title}</h1>
        {subtitle && <p className="ui-page-sub">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

const TONES = {
  warning: 'ui-badge-warning',
  info: 'ui-badge-info',
  success: 'ui-badge-success',
  danger: 'ui-badge-danger',
  muted: 'ui-badge-muted',
};

export function Badge({ tone = 'muted', children }) {
  return <span className={`ui-badge ${TONES[tone] || TONES.muted}`}>{children}</span>;
}

const STATUS_TONE = {
  PENDING: 'warning',
  APPROVED: 'info',
  ENROLLED: 'success',
  DROPPED: 'danger',
  REJECTED: 'danger',
  WITHDRAWN: 'muted',
  COMPLETED: 'success',
};

export function StatusBadge({ status }) {
  return <Badge tone={STATUS_TONE[status] || 'warning'}>{status}</Badge>;
}

export function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;
  return (
    <div className="ui-pagination">
      <span>Page {page} of {totalPages}</span>
      <div style={{ display: 'flex', gap: 6 }}>
        <button type="button" className="ui-page-btn" disabled={page <= 1} onClick={() => onChange(page - 1)}>Previous</button>
        <button type="button" className="ui-page-btn" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>Next</button>
      </div>
    </div>
  );
}

// Bell + dropdown, used by every role instead of Admin's full "Notifications" tab
// and Student's hand-rolled copy. `onMarkAllRead` is optional.
export function NotificationBell({ fetchItems, onMarkAllRead, onViewAll }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await fetchItems();
      setItems(Array.isArray(data) ? data : data?.results || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { queueMicrotask(load); /* initial badge count */ }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const unread = items.filter((n) => !n.is_read).length;
  const fmt = (v) => {
    if (!v) return '';
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleString();
  };

  const markAll = async () => {
    try {
      await onMarkAllRead();
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="ui-bell" ref={ref}>
      <button
        type="button"
        className="ui-bell-btn"
        aria-label="Notifications"
        onClick={() => { const next = !open; setOpen(next); if (next) load(); }}
      >
        <Icon name="bell" />
        {unread > 0 && <span className="ui-bell-badge">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="ui-bell-panel">
          <div className="ui-bell-head">
            <strong>Notifications</strong>
            <div style={{ display: 'flex', gap: 6 }}>
              <button type="button" className="ui-mini-btn" onClick={load}>Refresh</button>
              {onMarkAllRead && <button type="button" className="ui-mini-btn" onClick={markAll}>Mark all read</button>}
            </div>
          </div>
          {loading ? (
            <div className="ui-bell-empty">Loading…</div>
          ) : items.length === 0 ? (
            <div className="ui-bell-empty">No notifications yet.</div>
          ) : (
            items.slice(0, 8).map((n) => (
              <div key={n.id} className={`ui-bell-item${n.is_read ? '' : ' unread'}`}>
                <span className="ui-bell-dot" style={{ opacity: n.is_read ? 0.3 : 1 }} />
                <div>
                  <div className="ui-bell-title">{n.title}</div>
                  <div className="ui-bell-msg">{n.message}</div>
                  <div className="ui-bell-time">{fmt(n.created_at)}</div>
                </div>
              </div>
            ))
          )}
          {onViewAll && (
            <button type="button" className="ui-bell-viewall" onClick={() => { setOpen(false); onViewAll(); }}>
              View all notifications
            </button>
          )}
        </div>
      )}
    </div>
  );
}