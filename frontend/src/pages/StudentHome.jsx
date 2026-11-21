import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  getStudentProfile,
  updateStudentProfile,
  getMyProspectus,
  submitSubjectRequest,
  getApprovedForSchedule,
  selectSchedule,
  fetchTerms,
  exportMyGrades,
  changePassword,
  fetchNotifications,
  markNotificationsRead,
} from '../controllers/studentController';
import {
  loadMyGradeRecords,
  loadGradeTimeline,
  mergeEnrolledSubjects,
} from '../controllers/gradeRecordsController';
import { signOut } from '../controllers/authController';
import DashboardLayout from '../components/DashboardLayout';
import { notify } from '../components/toastBus';
import { PageHeader, PanelTitle, Field, StatCard, SectionHeader, StatusBadge, Pagination, NotificationBell } from '../components/ui';

// Styles
const s = {
  pageTitle: { fontSize: 26, fontWeight: 600, letterSpacing: '-0.01em' },
  pageSub:   { fontSize: 13, color: 'var(--app-muted)', marginTop: 4 },
  panels:    { display: 'flex', gap: 20, flexWrap: 'wrap' },
  panel: {
    background: 'var(--app-card)', border: '1px solid var(--app-border)', borderRadius: 10,
    padding: 24, flex: 1, minWidth: 260, display: 'flex', flexDirection: 'column', gap: 14,
  },
  tabNav: {
    display: 'flex', gap: 8, padding: '12px 16px', background: 'var(--app-panel)', borderBottom: '1px solid var(--app-border)',
  },
  tabButton: (active) => ({
    padding: '10px 14px', borderRadius: 999, border: active ? '1px solid var(--app-accent)' : '1px solid transparent',
    background: active ? 'var(--app-accent-bg)' : 'transparent', color: active ? 'var(--app-accent)' : 'var(--app-muted)',
    fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.18s', whiteSpace: 'nowrap', flexShrink: 0,
  }),
  tabPanel: {
    padding: 20,
    overflowX: 'auto',
  },
  panelTitle: {
    fontSize: 14, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase',
    color: 'var(--app-accent)', display: 'flex', alignItems: 'center', gap: 6,
  },
  hint:  { fontSize: 12, color: 'var(--app-muted)', marginTop: -8, lineHeight: 1.5 },
  label: { display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--app-muted)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 5 },
  input: {
    width: '100%', background: 'var(--app-panel)', border: '1px solid var(--app-border)', borderRadius: 7,
    padding: '9px 12px', color: 'var(--app-text)', fontSize: 13.5, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
  },
  inputReadonly: {
    width: '100%', background: 'var(--app-panel)', border: '1px solid var(--app-border)', borderRadius: 7,
    padding: '9px 12px', color: 'var(--app-muted)', fontSize: 13.5, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
  },
  submitBtn: (disabled) => ({
    background: disabled ? 'var(--app-panel)' : 'var(--app-accent-bg)',
    border:     disabled ? '1px solid var(--app-border)' : '1px solid var(--app-accent)',
    color:      disabled ? 'var(--app-muted)' : 'var(--app-accent)',
    fontSize: 13, fontWeight: 600, padding: '10px 16px', borderRadius: 7,
    cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'inherit', marginTop: 2,
  }),
  comingSoon: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', minHeight: 260, gap: 12, color: 'var(--app-muted)', textAlign: 'center',
  },
  th: { padding: '8px 14px', textAlign: 'center', fontSize: 12, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--app-muted)', borderBottom: '1px solid var(--app-border)' },
  td: { padding: '10px 14px', borderBottom: '1px solid var(--app-border)', textAlign: 'left' },
  tableScroll: {
    maxHeight: 'calc(100vh - 360px)',
    overflowY: 'auto',
    overflowX: 'auto',
  },
};

