import React, { useState, useEffect, useRef } from 'react';
import Icon from '../../components/Icons';
import { notify, confirmDialog } from '../../components/toastBus';
import { PageHeader, PanelTitle, Field, SectionHeader, StatCard } from '../../components/ui';
import { s, c, fmtGrade, parseCsv, UserPagination, escapeHtml, MultiSelect } from './AdminShared';
import {
  addCollege, addDegreeProgram, addSubject,
  fetchCollege, fetchProgram, fetchSubjects,
  adminCreateTeacher, fetchTeachers,
  adminCreateStudent, fetchStudents,
  fetchSemesterLoads, addSemesterLoad,
  fetchTerms, createTerm, fetchOfferings, createOffering,
  fetchTeachers as fetchAllTeachers,
  getEnrollmentQueue, approveRejectEnrollments,
  fetchGrades, updateGrade, deleteGrade,
  fetchGradeReport, exportGradeReportCsv, exportGradeReportExcel,
  fetchAuditLogs, adminUpdateUser, adminDeleteUser, adminDeleteStudentRecord,
  fetchNotifications,
} from '../../controllers/adminController';

export function ApprovalQueue() {
  const [queue,         setQueue]         = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [selected,      setSelected]      = useState(new Set());
  const [submitting,    setSubmitting]    = useState(false);
  const [statusFilter,  setStatusFilter]  = useState('PENDING');
  const [expandedKey,   setExpandedKey]   = useState(null);

  // loadQueue is intentionally scoped to the current tab and status filter.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadQueue(); }, [statusFilter]);

  async function loadQueue() {
    setLoading(true);
    setSelected(new Set());
    try {
      const { data } = await getEnrollmentQueue(statusFilter);
      setQueue(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  // Group: year_level -> program -> "SUBJECT_CODE - SUBJECT_NAME" -> [enrollments]
  const grouped = queue.reduce((acc, enr) => {
    const yl   = enr.year_level ?? '?';
    const prog = enr.program    ?? 'Unknown';
    const subjectLabel = `${enr.subject_code} - ${enr.subject_name}`;
    if (!acc[yl])             acc[yl]             = {};
    if (!acc[yl][prog])       acc[yl][prog]       = {};
    if (!acc[yl][prog][subjectLabel]) acc[yl][prog][subjectLabel] = [];
    acc[yl][prog][subjectLabel].push(enr);
    return acc;
  }, {});

  const yearLevels = Object.keys(grouped).sort((a, b) => a - b);

  const toggleOne = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleGroup = (ids) => {
    const allSel = ids.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => allSel ? next.delete(id) : next.add(id));
      return next;
    });
  };

  async function handleAction(action) {
    if (!selected.size) return;
    setSubmitting(true);
    try {
      await approveRejectEnrollments([...selected], action);
      await loadQueue();
    } catch (err) {
      notify('Error: ' + (err.response?.data ? JSON.stringify(err.response.data) : err.message));
    } finally { setSubmitting(false); }
  }

  const isPending = statusFilter === 'PENDING';

  return (
    <div style={{ ...s.panel, padding: 0, gap: 0, overflow: 'hidden' }}>
      <SectionHeader
        title="Request Queue"
        right={`${queue.length} ${queue.length === 1 ? 'request' : 'requests'}`}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '14px 18px', background: 'var(--app-card)', borderBottom: '1px solid var(--app-border)' }}>

        {/* Status filter pills */}
        <div style={{ display: 'flex', gap: 6 }}>
          {['PENDING', 'APPROVED', 'REJECTED', 'ENROLLED'].map((st) => {
            const sc     = STATUS_COLORS[st];
            const active = statusFilter === st;
            return (
              <button key={st} onClick={() => setStatusFilter(st)} style={{
                background: active ? sc.bg : 'transparent',
                border:     `1px solid ${active ? sc.border : 'var(--app-border)'}`,
                color:      active ? sc.color : c.muted,
                borderRadius: 999, padding: '6px 12px',
                fontSize: 12, fontWeight: 600, letterSpacing: '0.04em',
                cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
              }}>
                {st}
              </button>
            );
          })}
        </div>

        {/* Bulk actions - PENDING only, when something is selected */}
        {isPending && selected.size > 0 && (
          <div style={{ display: 'flex', gap: 8, marginLeft: 'auto', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: c.muted }}>{selected.size} selected</span>
            <button onClick={() => handleAction('APPROVED')} disabled={submitting} style={{
              background: submitting ? 'var(--app-panel)' : c.accentBg,
              border:     `1px solid ${submitting ? 'var(--app-border)' : 'var(--app-accent)'}`,
              color:      submitting ? c.muted : c.accent,
              borderRadius: 7, padding: '7px 16px',
              fontSize: 12, fontWeight: 600,
              cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
            }}>
              {submitting ? 'Working...' : 'Approve'}
            </button>
            <button onClick={() => handleAction('REJECTED')} disabled={submitting} style={{
              background: submitting ? 'var(--app-panel)' : c.dangerBg,
              border:     `1px solid ${submitting ? 'var(--app-border)' : c.dangerBorder}`,
              color:      submitting ? c.muted : c.danger,
              borderRadius: 7, padding: '7px 16px',
              fontSize: 12, fontWeight: 600,
              cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
            }}>
              Reject
            </button>
          </div>
        )}

        <button
          onClick={loadQueue}
          title="Refresh"
          aria-label="Refresh"
          style={{
            marginLeft: (isPending && selected.size > 0) ? 0 : 'auto',
            background: 'transparent', border: '1px solid var(--app-border)',
            color: c.muted, borderRadius: 7, padding: '6px 10px',
            fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display: 'block'}}>
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0114.13-3.36L23 10" />
            <path d="M20.49 15a9 9 0 01-14.13 3.36L1 14" />
          </svg>
        </button>
      </div>

      {loading && (
        <div style={{ ...s.comingSoon, minHeight: 180, borderRadius: 0, border: 'none' }}>
          <div style={{ fontSize: 13, color: c.muted }}>Loading...</div>
        </div>
      )}

      {!loading && queue.length === 0 && (
        <div style={{ ...s.comingSoon, minHeight: 160, borderRadius: 0, border: 'none' }}>
          <div style={{ fontSize: 30, opacity: 0.25 }}>*</div>
          <div style={{ fontSize: 13, color: c.muted }}>
            No {statusFilter.toLowerCase()} requests.
          </div>
        </div>
      )}

      {!loading && yearLevels.map((yl) => (
        <div key={yl} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Year divider */}
          <div style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.14em',
            textTransform: 'uppercase', color: c.accent,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ width: 24, height: 1, background: 'var(--app-border)', display: 'inline-block' }} />
            Year {yl}
            <span style={{ flex: 1, height: 1, background: 'var(--app-border)', display: 'inline-block' }} />
          </div>

          {/* Programs */}
          {Object.entries(grouped[yl]).map(([prog, subjects]) => {
            const groupKey   = `Y${yl}_${prog}`;
            const isExpanded = expandedKey === groupKey;
            const allIds     = Object.values(subjects).flat().map((e) => e.id);
            const selCount   = allIds.filter((id) => selected.has(id)).length;
            const totalCount = allIds.length;

            return (
              <div key={prog} style={{ ...s.panel, gap: 0, padding: 0, overflow: 'hidden' }}>

                {/* Program header */}
                <div
                  onClick={() => setExpandedKey(isExpanded ? null : groupKey)}
                  style={{
                    padding: '11px 18px',
                    background: isExpanded ? c.accentBg : 'var(--app-card)',
                    borderBottom: isExpanded ? '1px solid var(--app-border)' : 'none',
                    display: 'flex', alignItems: 'center', gap: 10,
                    cursor: 'pointer', transition: 'background 0.15s',
                  }}
                >
                  <span style={{
                    background: 'var(--app-panel)', border: '1px solid var(--app-border)',
                    color: c.muted, borderRadius: 5,
                    padding: '3px 10px', fontSize: 11, fontFamily: 'monospace', flexShrink: 0,
                  }}>{prog}</span>

                  <span style={{ fontSize: 13, color: c.muted, flex: 1 }}>
                    {Object.keys(subjects).length}{' '}
                    {Object.keys(subjects).length === 1 ? 'subject' : 'subjects'}
                    <span style={{ color: c.muted, marginLeft: 6, fontSize: 12 }}>
                      - {totalCount} {totalCount === 1 ? 'request' : 'requests'}
                    </span>
                  </span>

                  {/* Select-all for group - PENDING only */}
                  {isPending && (
                    <div
                      onClick={(e) => { e.stopPropagation(); toggleGroup(allIds); }}
                      style={{
                        fontSize: 11,
                        color:      selCount === totalCount ? c.accent : c.muted,
                        border:     `1px solid ${selCount === totalCount ? 'var(--app-accent)' : 'var(--app-border)'}`,
                        background: selCount === totalCount ? c.accentBg : 'transparent',
                        borderRadius: 5, padding: '3px 10px',
                        cursor: 'pointer', flexShrink: 0,
                      }}
                    >
                      {selCount === totalCount ? 'All selected' : `Select all (${totalCount})`}
                    </div>
                  )}

                  <span style={{ color: c.muted, fontSize: 12, flexShrink: 0 }}>
                    {isExpanded ? 'v' : '>'}
                  </span>
                </div>

                {/* Expanded subjects */}
                {isExpanded && (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {Object.entries(subjects).map(([subjectLabel, enrollments], di) => {
                      const subjectIds = enrollments.map((e) => e.id);
                      const allSubjectsSelected = subjectIds.every((id) => selected.has(id));

                      return (
                        <div key={subjectLabel} style={{
                          borderTop: di > 0 ? '1px solid var(--app-border)' : 'none',
                        }}>
                          {/* Subject sub-header */}
                          <div style={{
                            padding: '9px 20px', background: 'var(--app-panel)',
                            display: 'flex', alignItems: 'center', gap: 10,
                          }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: c.text, flex: 1 }}>
                              {subjectLabel}
                            </span>
                            <span style={{
                              fontSize: 11, color: c.muted,
                              background: 'var(--app-card)', border: '1px solid var(--app-border)',
                              borderRadius: 4, padding: '2px 8px',
                            }}>
                              {enrollments[0]?.units ?? '?'} units
                            </span>
                            <span style={{ fontSize: 11, color: c.muted }}>
                              {enrollments.length} {enrollments.length === 1 ? 'student' : 'students'}
                            </span>
                            {/* Select-all for subject - PENDING only */}
                            {isPending && (
                              <div
                                onClick={() => toggleGroup(subjectIds)}
                                style={{
                                  fontSize: 10,
                                  color:      allSubjectsSelected ? c.accent : c.muted,
                                  border:     `1px solid ${allSubjectsSelected ? 'var(--app-accent)' : 'var(--app-border)'}`,
                                  background: allSubjectsSelected ? c.accentBg : 'transparent',
                                  borderRadius: 4, padding: '2px 8px',
                                  cursor: 'pointer', flexShrink: 0,
                                }}
                              >
                                {allSubjectsSelected ? 'Selected' : 'Select all'}
                              </div>
                            )}
                          </div>

                          {/* Student rows */}
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                            <tbody>
                              {enrollments.map((enr, i) => {
                                const isSel = selected.has(enr.id);
                                const sc    = STATUS_COLORS[enr.status] || STATUS_COLORS.PENDING;
                                return (
                                  <tr
                                    key={enr.id}
                                    onClick={() => isPending && toggleOne(enr.id)}
                                    style={{
                                      background: isSel
                                        ? c.accentSoft
                                        : i % 2 === 0 ? 'transparent' : c.rowAlt,
                                      borderBottom: '1px solid var(--app-border)',
                                      cursor: isPending ? 'pointer' : 'default',
                                      transition: 'background 0.1s',
                                    }}
                                  >
                                    {/* Checkbox - PENDING only */}
                                    {isPending && (
                                      <td style={{ width: 40, padding: '10px 0 10px 20px' }}>
                                        <div style={{
                                          width: 15, height: 15, borderRadius: 3, flexShrink: 0,
                                          border:     isSel ? '1px solid var(--app-accent)' : '1px solid var(--app-border)',
                                          background: isSel ? 'var(--app-accent)' : 'transparent',
                                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }}>
                                          {isSel && <span style={{ fontSize: 9, color: c.card, fontWeight: 700 }}>x</span>}
                                        </div>
                                      </td>
                                    )}

                                    <td style={{ padding: '10px 16px', fontWeight: 500, color: c.text }}>
                                      {enr.student_name}
                                    </td>
                                    <td style={{ padding: '10px 16px', fontFamily: 'monospace', color: c.muted, fontSize: 11 }}>
                                      {enr.student_id_no}
                                    </td>
                                    <td style={{ padding: '10px 16px', color: c.muted, fontSize: 11 }}>
                                      {enr.enrolled_at
                                        ? new Date(enr.enrolled_at).toLocaleDateString('en-PH', {
                                            month: 'short', day: 'numeric',
                                            hour: '2-digit', minute: '2-digit',
                                          })
                                        : '-'}
                                    </td>
                                    <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                                      <span style={{
                                        background: sc.bg, border: `1px solid ${sc.border}`,
                                        color: sc.color, borderRadius: 20,
                                        padding: '2px 10px', fontSize: 10, fontWeight: 600,
                                        letterSpacing: '0.05em',
                                      }}>
                                        {enr.status}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}


