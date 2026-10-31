import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchTeacherOfferings,
  fetchOfferingEnrollments,
  fetchGrades,
  submitGrade,
  updateGrade,
  deleteGrade,
  getTeacherProfile,
} from '../controllers/teacherController';
import { signOut } from '../controllers/authController';
import Logo from '../assets/Logo.png';

const shell = {
  page: {
    minHeight: '100vh',
    background: 'var(--app-bg-gradient)',
    color: 'var(--app-text)',
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
  },
  layout: {
    display: 'grid',
    gridTemplateColumns: '220px 1fr',
    minHeight: '100vh',
  },
  sidebar: {
    borderRight: '1px solid var(--app-border)',
    background: 'var(--app-card)',
    padding: '28px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  logo: {
    fontFamily: 'monospace',
    fontSize: 16,
    color: 'var(--app-accent)',
    letterSpacing: '0.08em',
    marginBottom: 16,
    paddingLeft: 4,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  logoImg: {
    width: 28,
    height: 28,
    objectFit: 'contain',
  },
  logoDot: {
    width: 8,
    height: 8,
    background: 'var(--app-accent)',
    borderRadius: '50%',
    boxShadow: '0 0 8px var(--app-accent)',
    flexShrink: 0,
  },
  navLabel: {
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: '0.12em',
    color: 'var(--app-muted)',
    textTransform: 'uppercase',
    padding: '0 10px',
    margin: '12px 0 4px',
  },
  pillBtn: (active) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 14px',
    borderRadius: 50,
    border: active ? '1px solid var(--app-accent)' : '1px solid transparent',
    background: active ? 'var(--app-accent-bg)' : 'transparent',
    color: active ? 'var(--app-accent)' : 'var(--app-muted)',
    fontSize: 13.5,
    fontWeight: 500,
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
    fontFamily: 'inherit',
    transition: 'all 0.18s',
  }),
  sidebarFooter: {
    marginTop: 'auto',
    paddingTop: 16,
    borderTop: '1px solid var(--app-border)',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  profileCard: {
    padding: '10px 12px',
    borderRadius: 8,
    background: 'var(--app-panel)',
    border: '1px solid var(--app-border)',
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  main: {
    padding: 28,
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  offeringBtn: (active) => ({
    width: '100%',
    textAlign: 'left',
    padding: '10px 14px',
    borderRadius: 14,
    border: active ? '1px solid var(--app-accent)' : '1px solid transparent',
    background: active ? 'var(--app-accent-bg)' : 'transparent',
    color: active ? 'var(--app-accent)' : 'var(--app-muted)',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    transition: 'all 0.15s ease',
    fontFamily: 'inherit',
  }),
  badge: (tone = 'green') => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    padding: '5px 10px',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    color: tone === 'blue' ? '#e0f2fe' : tone === 'amber' ? '#fde68a' : '#86efac',
    background:
      tone === 'blue'
        ? 'rgba(20, 43, 121, 0.65)'
        : tone === 'amber'
          ? 'rgba(96, 42, 12, 0.6)'
          : 'rgba(22, 101, 52, 0.32)',
    border: '1px solid rgba(255,255,255,0.08)',
  }),
  hero: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    flexWrap: 'wrap',
    textAlign: 'center',
  },
  heroText: {
    flex: '1 1 100%',
    maxWidth: 760,
  },
  title: { margin: 0, fontSize: 26, fontWeight: 600, letterSpacing: '-0.01em' },
  subtitle: { margin: '4px 0 0', color: 'var(--app-muted)', maxWidth: 720, lineHeight: 1.5, fontSize: 13 },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    gap: 14,
  },
  statCard: {
    borderRadius: 18,
    border: '1px solid var(--app-border)',
    background: 'var(--app-card)',
    padding: 18,
  },
  statLabel: { margin: 0, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--app-muted)' },
  statValue: { margin: '10px 0 0', fontSize: 26, fontWeight: 700, letterSpacing: '-0.03em' },
  statSub: { margin: '6px 0 0', fontSize: 12, color: 'var(--app-muted)' },
  sectionBar: {
    padding: '12px 18px',
    background: 'var(--app-accent-bg)',
    borderBottom: '1px solid var(--app-border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionBarTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 14,
    fontWeight: 700,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: 'var(--app-accent)',
  },
  panel: {
    borderRadius: 20,
    border: '1px solid var(--app-border)',
    background: 'var(--app-card)',
    overflow: 'hidden',
    boxShadow: '0 24px 60px rgba(0,0,0,0.18)',
  },
  panelHead: {
    padding: '16px 18px',
    borderBottom: '1px solid var(--app-border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  panelTitle: { margin: 0, fontSize: 14, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--app-accent)' },
  table: { width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' },
  th: {
    textAlign: 'left',
    padding: '12px 16px',
    fontSize: 11,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: 'var(--app-muted)',
    background: 'var(--app-panel)',
    position: 'sticky',
    top: 0,
    zIndex: 1,
  },
  td: {
    padding: '12px 16px',
    borderTop: '1px solid var(--app-border)',
    verticalAlign: 'middle',
  },
  studentCell: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    paddingLeft: 0,
    lineHeight: 1.35,
    textAlign: 'left',
  },
  studentIdCell: {
    paddingLeft: 12,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    maxWidth: 92,
    borderRadius: 10,
    border: '1px solid var(--app-border)',
    background: 'var(--app-panel)',
    color: 'var(--app-text)',
    padding: '8px 10px',
    outline: 'none',
    boxSizing: 'border-box',
    margin: '0 auto',
    display: 'block',
  },
  centerCell: {
    textAlign: 'center',
  },
  actionBtn: (disabled) => ({
    border: '1px solid var(--app-border)',
    background: disabled ? 'var(--app-panel)' : 'var(--app-accent-bg)',
    color: disabled ? 'var(--app-muted)' : 'var(--app-accent)',
    borderRadius: 10,
    padding: '9px 12px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontWeight: 700,
    minWidth: 88,
    margin: '0 auto',
    display: 'block',
  }),
  helperText: { color: 'var(--app-muted)', fontSize: 12, lineHeight: 1.5 },
  emptyState: {
    padding: 28,
    color: 'var(--app-muted)',
    textAlign: 'center',
  },
  tableWrap: {
    maxHeight: 'calc(100vh - 420px)',
    overflow: 'auto',
  },
};

