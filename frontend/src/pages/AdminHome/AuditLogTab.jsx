import { useState, useEffect } from 'react';
import Icon from '../../components/Icons';
import { notify } from '../../components/toastBus';
import { PageHeader, SectionHeader } from '../../components/ui';
import { s, c, paginate } from './adminHelpers';
import { UserPagination } from './AdminShared';
import { useUrlPage } from '../../hooks/useUrlState';
import { fetchAuditLogs } from '../../controllers/adminController';

// The Action column gets extra left padding so the coloured badges don't touch the table edge.
const actionCell = { ...s.td, paddingLeft: 24 };
const actionHead = { ...s.th, paddingLeft: 24 };

export function AuditLogTab() {
  const LOGS_PER_PAGE = 10;
  const [filters, setFilters] = useState({ action: '', actorType: '', actorId: '', email: '' });
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [logPage, setLogPage] = useUrlPage('apage');
  const [currentTime] = useState(() => Date.now());

  async function loadLogs(resetPage = false) {
    if (resetPage) setLogPage(1);
    setLoading(true);
    try {
      const { action, actorType, actorId, email } = filters;
      const { data } = await fetchAuditLogs({
        action,
        actor_type: actorType,
        actor_id: actorId,
        email,
      });
      setLogs(data || []);
    } catch {
      notify('Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    queueMicrotask(() => loadLogs().catch(console.error));
  // loadLogs reads the current filter state when the audit tab mounts.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logPageData = paginate(logs, logPage, LOGS_PER_PAGE);
  const visibleLogs = logPageData.visible;
  const activeFilterCount = Object.values(filters).filter(Boolean).length;
  const latestLog = logs[0];
  const actorLabel = filters.actorType === 'student' ? 'Student ID' : 'Teacher ID';
  const actionTone = (action = '') => {
    const value = action.toLowerCase();
    if (value.includes('delete') || value.includes('reject')) return { color: c.danger, background: c.dangerBg };
    if (value.includes('create') || value.includes('approve')) return { color: c.accent, background: c.accentBg };
    if (value.includes('update') || value.includes('edit')) return { color: c.info, background: c.infoBg };
    return { color: c.muted, background: c.panel };
  };
  const formatRelativeTime = (value) => {
    if (!value) return '--';
    const seconds = Math.max(0, Math.floor((currentTime - new Date(value).getTime()) / 1000));
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return new Date(value).toLocaleDateString();
  };
  const clearFilters = () => {
    setFilters({ action: '', actorType: '', actorId: '', email: '' });
    setLogPage(1);
    fetchAuditLogs({}).then(({ data }) => setLogs(data || [])).catch(() => notify('Failed to load audit logs.'));
  };

  return (
    <>
      <PageHeader title="Audit Logs" subtitle="Review administrative actions, account changes, and grade activity." />

      <div style={{ ...s.panel, width: '100%', boxSizing: 'border-box', padding: 0, overflow: 'hidden' }}>
        <SectionHeader
          title="Audit Activity"
          right={`${logs.length} ${logs.length === 1 ? 'entry' : 'entries'}`}
        />
        <div style={{ padding: '12px 16px', background: 'var(--app-card)', borderBottom: '1px solid var(--app-border)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1.1fr) minmax(220px, 1.1fr) minmax(260px, 1.25fr) auto', alignItems: 'end', gap: 10 }}>
            <div>
              <label style={s.label}>Action</label>
              <input
                style={s.input}
                placeholder="Search by action"
                value={filters.action}
                onChange={(e) => setFilters({ ...filters, action: e.target.value })}
              />
            </div>
            <div>
              <label style={s.label}>Actor type</label>
              <select
                style={s.input}
                value={filters.actorType}
                onChange={(e) => setFilters({ ...filters, actorType: e.target.value, actorId: '', email: '' })}
              >
                <option value="">All actors</option>
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
              </select>
            </div>
            {filters.actorType ? (
              <div>
                <label style={s.label}>Actor ID <span style={{ fontWeight: 400, textTransform: 'none' }}>({actorLabel})</span></label>
                <input
                  style={s.input}
                  placeholder={`Search by ${actorLabel.toLowerCase()}`}
                  value={filters.actorId}
                  onChange={(e) => setFilters({ ...filters, actorId: e.target.value })}
                />
              </div>
            ) : (
              <div>
                <label style={s.label}>Actor email</label>
                <input
                  style={s.input}
                  placeholder="Search by actor email"
                  value={filters.email}
                  onChange={(e) => setFilters({ ...filters, email: e.target.value })}
                />
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifySelf: 'start' }}>
              <button style={{ ...s.submitBtn(false), marginTop: 0, whiteSpace: 'nowrap' }} onClick={() => loadLogs(true)}>Search logs</button>
              <button
                type="button"
                style={{ ...s.paginationButton(false), width: 40, height: 40, padding: 0, display: 'grid', placeItems: 'center', fontSize: 18 }}
                onClick={loadLogs}
                title="Refresh audit logs"
                aria-label="Refresh audit logs"
              >
                <Icon name="refresh" size={14} />
              </button>
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  style={{ ...s.paginationButton(false), padding: '10px 14px', whiteSpace: 'nowrap' }}
                  onClick={clearFilters}
                >
                  Clear
                </button>
              )}
            </div>
          </div>
          <div style={{ marginTop: 6, fontSize: 11, color: c.muted }}>
            Choose Student or Teacher to search by actor ID. Use All actors to search by actor email.
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8, padding: '12px 16px', background: 'var(--app-card)', borderBottom: '1px solid var(--app-border)', boxShadow: 'none' }}>
          {[
            ['Total entries', logs.length],
            ['Active filters', activeFilterCount],
            ['Latest activity', formatRelativeTime(latestLog?.created_at)],
          ].map(([label, value]) => (
            <div
              key={label}
              style={{
                padding: '10px 12px',
                background: 'var(--app-card)',
                border: '1px solid var(--app-border)',
                borderRadius: 7,
                boxShadow: 'none',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 10, color: c.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
              <div style={{ marginTop: 4, fontSize: 18, fontWeight: 700, color: c.text }}>{value}</div>
            </div>
          ))}
        </div>

        {loading ? (
          <div style={{ ...s.comingSoon, minHeight: 160, padding: '32px 16px', boxSizing: 'border-box' }}>
            <div style={{ fontSize: 13, color: c.muted }}>Loading audit activity...</div>
          </div>
        ) : logs.length === 0 ? (
          <div style={{ ...s.comingSoon, minHeight: 180, padding: '36px 16px', boxSizing: 'border-box', gap: 8 }}>
            <div style={{ width: 38, height: 38, display: 'grid', placeItems: 'center', borderRadius: '50%', background: c.panel, color: c.muted, fontSize: 20 }}>⌕</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: c.text }}>
              {activeFilterCount > 0 ? 'No matching activity' : 'No audit activity yet'}
            </div>
            <div style={{ fontSize: 12, color: c.muted }}>
              {activeFilterCount > 0 ? 'Try adjusting your filters or clear them to see all activity.' : 'Administrative actions will appear here when they are recorded.'}
            </div>
            {activeFilterCount > 0 && (
              <button type="button" style={s.paginationButton(false)} onClick={clearFilters}>Clear filters</button>
            )}
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ ...s.table, minWidth: 820 }}>
                <colgroup>
                  <col style={{ width: 230 }} /><col style={{ width: '24%' }} /><col /><col style={{ width: 170 }} />
                </colgroup>
                <thead>
                  <tr>
                    <th style={actionHead}>Action</th>
                    <th style={s.th}>Actor</th>
                    <th style={s.th}>Details</th>
                    <th style={s.th}>When</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleLogs.map((log) => (
                    <tr key={log.id}>
                      <td style={actionCell}>
                        <span style={{
                          display: 'inline-block', padding: '4px 10px', borderRadius: 999,
                          fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', whiteSpace: 'nowrap',
                          color: actionTone(log.action).color, background: actionTone(log.action).background,
                        }}>
                          {log.action || 'UNKNOWN'}
                        </span>
                      </td>
                      <td style={s.td}>
                        <div style={{ color: c.text, wordBreak: 'break-all' }}>{log.user_email || log.actor_id || '--'}</div>
                        {log.actor_type && <div style={{ marginTop: 3, fontSize: 11, color: c.muted, textTransform: 'capitalize' }}>{log.actor_type.toLowerCase()}</div>}
                      </td>
                      <td style={{ ...s.td, color: c.muted, fontSize: 12 }}>{log.details || '--'}</td>
                      <td style={{ ...s.td, whiteSpace: 'nowrap' }}>
                        <div style={{ color: c.text }}>{formatRelativeTime(log.created_at)}</div>
                        {log.created_at && <div style={{ marginTop: 3, fontSize: 11, color: c.muted }}>{new Date(log.created_at).toLocaleString()}</div>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {logs.length > LOGS_PER_PAGE && (
              <div style={{ padding: '0 16px 12px' }}>
              <UserPagination
                page={logPageData.current}
                totalPages={logPageData.totalPages}
                totalItems={logs.length}
                pageSize={LOGS_PER_PAGE}
                onPageChange={setLogPage}
                itemLabel="audit entries"
              />
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