function ProfileTab() {
  const [profile,    setProfile]   = useState(null);
  const [form,       setForm]      = useState({ first_name: '', last_name: '', middle_name: '' });
  const [pwForm,     setPwForm]    = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [loading,    setLoading]   = useState(false);
  const [pwLoading,  setPwLoading] = useState(false);

  const set   = (f, v) => setForm((p)   => ({ ...p, [f]: v }));
  const setPw = (f, v) => setPwForm((p) => ({ ...p, [f]: v }));

  useEffect(() => {
    getStudentProfile()
      .then(({ data }) => {
        setProfile(data);
        setForm({ first_name: data.first_name || '', last_name: data.last_name || '', middle_name: data.middle_name || '' });
      })
      .catch(console.error);
  }, []);

  async function handleProfileSave(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await updateStudentProfile({ first_name: form.first_name, last_name: form.last_name, middle_name: form.middle_name });
      setProfile((prev) => ({ ...prev, ...data }));
      notify('OK: Profile updated.');
    } catch (err) {
      notify('Error: ' + (err.response?.data ? JSON.stringify(err.response.data) : err.message));
    } finally { setLoading(false); }
  }

  async function handlePasswordChange(e) {
    e.preventDefault();
    if (pwForm.new_password !== pwForm.confirm_password) { notify('New passwords do not match.'); return; }
    setPwLoading(true);
    try {
      await changePassword({ current_password: pwForm.current_password, new_password: pwForm.new_password });
      notify('OK: Password changed.');
      setPwForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      notify('Error: ' + (err.response?.data ? JSON.stringify(err.response.data) : err.message));
    } finally { setPwLoading(false); }
  }

  return (
    <>
      <PageHeader title="My Account" subtitle="Manage your personal information and security settings." />

      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        <StatCard label="Student ID" value={profile?.student_id || '--'} />
        <StatCard label="Program" value={profile?.program_code || '--'} sub={[profile?.program_name, profile?.year_level ? `Year ${profile.year_level}` : null].filter(Boolean).join(' · ')} />
        <StatCard label="College" value={profile?.college_name || '--'} />
      </div>

      <div style={s.panels}>
        {/* Personal info */}
        <div style={s.panel}>
          <PanelTitle>Personal Information</PanelTitle>
          <p style={s.hint}>Contact the registrar for corrections to your ID, email, or program.</p>
          <form onSubmit={handleProfileSave} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <Field label="First Name">
                <input style={s.input} type="text" value={form.first_name} onChange={(e) => set('first_name', e.target.value)} required />
              </Field>
              <Field label="Middle Name">
                <input style={s.input} type="text" value={form.middle_name} onChange={(e) => set('middle_name', e.target.value)} />
              </Field>
            </div>
            <Field label="Last Name">
              <input style={s.input} type="text" value={form.last_name} onChange={(e) => set('last_name', e.target.value)} required />
            </Field>
            <Field label="Email Address">
              <input style={s.inputReadonly} type="email" value={profile?.email || ''} readOnly />
            </Field>
            <Field label="College">
              <input style={s.inputReadonly} type="text" value={profile?.college_name || '--'} readOnly />
            </Field>
            <Field label="Degree Program">
              <input style={s.inputReadonly} type="text" value={profile?.program_name ? `${profile.program_name} (${profile.program_code})` : '--'} readOnly />
            </Field>
            <Field label="Year Level">
              <input style={s.inputReadonly} type="text" value={profile?.year_level ? `Year ${profile.year_level}` : '--'} readOnly />
            </Field>
            <button type="submit" style={s.submitBtn(loading)} disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>

        {/* Change password */}
        <div style={{ ...s.panel, maxWidth: 340, flex: '0 0 340px' }}>
          <PanelTitle>Change Password</PanelTitle>
          <p style={s.hint}>Use a strong password - at least 8 characters.</p>
          <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Field label="Current Password">
              <input style={s.input} type="password" value={pwForm.current_password} onChange={(e) => setPw('current_password', e.target.value)} required />
            </Field>
            <Field label="New Password">
              <input style={s.input} type="password" value={pwForm.new_password} onChange={(e) => setPw('new_password', e.target.value)} required />
            </Field>
            <Field label="Confirm New Password">
              <input style={s.input} type="password" value={pwForm.confirm_password} onChange={(e) => setPw('confirm_password', e.target.value)} required />
            </Field>
            <button type="submit" style={s.submitBtn(pwLoading || !pwForm.current_password || !pwForm.new_password)} disabled={pwLoading || !pwForm.current_password || !pwForm.new_password}>
              {pwLoading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

// PROSPECTUS TAB

function ProspectusTab() {
  const [rows,       setRows]      = useState([]);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState([]);
  const [loading,    setLoading]   = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    return getMyProspectus()
      .then(({ data }) => setRows(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { queueMicrotask(() => load()); }, [load]);

  const total         = rows.reduce((sum, d) => sum + (d.units || 0), 0);
  const pendingCount  = rows.filter((r) => r.request_status === 'PENDING').length;
  const approvedCount = rows.filter((r) => r.request_status === 'APPROVED').length;

  const selectedUnits = selectedSubjectIds.reduce((sum, subjectId) => {
    const d = rows.find((r) => r.subject_id === subjectId);
    return sum + (d?.units || 0);
  }, 0);

  function toggleSelect(subjectId) {
    setSelectedSubjectIds((prev) =>
      prev.includes(subjectId)
        ? prev.filter((id) => id !== subjectId)
        : [...prev, subjectId]
    );
  }

  async function handleSubmitRequest() {
    if (!selectedSubjectIds.length) return;
    setSubmitting(true);
    try {
      const { data } = await submitSubjectRequest(selectedSubjectIds);
      const msg = [
        data.requested?.length ? `OK: Requested: ${data.requested.join(', ')}` : null,
        data.errors?.length    ? `Errors:\n${data.errors.join('\n')}`           : null,
      ].filter(Boolean).join('\n\n');
      notify(msg || 'OK: Done.');
      setSelectedSubjectIds([]);
      await load();
    } catch (err) {
      notify('Error: ' + (err.response?.data ? JSON.stringify(err.response.data) : err.message));
    } finally { setSubmitting(false); }
  }

  return (
    <>
      <PageHeader title="My Prospectus" subtitle="Request subjects for this semester. Submit your requests and wait for admin approval." />

      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        <StatCard label="Subjects"  value={rows.length}    sub="this semester"  />
        <StatCard label="Units"     value={total}          sub="total this sem"  accent="var(--app-success)" />
        <StatCard label="Pending"   value={pendingCount}   sub="awaiting admin"  accent="var(--app-warning)" />
        <StatCard label="Approved"  value={approvedCount}  sub="pick schedule"   accent="var(--app-info)" />
      </div>

      {loading && (
        <div style={{ ...s.comingSoon, minHeight: 160 }}>
          <div style={{ fontSize: 13, color: 'var(--app-muted)' }}>Loading...</div>
        </div>
      )}

      {!loading && rows.length === 0 && (
        <div style={{ ...s.comingSoon, minHeight: 200 }}>
          <div style={{ fontSize: 38, opacity: 0.25 }}>*</div>
          <div style={{ fontSize: 13, color: 'var(--app-muted)' }}>No active term or no subjects found for your program.</div>
        </div>
      )}

      {!loading && rows.length > 0 && (
        <div style={{ ...s.panel, gap: 0, padding: 0, overflow: 'hidden' }}>
          <SectionHeader
            title="Subjects"
            right={
              selectedSubjectIds.length > 0
                ? `${selectedSubjectIds.length} selected +${selectedUnits} units`
                : `${total} units total`
            }
          />
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--app-panel)' }}>
                {['Code', 'Subject', 'Units', 'Prerequisites', 'Status'].map((h) => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
                <th style={{ ...s.th, width: 52 }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((d, i) => {
                const alreadyReq = !!d.request_status;
                const isSelected = selectedSubjectIds.includes(d.subject_id);
                return (
                  <tr
                    key={d.subject_id}
                    onClick={() => !alreadyReq && toggleSelect(d.subject_id)}
                    style={{
                      background: isSelected ? 'var(--app-accent-soft)' : i % 2 === 0 ? 'transparent' : 'rgba(148, 163, 184, 0.08)',
                      borderBottom: '1px solid var(--app-border)',
                      cursor: alreadyReq ? 'default' : 'pointer',
                      opacity: alreadyReq ? 0.6 : 1,
                      transition: 'background 0.1s',
                    }}
                  >
                    <td style={{ ...s.td, fontFamily: 'monospace', color: 'var(--app-success)', fontSize: 11 }}>{d.code}</td>
                    <td style={{ ...s.td, color: 'var(--app-text)' }}>{d.name}</td>
                    <td style={{ ...s.td, color: 'var(--app-muted)', textAlign: 'center' }}>{d.units}</td>
                    <td style={{ ...s.td }}>
                      {d.prerequisites?.length > 0
                        ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                            {d.prerequisites.map((p) => (
                              <span key={p} style={{ background: 'var(--app-panel)', border: '1px solid var(--app-border)', color: 'var(--app-muted)', borderRadius: 4, padding: '1px 7px', fontSize: 11 }}>{p}</span>
                            ))}
                          </div>
                        )
                        : <span style={{ color: 'var(--app-muted)', fontSize: 11 }}>-</span>}
                    </td>
                    <td style={{ ...s.td }}>
                      {d.request_status
                        ? <StatusBadge status={d.request_status} />
                        : <span style={{ color: 'var(--app-muted)', fontSize: 11 }}>Not requested</span>}
                    </td>
                    <td style={{ ...s.td, paddingRight: 20, textAlign: 'center' }}>
                      {!alreadyReq && (
                        <span style={{
                          width: 15, height: 15, borderRadius: 3,
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          border: isSelected ? '1px solid var(--app-success)' : '1px solid var(--app-border)',
                          background: isSelected ? 'var(--app-success)' : 'transparent',
                        }}>
                          {isSelected && <span style={{ fontSize: 9, color: 'var(--app-surface-strong)', fontWeight: 700 }}>x</span>}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {selectedSubjectIds.length > 0 && (
            <div style={{ padding: '14px 20px', borderTop: '1px solid var(--app-border)', display: 'flex', alignItems: 'center', gap: 12, background: 'var(--app-card)' }}>
              <span style={{ flex: 1, fontSize: 12, color: 'var(--app-muted)' }}>
                {selectedSubjectIds.length} subject{selectedSubjectIds.length !== 1 ? 's' : ''} selected +
                <span style={{ color: 'var(--app-success)', fontWeight: 600 }}>+{selectedUnits} units</span>
              </span>
              <button
                onClick={() => setSelectedSubjectIds([])}
                style={{ background: 'none', border: '1px solid var(--app-border)', color: 'var(--app-muted)', borderRadius: 6, padding: '7px 14px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Clear
              </button>
              <button onClick={handleSubmitRequest} disabled={submitting} style={s.submitBtn(submitting)}>
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}


function EnrollmentTab() {
  const [activeTerm,  setActiveTerm]  = useState(null);
  const [prospectus,  setProspectus]  = useState([]);
  const [approved,    setApproved]    = useState([]);
  const [scheduling,  setScheduling]  = useState({});
  const [expandedEnr, setExpandedEnr] = useState(null);
  const [loadingMain, setLoadingMain] = useState(true);

  const reload = useCallback(async () => {
    const [{ data: pros }, { data: app }] = await Promise.all([
      getMyProspectus(),
      getApprovedForSchedule(),
    ]);
    setProspectus(pros);
    setApproved(app);
  }, []);

  useEffect(() => {
    fetchTerms()
      .then(({ data }) => setActiveTerm(data.find((t) => t.is_active) || null))
      .catch(console.error);

    queueMicrotask(() => {
      setLoadingMain(true);
      reload().catch(console.error).finally(() => setLoadingMain(false));
    });
  }, [reload]);

  const enrolledCount = prospectus.filter((d) => d.request_status === 'ENROLLED').length;

  async function handleSelectSchedule(enrollmentId, offeringId) {
    setScheduling((p) => ({ ...p, [enrollmentId]: true }));
    try {
      const { data } = await selectSchedule(enrollmentId, offeringId);
      notify(`OK: Enrolled in ${data.offer_code} - ${data.schedule}${data.room ? ` @ ${data.room}` : ''}`);
      setExpandedEnr(null);
      await reload();
    } catch (err) {
      notify('Error: ' + (err.response?.data ? JSON.stringify(err.response.data) : err.message));
    } finally { setScheduling((p) => ({ ...p, [enrollmentId]: false })); }
  }


  return (
    <>
      <PageHeader title="Enrollment" subtitle="
          {activeTerm ? `Select schedules for your approved subjects. Active term: ${activeTerm.school_year} - Semester ${activeTerm.semester}` : 'No active enrollment period. Check back later.'}
        " />

      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        <StatCard label="Term"          value={activeTerm ? activeTerm.school_year : 'Closed'} sub={activeTerm ? `Semester ${activeTerm.semester}` : 'check back later'} accent={activeTerm ? 'var(--app-success)' : 'var(--app-muted)'} />
        <StatCard label="Pick Schedule" value={approved.length} sub="approved, awaiting slot"  accent="var(--app-info)" />
        <StatCard label="Enrolled"      value={enrolledCount}   sub="schedule confirmed"      accent="var(--app-success)" />
      </div>

      {!activeTerm && (
        <div style={{ ...s.comingSoon, minHeight: 200 }}>
          <div style={{ fontSize: 40, opacity: 0.25 }}>*</div>
          <div style={{ fontSize: 13, color: 'var(--app-muted)' }}>Enrollment is currently closed.</div>
        </div>
      )}

      {activeTerm && loadingMain && (
        <div style={{ ...s.comingSoon, minHeight: 160 }}>
          <div style={{ fontSize: 13, color: 'var(--app-muted)' }}>Loading enrollment data...</div>
        </div>
      )}

      {activeTerm && !loadingMain && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {approved.length === 0 ? (
            <div style={{ ...s.panel, gap: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 38, opacity: 0.25 }}>*</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--app-text)' }}>No approved subjects yet</div>
              <div style={{ fontSize: 12, color: 'var(--app-muted)', lineHeight: 1.6 }}>
                Go to the <strong>Prospectus</strong> tab to request subjects. Once approved by admin, you can select your schedules here.
              </div>
            </div>
          ) : (
            <div style={{ ...s.panel, gap: 0, padding: 0, overflow: 'hidden' }}>
              <SectionHeader title="Step 1 - Pick Your Schedule" right={`${approved.length} subject${approved.length !== 1 ? 's' : ''} approved`} />
              {approved.map((item) => {
                const isOpen   = expandedEnr === item.enrollment_id;
                const isActing = !!scheduling[item.enrollment_id];
                return (
                  <div key={item.id} style={{ borderBottom: '1px solid var(--app-border)' }}>
                    <div
                      onClick={() => setExpandedEnr(isOpen ? null : item.enrollment_id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', cursor: 'pointer', background: isOpen ? 'var(--app-accent-bg)' : 'transparent', transition: 'background 0.15s' }}
                    >
                      <span style={{ background: 'var(--app-panel)', border: '1px solid var(--app-border)', color: 'var(--app-muted)', borderRadius: 5, padding: '3px 10px', fontSize: 11, fontFamily: 'monospace', flexShrink: 0 }}>{item.subject_code}</span>
                      <span style={{ flex: 1, fontWeight: 500, fontSize: 14, color: 'var(--app-text)' }}>{item.subject_name}</span>
                      <span style={{ fontSize: 12, color: 'var(--app-muted)' }}>{item.units} units</span>
                      <StatusBadge status="APPROVED" />
                      <span style={{ color: 'var(--app-muted)', fontSize: 12 }}>{isOpen ? 'v' : '>'}</span>
                    </div>
                    {isOpen && (
                      <div style={{ padding: '0 20px 16px', background: 'var(--app-card)' }}>
                        {item.offerings.length === 0
                          ? <div style={{ padding: '12px 0', fontSize: 12, color: 'var(--app-muted)' }}>No offerings posted yet.</div>
                          : (
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginTop: 8 }}>
                              <thead>
                                <tr style={{ background: 'var(--app-panel)' }}>
                                  {['Offer Code', 'Teacher', 'Schedule', 'Room', 'Slots', ''].map((h) => (
                                    <th key={h} style={{ ...s.th, background: 'transparent', paddingRight: 20 }}>{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {item.offerings.map((o) => {
                                  const full = o.available_slots <= 0;
                                  return (
                                    <tr key={o.id} style={{ borderBottom: '1px solid var(--app-border)' }}>
                                      <td style={{ ...s.td, fontFamily: 'monospace', color: 'var(--app-success)', fontSize: 11 }}>{o.offer_code}</td>
                                      <td style={{ ...s.td, color: 'var(--app-text)' }}>{o.teacher_name || <span style={{ color: 'var(--app-muted)' }}>TBA</span>}</td>
                                      <td style={{ ...s.td, color: 'var(--app-muted)' }}>{o.schedule}</td>
                                      <td style={{ ...s.td, color: 'var(--app-muted)' }}>{o.room || '--'}</td>
                                      <td style={{ ...s.td }}>
                                        <span style={{ color: full ? 'var(--app-danger)' : 'var(--app-success)', fontWeight: 600 }}>{o.current_slots}/{o.max_slots}</span>
                                        <span style={{ color: 'var(--app-muted)', fontSize: 11, marginLeft: 4 }}>({o.available_slots} open)</span>
                                      </td>
                                      <td style={{ ...s.td }}>
                                        <button
                                          disabled={full || isActing}
                                          onClick={() => handleSelectSchedule(item.enrollment_id, o.id)}
                                          style={{ background: full ? 'var(--app-panel)' : 'var(--app-success-bg)', border: `1px solid ${full ? 'var(--app-border)' : 'var(--app-success)'}`, color: full ? 'var(--app-muted)' : 'var(--app-success)', borderRadius: 5, padding: '4px 14px', fontSize: 11, fontWeight: 600, cursor: full ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
                                        >
                                          {isActing ? '...' : full ? 'Full' : 'Select'}
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </>
  );
}

function EmptyGradeState({ message }) {
  return (
    <div style={{
      minHeight: 300,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--app-muted)',
      fontSize: 13,
      textAlign: 'center',
      padding: 24,
    }}>
      {message}
    </div>
  );
}

// GRADES TAB--------------------------------------
function GradesTab() {
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterTerm, setFilterTerm] = useState('');
  const [prospectus, setProspectus] = useState([]);
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [timeline, setTimeline] = useState([]);
  const [timelineLoading, setTimelineLoading] = useState(true);
  const [activeGradeTab, setActiveGradeTab] = useState('enrolled');
  const [enrolledPage, setEnrolledPage] = useState(1);
  const [recordsPage, setRecordsPage] = useState(1);
  const [timelinePage, setTimelinePage] = useState(1);
  const exportRef = useRef(null);
  const pageSize = 8;

  useEffect(() => {
    loadMyGradeRecords()
      .then((records) => {
        setGrades(records.grades);
        setProspectus(records.prospectus);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadGradeTimeline()
      .then(setTimeline)
      .catch(console.error)
      .finally(() => setTimelineLoading(false));
  }, []);

  const grouped = grades.reduce((acc, g) => {
    const key = `Year ${g.year_level || '?'} - Sem ${g.semester || '?'}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(g);
    return acc;
  }, {});

  const termKeys = Object.keys(grouped).sort().reverse();
  const filteredGrades = filterTerm
    ? grades.filter((g) => `Year ${g.year_level || '?'} - Sem ${g.semester || '?'}` === filterTerm)
    : grades;
  const recordPages = Math.max(1, Math.ceil(filteredGrades.length / pageSize));
  const paginatedGrades = filteredGrades.slice((recordsPage - 1) * pageSize, recordsPage * pageSize);
  const paginatedGrouped = paginatedGrades.reduce((acc, g) => {
    const key = `Year ${g.year_level || '?'} - Sem ${g.semester || '?'}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(g);
    return acc;
  }, {});
  const visible = Object.keys(paginatedGrouped).sort().reverse();

  const syncedEnrolled = mergeEnrolledSubjects(prospectus, grades);
  const enrolledPages = Math.max(1, Math.ceil(syncedEnrolled.length / pageSize));
  const visibleEnrolled = syncedEnrolled.slice((enrolledPage - 1) * pageSize, enrolledPage * pageSize);
  const timelinePages = Math.max(1, Math.ceil(timeline.length / pageSize));
  const visibleTimeline = timeline.slice((timelinePage - 1) * pageSize, timelinePage * pageSize);

  useEffect(() => {
    function handleOutsideClick(event) {
      if (exportRef.current && !exportRef.current.contains(event.target)) {
        setExportOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const gradedAll = grades.filter((g) => g.finals != null);
  const allPassed = gradedAll.filter((g) => parseFloat(g.finals) <= 3.0);
  const allFailed = gradedAll.filter((g) => parseFloat(g.finals) > 3.0);

  const totalUnitsEarned = allPassed.reduce(
    (sum, g) => sum + (g.units || 0),
    0
  );

  const gwa = gradedAll.length
    ? (
        gradedAll.reduce(
          (sum, g) => sum + parseFloat(g.finals) * (g.units || 1),
          0
        ) /
        gradedAll.reduce((sum, g) => sum + (g.units || 1), 0)
      ).toFixed(4)
    : null;

  function gradeColor(val) {
    if (val == null) return 'var(--app-muted)';
    const n = parseFloat(val);
    if (n <= 1.5) return 'var(--app-success)';
    if (n <= 2.5) return 'var(--app-info)';
    if (n <= 3.0) return 'var(--app-warning)';
    return 'var(--app-danger)';
  }

  async function handleExportCsv() {
    try {
      setExporting(true);
      const res = await exportMyGrades();
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'grades.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      notify('Failed to download grades CSV.');
    } finally {
      setExporting(false);
      setExportOpen(false);
    }
  }

  function handleExportPdf() {
    try {
      const doc = new jsPDF({ orientation: 'landscape' });
      const now = new Date();

      doc.setFontSize(15);
      doc.text('Student Grade Report', 14, 16);
      doc.setFontSize(10);
      doc.text(`Generated: ${now.toLocaleString()}`, 14, 23);

      const tableRows = syncedEnrolled.map((d) => {
        const finals = d.finals ?? null;
        const finalsNum = finals == null ? null : Number(finals);
        const status = finalsNum == null ? 'IN PROGRESS' : finalsNum <= 3.0 ? 'PASSED' : 'FAILED';
        return [
          d.subject_code || d.code || '-',
          d.subject_name || d.name || '-',
          d.units ?? '-',
          d.prelim ?? '--',
          d.midterm ?? '--',
          d.finals ?? '--',
          status,
        ];
      });

      autoTable(doc, {
        startY: 30,
        head: [['Code', 'Subject', 'Units', 'Prelim', 'Midterm', 'Finals', 'Status']],
        body: tableRows,
        styles: { fontSize: 9, cellPadding: 2.4 },
        headStyles: { fillColor: [30, 35, 53] },
        alternateRowStyles: { fillColor: [245, 247, 250] },
      });

      doc.save('grades.pdf');
    } catch (err) {
      console.error(err);
      notify('Failed to download grades PDF.');
    } finally {
      setExportOpen(false);
    }
  }

  return (
    <>
      <div>
        <div style={s.pageTitle}>My Grades</div>
        <div style={s.pageSub}>
          Academic records + currently enrolled subjects (synced view).
        </div>
        <div style={{ marginTop: 8, position: 'relative', display: 'inline-block' }} ref={exportRef}>
          <button
            onClick={() => setExportOpen((v) => !v)}
            disabled={exporting}
            style={{
              marginTop: 8,
              padding: '7px 12px',
              fontSize: 13,
              borderRadius: 8,
              border: '1px solid var(--app-border)',
              background: 'var(--app-panel)',
              color: 'var(--app-text)',
              cursor: exporting ? 'not-allowed' : 'pointer',
            }}
          >
            {exporting ? 'Exporting...' : 'Export Grades'}
          </button>
          {exportOpen && (
            <div
              style={{
                position: 'absolute',
                top: 44,
                left: 0,
                minWidth: 170,
                border: '1px solid var(--app-border)',
                background: 'var(--app-card)',
                borderRadius: 8,
                overflow: 'hidden',
                zIndex: 5,
                boxShadow: '0 10px 24px rgba(0,0,0,0.35)',
              }}
            >
              <button
                onClick={handleExportCsv}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '10px 12px',
                  background: 'transparent',
                  color: 'var(--app-text)',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 13,
                }}
              >
                Download CSV
              </button>
              <button
                onClick={handleExportPdf}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '10px 12px',
                  background: 'transparent',
                  color: 'var(--app-text)',
                  border: 'none',
                  borderTop: '1px solid var(--app-border)',
                  cursor: 'pointer',
                  fontSize: 13,
                }}
              >
                Download PDF
              </button>
            </div>
          )}
        </div>
      </div>

      {/* STATS */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        <StatCard
          label="GWA"
          value={gwa ?? '--'}
          sub="general weighted avg"
          accent={gwa ? gradeColor(parseFloat(gwa)) : 'var(--app-muted)'}
        />
        <StatCard
          label="Units Earned"
          value={totalUnitsEarned}
          sub="passing units"
          accent="var(--app-success)"
        />
        <StatCard
          label="Passed"
          value={allPassed.length}
          sub="subjects"
          accent="var(--app-success)"
        />
        <StatCard
          label="Failed"
          value={allFailed.length}
          sub="below passing"
          accent={allFailed.length ? 'var(--app-danger)' : 'var(--app-muted)'}
        />
      </div>

      <div style={{ ...s.panel, padding: 0, overflow: 'hidden' }}>
        <div style={s.tabNav}>
          {[
            { key: 'enrolled', label: 'Enrolled Subjects' },
            { key: 'records', label: 'Grade Records' },
            { key: 'timeline', label: 'History Timeline' },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveGradeTab(tab.key)}
              style={s.tabButton(activeGradeTab === tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={s.tabPanel}>
          {activeGradeTab === 'enrolled' && (
            <>
              <div style={{ ...s.panel, padding: 0, overflow: 'hidden' }}>
                <SectionHeader title="Currently Enrolled Subjects (Synced)" />

                {syncedEnrolled.length === 0 ? (
                  <EmptyGradeState message="No enrolled subjects found." />
                ) : (
                  <>
                  <div style={s.tableScroll}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                                <tr style={{ background: 'var(--app-panel)' }}>
                                  {['Code', 'Subject', 'Units', 'PRELIM', 'MIDTERM', 'FINALS', 'REMARKS'].map(
                                    (h) => (
                                      <th key={h} style={s.th}>
                                        {h}
                                      </th>
                                    )
                                  )}
                                </tr>
                              </thead>

                              <tbody>
                                {visibleEnrolled.map((d) => (
                                  <tr key={`${d.subject_id ?? 'subject'}-${d.id ?? d.subject_code ?? d.code ?? 'subject'}`}>
                                    <td
                                      style={{
                                        ...s.td,
                                        fontFamily: 'monospace',
                                        color: 'var(--app-success)',
                                      }}
                                    >
                                      {d.subject_code || d.code}
                                    </td>

                                    <td style={{ ...s.td }}>
                                      {d.subject_name || d.name}
                                    </td>

                                    <td style={{ ...s.td, textAlign: 'center' }}>
                                      {d.units || '--'}
                                    </td>

                                    <td style={{ ...s.td, textAlign: 'center' }}>
                                      {d.prelim ?? '--'}
                                    </td>

                                    <td style={{ ...s.td, textAlign: 'center' }}>
                                      {d.midterm ?? '--'}
                                    </td>

                                    <td style={{ ...s.td, textAlign: 'center' }}>
                                      {d.finals ?? '--'}
                                    </td>

                                    <td style={{ ...s.td }}>
                                      {d.remarks || '--'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                    </table>
                  </div>
                  <Pagination page={enrolledPage} totalPages={enrolledPages} onChange={setEnrolledPage} />
                  </>
                )}
              </div>
            </>
          )}

          {activeGradeTab === 'records' && (
            <>
              <div style={{ ...s.panel, padding: 0, overflow: 'hidden' }}>
                <SectionHeader
                  title="Grade Records"
                  right={filteredGrades.length ? `${filteredGrades.length} records` : 'No records'}
                />
                {termKeys.length > 1 && (
                  <div style={{ padding: '14px 20px 0' }}>
                    <select
                      aria-label="Filter grade records by term"
                      style={{
                        ...s.input,
                        width: 'auto',
                        minWidth: 150,
                        fontSize: 12,
                        padding: '6px 10px',
                      }}
                      value={filterTerm}
                      onChange={(e) => {
                        setFilterTerm(e.target.value);
                        setRecordsPage(1);
                      }}
                    >
                      <option value="">All Terms</option>
                      {termKeys.map((k) => (
                        <option key={k} value={k}>
                          {k}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {loading ? (
                  <div style={{ ...s.comingSoon, minHeight: 300 }}>
                    <div style={{ fontSize: 13, color: 'var(--app-muted)' }}>
                      Loading grades...
                    </div>
                  </div>
                ) :
                  visible.map((term) => {
                    const tg = paginatedGrouped[term];

                    const tGraded = tg.filter((g) => g.finals != null);
                    const tPassed = tGraded.filter(
                      (g) => parseFloat(g.finals) <= 3.0
                    );

                    const tUnits = tPassed.reduce(
                      (sum, g) => sum + (g.units || 0),
                      0
                    );

                    const tGWA = tGraded.length
                      ? (
                          tGraded.reduce(
                            (sum, g) =>
                              sum + parseFloat(g.finals) * (g.units || 1),
                            0
                          ) /
                          tGraded.reduce(
                            (sum, g) => sum + (g.units || 1),
                            0
                          )
                        ).toFixed(4)
                      : null;

                  return (
                    <div
                      key={term}
                      style={{
                        ...s.panel,
                        padding: 0,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          padding: '10px 20px',
                          background: 'var(--app-accent-soft)',
                          borderBottom: '1px solid var(--app-border)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            background: 'var(--app-success)',
                            borderRadius: '50%',
                          }}
                        />
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: 'var(--app-success)',
                          }}
                        >
                          {term}
                        </span>

                        <span
                          style={{
                            marginLeft: 'auto',
                            display: 'flex',
                            gap: 14,
                          }}
                        >
                          {tGWA && (
                            <span
                              style={{
                                fontSize: 11,
                                color: gradeColor(parseFloat(tGWA)),
                              }}
                            >
                              GWA <strong>{tGWA}</strong>
                            </span>
                          )}
                          <span
                            style={{
                              fontSize: 11,
                              color: 'var(--app-muted)',
                            }}
                          >
                            {tUnits} units earned
                          </span>
                        </span>
                      </div>

                      <div style={s.tableScroll}>
                        <table
                          style={{
                            width: '100%',
                            borderCollapse: 'collapse',
                            fontSize: 13,
                          }}
                        >
                          <thead>
                            <tr style={{ background: 'var(--app-panel)' }}>
                              {[
                                'Code',
                                'Subject',
                                'Units',
                                'Prelim',
                                'Midterm',
                                'Finals',
                                'Status',
                                'Remarks',
                              ].map((h) => (
                                <th key={h} style={s.th}>
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>

                          <tbody>
                            {tg.map((g, i) => {
                              const fg =
                                g.finals != null ? parseFloat(g.finals) : null;
                              const passed = fg != null && fg <= 3.0;

                              return (
                                <tr
                                  key={g.id}
                                  style={{
                                    background:
                                      i % 2 === 0 ? 'transparent' : 'rgba(148, 163, 184, 0.08)',
                                    borderBottom: '1px solid var(--app-border)',
                                  }}
                                >
                                  <td
                                    style={{
                                      ...s.td,
                                      fontFamily: 'monospace',
                                      color: 'var(--app-success)',
                                    }}
                                  >
                                    {g.subject_code}
                                  </td>
                                  <td style={{ ...s.td }}>
                                    {g.subject_name}
                                  </td>
                                  <td style={{ ...s.td, textAlign: 'center' }}>
                                    {g.units}
                                  </td>

                                  <td
                                    style={{
                                      ...s.td,
                                      textAlign: 'center',
                                      color: gradeColor(g.prelim),
                                    }}
                                  >
                                    {g.prelim ?? '--'}
                                  </td>

                                  <td
                                    style={{
                                      ...s.td,
                                      textAlign: 'center',
                                      color: gradeColor(g.midterm),
                                    }}
                                  >
                                    {g.midterm ?? '--'}
                                  </td>

                                  <td
                                    style={{
                                      ...s.td,
                                      textAlign: 'center',
                                      color: gradeColor(fg),
                                    }}
                                  >
                                    {fg ?? '--'}
                                  </td>

                                  <td style={{ ...s.td }}>
                                    {fg == null ? (
                                      <span style={{ color: 'var(--app-muted)' }}>
                                        In Progress
                                      </span>
                                    ) : (
                                      <span
                                        style={{
                                          color: passed
                                            ? 'var(--app-success)'
                                            : 'var(--app-danger)',
                                          fontWeight: 600,
                                        }}
                                      >
                                        {passed ? 'PASSED' : 'FAILED'}
                                      </span>
                                    )}
                                  </td>

                                  <td style={{ ...s.td }}>
                                    {g.remarks || '--'}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                  })}
                {!loading && filteredGrades.length === 0 && (
                  <EmptyGradeState message="No grade records found." />
                )}
                {!loading && filteredGrades.length > 0 && (
                  <Pagination page={recordsPage} totalPages={recordPages} onChange={setRecordsPage} />
                )}
              </div>
            </>
          )}

          {activeGradeTab === 'timeline' && (
            <>
              <div style={{ ...s.panel, padding: 0, overflow: 'hidden' }}>
                <SectionHeader title="Grade History Timeline" right="Recent updates" />
                {timelineLoading ? (
                  <div style={{ ...s.comingSoon, minHeight: 300 }}>
                    <div style={{ fontSize: 13, color: 'var(--app-muted)' }}>
                      Loading history...
                    </div>
                  </div>
                ) : timeline.length === 0 ? (
                  <EmptyGradeState message="No grade changes recorded yet." />
                ) : (
                  <>
                    <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {visibleTimeline.map((item) => (
                        <div key={item.id} style={{
                          background: 'var(--app-card)',
                          border: '1px solid var(--app-border)',
                          borderRadius: 8,
                          padding: '10px 12px',
                          fontSize: 12,
                          color: 'var(--app-text)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: 12,
                        }}>
                          <div>
                            <strong>{item.action}</strong> · Grade ID {item.grade}
                            {item.current?.remarks && (
                              <div style={{ color: 'var(--app-muted)', marginTop: 4 }}>
                                Remarks: {item.current.remarks}
                              </div>
                            )}
                          </div>
                          <div style={{ color: 'var(--app-muted)', fontSize: 11 }}>
                            {new Date(item.created_at).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                    <Pagination page={timelinePage} totalPages={timelinePages} onChange={setTimelinePage} />
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
// MAIN

const TABS = [
  { key: 'profile',    label: 'Profile / Account', icon: 'user' },
  { key: 'prospectus', label: 'Prospectus',         icon: 'list' },
  { key: 'enrollment', label: 'Enrollment',         icon: 'pencil' },
  { key: 'grades',     label: 'Grades',             icon: 'chart' },
];

export default function StudentHome() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    getStudentProfile()
      .then(({ data }) => setProfile(data))
      .catch(console.error);
  }, []);

  async function handleLogout() {
    try {
      await signOut();
    } finally {
      navigate('/login');
    }
  }

  return (
    <DashboardLayout
      portalLabel="STUDENT PORTAL"
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onLogout={handleLogout}
      profileCard={profile && {
        name: `${profile.first_name} ${profile.last_name}`,
        line1: profile.student_id,
        line2: profile.program_code ? `${profile.program_code} - Year ${profile.year_level}` : null,
      }}
      topBar={
        <NotificationBell
          fetchItems={fetchNotifications}
          onMarkAllRead={() => markNotificationsRead({ mark_all: true })}
        />
      }
    >
      {activeTab === 'profile'    && <ProfileTab />}
      {activeTab === 'prospectus' && <ProspectusTab />}
      {activeTab === 'enrollment' && <EnrollmentTab />}
      {activeTab === 'grades'     && <GradesTab />}
    </DashboardLayout>
  );
}