function fmtGrade(value) {
  if (value === '' || value == null) return '';
  const n = Number(value);
  return Number.isNaN(n) ? value : n.toFixed(2);
}

export default function TeacherHome() {
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [offerings, setOfferings] = useState([]);
  const [selected, setSelected] = useState(null);
  const [teacherProfile, setTeacherProfile] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    loadOfferings();
    getTeacherProfile()
      .then(({ data }) => setTeacherProfile(data))
      .catch(() => setTeacherProfile(null));
  }, []);

  async function loadOfferings() {
    try {
      const { data } = await fetchTeacherOfferings();
      setOfferings(data);
      if (data.length && !selected) {
        selectOffering(data[0]);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to load offerings.');
    }
  }

  async function handleLogout() {
    try {
      await signOut();
    } catch (err) {
      console.warn('logout request failed, clearing local session anyway', err);
    } finally {
      navigate('/');
    }
  }

  async function selectOffering(off) {
    const offering = {
      ...off,
      subjectId: off.subject_id ?? off.subject,
    };
    setSelected(offering);
    setEnrollments([]);
    setGrades([]);
    setErrors({});
    try {
      setLoading(true);
      const [enrollmentRes, gradeRes] = await Promise.all([
        fetchOfferingEnrollments(offering.id),
        fetchGrades({ offering: offering.id }),
      ]);
      const gradeMap = new Map((gradeRes.data || []).map((g) => [g.student, g]));
      setGrades(gradeRes.data || []);
      const rows = enrollmentRes.data.map((r) => {
        const existing = gradeMap.get(r.student_id);
        return {
          enrollment_id: r.id,
          student_id: r.student_id,
          student_name: r.student_name,
          subjectId: r.subject_id,
          student_id_no: r.student_id_no,
          prelim: fmtGrade(existing?.prelim ?? ''),
          midterm: fmtGrade(existing?.midterm ?? ''),
          finals: fmtGrade(existing?.finals ?? ''),
          remarks: existing?.remarks ?? '',
          grade_id: existing?.id ?? null,
        };
      });
      setEnrollments(rows);
    } catch (err) {
      console.error(err);
      alert('Failed to load enrollments.');
    } finally {
      setLoading(false);
    }
  }

  function validateRow(row) {
    const next = {};
    const hasAny = ['prelim', 'midterm', 'finals'].some((key) => {
      const value = row[key];
      return value !== '' && value != null;
    });
    if (!hasAny) next._row = 'Enter at least one grade.';

    for (const key of ['prelim', 'midterm', 'finals']) {
      const value = row[key];
      if (value === '' || value == null) continue;
      const numeric = Number(value);
      if (Number.isNaN(numeric)) next[key] = 'Must be a number.';
      else if (numeric < 1 || numeric > 5) next[key] = 'Must be between 1.00 and 5.00.';
    }
    return next;
  }

  async function handleSubmitGrade(row) {
    if (!selected) return;
    const rowErrors = validateRow(row);
    setErrors((prev) => ({ ...prev, [row.enrollment_id]: rowErrors }));
    if (Object.keys(rowErrors).length) return;

    const payload = {
      student: row.student_id,
      subject: row.subjectId || selected.subjectId,
      offering: selected.id,
      term: selected.term,
      prelim: row.prelim === '' ? null : Number(row.prelim),
      midterm: row.midterm === '' ? null : Number(row.midterm),
      finals: row.finals === '' ? null : Number(row.finals),
      remarks: row.remarks,
    };

    try {
      setSavingId(row.enrollment_id);
      if (row.grade_id) {
        await updateGrade(row.grade_id, payload);
      } else {
        await submitGrade(payload);
      }
      await selectOffering(selected);
    } catch (err) {
      console.error(err);
      alert('Failed to save grade: ' + (err.response?.data ? JSON.stringify(err.response.data) : err.message));
    } finally {
      setSavingId(null);
    }
  }

  async function handleDeleteGrade(row) {
    if (!row.grade_id) return;
    if (!confirm('Delete this grade entry?')) return;
    try {
      await deleteGrade(row.grade_id);
      await selectOffering(selected);
    } catch (err) {
      console.error(err);
      alert('Failed to delete grade: ' + (err.response?.data ? JSON.stringify(err.response.data) : err.message));
    }
  }

  const summary = useMemo(() => {
    const graded = grades.filter((g) => g.finals != null);
    const passing = graded.filter((g) => Number(g.finals) <= 3.0).length;
    return {
      offerings: offerings.length,
      students: enrollments.length,
      graded: graded.length,
      passing,
    };
  }, [offerings.length, enrollments.length, grades]);

  return (
    <div style={shell.page}>
      <div style={{ ...shell.layout, gridTemplateColumns: `${sidebarCollapsed ? 72 : 220}px 1fr` }}>
        <aside className={`dashboard-sidebar${sidebarCollapsed ? ' collapsed' : ''}`} style={{ ...shell.sidebar, width: sidebarCollapsed ? 72 : 220, boxSizing: 'border-box' }}>
          <button type="button" aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} onClick={() => setSidebarCollapsed((value) => !value)} style={{ ...shell.logo, justifyContent: sidebarCollapsed ? 'center' : 'flex-start', padding: sidebarCollapsed ? '10px 0' : '0 0 0 4px', width: '100%', border: 0, background: 'transparent', cursor: 'pointer' }}>
            <img src={Logo} alt="Alliance Team Titans logo" style={shell.logoImg} />
            {!sidebarCollapsed && <span>TEACHER PORTAL</span>}
          </button>
          {!sidebarCollapsed && <div style={shell.navLabel}>Navigation</div>}
          <button
            onClick={() => selected ? selectOffering(selected) : loadOfferings()}
            title="Refresh dashboard"
            aria-label="Refresh dashboard"
            className="sidebar-nav-action"
            style={{ ...shell.pillBtn(true), justifyContent: sidebarCollapsed ? 'center' : 'flex-start', padding: sidebarCollapsed ? '10px 0' : '10px 14px' }}
          >
            <span style={{ fontSize: 15, width: 18, textAlign: 'center', flexShrink: 0 }}>↻</span>
            {!sidebarCollapsed && 'Refresh Dashboard'}
          </button>

          {!sidebarCollapsed && <div style={shell.navLabel}>My Offerings</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: '56vh', overflowY: 'auto', paddingRight: 2 }}>
            {offerings.length === 0 && <div style={{ ...shell.helperText, padding: '0 10px' }}>No assigned offerings yet.</div>}
            {offerings.map((off) => (
              <button className="sidebar-offering-action" key={off.id} title={`${off.offer_code} · ${off.subject_code}`} onClick={() => selectOffering(off)} style={shell.offeringBtn(selected?.id === off.id)}>
                {!sidebarCollapsed && <><span style={{ fontWeight: 700 }}>{off.offer_code}</span><span style={{ fontSize: 11, color: '#94a3b8' }}>{off.subject_code} • {off.term_label}</span></>}
                {sidebarCollapsed && <span style={{ fontWeight: 700 }}>{off.offer_code.slice(0, 3)}</span>}
              </button>
            ))}
          </div>

          <div style={shell.sidebarFooter}>
            {teacherProfile && !sidebarCollapsed && (
              <div style={shell.profileCard}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0', lineHeight: 1.3 }}>
                  {teacherProfile.first_name} {teacherProfile.last_name}
                </div>
                <div style={{ fontSize: 10, color: '#64748b', fontFamily: 'monospace' }}>
                  {teacherProfile.teacher_id || 'Faculty'}
                </div>
                {teacherProfile.college_name && (
                  <div style={{ fontSize: 10, color: '#4ade80', marginTop: 2 }}>
                    {teacherProfile.college_name}
                  </div>
                )}
              </div>
            )}
            <button className="sidebar-logout" title="Log out" aria-label="Log out" onClick={handleLogout} style={{ ...shell.pillBtn(false), color: 'var(--app-danger)', border: '1px solid var(--app-danger-border)', justifyContent: sidebarCollapsed ? 'center' : 'flex-start', padding: sidebarCollapsed ? '10px 0' : '10px 14px' }}>
              <span style={{ fontSize: 14, width: 18, textAlign: 'center' }}>⏻</span>
              {!sidebarCollapsed && 'Log Out'}
            </button>
          </div>
        </aside>

        <main style={shell.main}>
          <section style={shell.hero}>
            <div style={shell.heroText}>
              <h1 style={shell.title}>
                {selected ? `${selected.offer_code} · ${selected.subject_name}` : 'Select an offering'}
              </h1>
              <p style={shell.subtitle}>
                Post preliminary, midterm, and finals grades for the students assigned to your class. Existing grades can be updated directly from this screen.
              </p>
            </div>
            {selected && <span style={shell.badge('blue')}>{selected.term_label}</span>}
          </section>

          <section style={shell.statsGrid}>
            <div style={shell.statCard}>
              <p style={shell.statLabel}>Offerings</p>
              <p style={shell.statValue}>{summary.offerings}</p>
              <p style={shell.statSub}>assigned to your account</p>
            </div>
            <div style={shell.statCard}>
              <p style={shell.statLabel}>Students</p>
              <p style={shell.statValue}>{summary.students}</p>
              <p style={shell.statSub}>in the selected section</p>
            </div>
            <div style={shell.statCard}>
              <p style={shell.statLabel}>Graded</p>
              <p style={shell.statValue}>{summary.graded}</p>
              <p style={shell.statSub}>saved grade records</p>
            </div>
            <div style={shell.statCard}>
              <p style={shell.statLabel}>Passing</p>
              <p style={shell.statValue}>{summary.passing}</p>
              <p style={shell.statSub}>finals grade ≤ 3.0</p>
            </div>
          </section>

          <section style={shell.panel}>
            <div style={shell.sectionBar}>
              <div style={shell.sectionBarTitle}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
                Roster & Grade Editor
              </div>
              {selected && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', paddingRight: 18 }}>
                  <span style={shell.badge('amber')}>{enrollments.length} enrolled</span>
                </div>
              )}
            </div>
            <div style={{ padding: '14px 18px 0' }}>
              <div style={shell.helperText}>Enter any term grade. Existing grades can be updated directly.</div>
            </div>

            {!selected ? (
              <div style={shell.emptyState}>Choose an offering from the left panel to load enrolled students.</div>
            ) : loading ? (
              <div style={shell.emptyState}>Loading students…</div>
            ) : enrollments.length === 0 ? (
              <div style={shell.emptyState}>No enrolled students are available for this offering yet.</div>
            ) : (
              <div style={shell.tableWrap}>
                <table style={shell.table}>
                  <colgroup>
                    <col style={{ width: '22%' }} />
                    <col style={{ width: '14%' }} />
                    <col style={{ width: '10%' }} />
                    <col style={{ width: '10%' }} />
                    <col style={{ width: '10%' }} />
                    <col style={{ width: '14%' }} />
                    <col style={{ width: '10%' }} />
                    <col style={{ width: '10%' }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th style={shell.th}>Student</th>
                      <th style={{ ...shell.th, ...shell.centerCell }}>Student ID</th>
                      <th style={{ ...shell.th, ...shell.centerCell }}>Prelim</th>
                      <th style={{ ...shell.th, ...shell.centerCell }}>Midterm</th>
                      <th style={{ ...shell.th, ...shell.centerCell }}>Finals</th>
                      <th style={{ ...shell.th, ...shell.centerCell }}>Remarks</th>
                      <th style={{ ...shell.th, ...shell.centerCell }}>State</th>
                      <th style={{ ...shell.th, ...shell.centerCell }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enrollments.map((row, index) => {
                      const rowState = row.grade_id ? 'Updated' : 'New';
                      const rowBadgeTone = row.grade_id ? 'blue' : 'green';
                      return (
                        <tr key={row.enrollment_id} style={{ background: index % 2 === 0 ? 'transparent' : 'rgba(148, 163, 184, 0.2)' }}>
                          <td style={{ ...shell.td, textAlign: 'left' }}>
                            <div style={shell.studentCell}>
                              <div style={{ fontWeight: 600, fontSize: 13 }}>{row.student_name}</div>
                            </div>
                          </td>
                          <td style={{ ...shell.td, ...shell.studentIdCell }}>
                            <span style={{ fontFamily: 'monospace', color: '#16a34a', fontWeight: 600 }}>{row.student_id_no}</span>
                          </td>
                          <td style={{ ...shell.td, ...shell.centerCell }}>
                            <input
                              value={row.prelim}
                              onChange={(e) => {
                                const copy = [...enrollments];
                                copy[index].prelim = e.target.value;
                                setEnrollments(copy);
                              }}
                              style={shell.input}
                              placeholder=""
                            />
                            {errors[row.enrollment_id]?.prelim && <div style={{ color: '#fca5a5', fontSize: 11, marginTop: 6 }}>{errors[row.enrollment_id].prelim}</div>}
                          </td>
                          <td style={{ ...shell.td, ...shell.centerCell }}>
                            <input
                              value={row.midterm}
                              onChange={(e) => {
                                const copy = [...enrollments];
                                copy[index].midterm = e.target.value;
                                setEnrollments(copy);
                              }}
                              style={shell.input}
                              placeholder=""
                            />
                            {errors[row.enrollment_id]?.midterm && <div style={{ color: '#fca5a5', fontSize: 11, marginTop: 6 }}>{errors[row.enrollment_id].midterm}</div>}
                          </td>
                          <td style={{ ...shell.td, ...shell.centerCell }}>
                            <input
                              value={row.finals}
                              onChange={(e) => {
                                const copy = [...enrollments];
                                copy[index].finals = e.target.value;
                                setEnrollments(copy);
                              }}
                              style={shell.input}
                              placeholder=""
                            />
                            {errors[row.enrollment_id]?.finals && <div style={{ color: '#fca5a5', fontSize: 11, marginTop: 6 }}>{errors[row.enrollment_id].finals}</div>}
                          </td>
                          <td style={{ ...shell.td, ...shell.centerCell }}>
                            <input
                              value={row.remarks}
                              onChange={(e) => {
                                const copy = [...enrollments];
                                copy[index].remarks = e.target.value;
                                setEnrollments(copy);
                              }}
                              style={{ ...shell.input, maxWidth: 160 }}
                              placeholder="Optional"
                            />
                          </td>
                          <td style={{ ...shell.td, ...shell.centerCell }}>
                            <span style={shell.badge(rowBadgeTone)}>{rowState}</span>
                          </td>
                          <td style={{ ...shell.td, ...shell.centerCell }}>
                            <button
                              onClick={() => handleSubmitGrade(row)}
                              disabled={savingId === row.enrollment_id}
                              style={shell.actionBtn(savingId === row.enrollment_id)}
                            >
                              {savingId === row.enrollment_id ? 'Saving…' : row.grade_id ? 'Update' : 'Post'}
                            </button>
                            {row.grade_id && (
                              <button
                                onClick={() => handleDeleteGrade(row)}
                                style={{
                                  ...shell.actionBtn(false),
                                  marginTop: 8,
                                  border: '1px solid rgba(220, 38, 38, 0.35)',
                                  background: 'rgba(220, 38, 38, 0.12)',
                                  color: '#b91c1c',
                                }}
                              >
                                Delete
                              </button>
                            )}
                            {errors[row.enrollment_id]?._row && (
                              <div style={{ color: '#fca5a5', fontSize: 11, marginTop: 6 }}>
                                {errors[row.enrollment_id]._row}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
