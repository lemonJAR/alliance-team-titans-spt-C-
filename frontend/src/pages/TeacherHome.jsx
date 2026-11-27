import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUrlState } from '../hooks/useUrlState';
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
import DashboardLayout from '../components/DashboardLayout';
import { PageHeader, StatCard, Badge } from '../components/ui';
import Icon from '../components/Icons';

function fmtGrade(value) {
  if (value === '' || value == null) return '';
  const n = Number(value);
  return Number.isNaN(n) ? value : n.toFixed(2);
}

// Turns an API error into one readable sentence (the API sends { detail } or { field: [messages] }).
function apiErrorText(err) {
  const data = err.response?.data;
  if (!data) return err.message;
  if (typeof data.detail === 'string') return data.detail;
  if (typeof data.error === 'string') return data.error;
  const parts = Object.entries(data).map(([field, msgs]) => `${field}: ${[].concat(msgs).join(' ')}`);
  return parts.length ? parts.join('\n') : err.message;
}


export default function TeacherHome() {
  const navigate = useNavigate();
  const [notice, setNotice] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [offerings, setOfferings] = useState([]);
  const [selected, setSelected] = useState(null);
  // The open class is kept in the URL (?offering=12) so a refresh reopens it.
  const [offeringParam, setOfferingParam] = useUrlState('offering', '');
  const [teacherProfile, setTeacherProfile] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [errors, setErrors] = useState({});

  async function loadOfferings() {
    try {
      const { data } = await fetchTeacherOfferings();
      setOfferings(data);
      if (data.length && !selected) {
        selectOffering(data.find((o) => String(o.id) === offeringParam) ?? data[0]);
      }
    } catch (err) {
      console.error(err);
      setNotice({ type: 'error', text: 'Failed to load offerings.' });
    }
  }

  useEffect(() => {
    queueMicrotask(() => {
      loadOfferings();
      getTeacherProfile()
        .then(({ data }) => setTeacherProfile(data))
        .catch(() => setTeacherProfile(null));
    });
  // loadOfferings is intentionally called once when the teacher dashboard mounts.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    setOfferingParam(String(offering.id));
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
      setNotice({ type: 'error', text: 'Failed to load enrollments.' });
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
      // Same rule as the API (GradeRules.cs): quarter steps only, so 1.37 is caught here instead of failing on save.
      else if (Math.abs(((numeric - 1) / 0.25) - Math.round((numeric - 1) / 0.25)) > 1e-9) next[key] = 'Use steps of 0.25 (e.g. 1.25, 2.50).';
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
      setNotice({ type: 'success', text: 'Grade saved.' });
    } catch (err) {
      console.error(err);
      setNotice({ type: 'error', text: 'Failed to save grade: ' + apiErrorText(err) });
    } finally {
      setSavingId(null);
    }
  }

  async function handleDeleteGrade(row) {
    if (!row.grade_id) return;
    if (confirmDeleteId !== row.enrollment_id) { setConfirmDeleteId(row.enrollment_id); return; }
    setConfirmDeleteId(null);
    try {
      await deleteGrade(row.grade_id);
      await selectOffering(selected);
    } catch (err) {
      console.error(err);
      setNotice({ type: 'error', text: 'Failed to delete grade: ' + apiErrorText(err) });
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

  function setCell(index, key, value) {
    setEnrollments((prev) => prev.map((r, i) => (i === index ? { ...r, [key]: value } : r)));
  }

  return (
    <DashboardLayout
      portalLabel="TEACHER PORTAL"
      onLogout={handleLogout}
      profileCard={teacherProfile && {
        name: `${teacherProfile.first_name} ${teacherProfile.last_name}`,
        line1: teacherProfile.teacher_id || 'Faculty',
        line2: teacherProfile.college_name,
      }}
      sidebarExtra={(collapsed) => (
        <>
          {!collapsed && <div className="sidebar-label">My offerings</div>}
          <div className="sidebar-offerings">
            {offerings.length === 0 && !collapsed && <div className="helper-text" style={{ padding: '0 10px' }}>No assigned offerings yet.</div>}
            {offerings.map((off) => (
              <button
                key={off.id}
                type="button"
                className={`sidebar-offering-action${selected?.id === off.id ? ' active' : ''}`}
                title={`${off.offer_code} · ${off.subject_code}`}
                onClick={() => selectOffering(off)}
              >
                {collapsed ? (
                  <strong>{off.offer_code.slice(0, 3)}</strong>
                ) : (
                  <>
                    <strong>{off.offer_code}</strong>
                    <small>{off.subject_code} • {off.term_label}</small>
                  </>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    >
      <PageHeader
        title={selected ? `${selected.offer_code} · ${selected.subject_name}` : 'Select an offering'}
        subtitle="Enter prelim, midterm and finals grades for your students. Saved grades can be edited in place."
        right={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {selected && <Badge tone="info">{selected.term_label}</Badge>}
            <button type="button" className="ui-btn" onClick={loadOfferings}>
              <Icon name="refresh" size={15} /> Refresh
            </button>
          </div>
        }
      />

      {notice && (
        <div className={`ui-notice ${notice.type}`} role="status">
          <span>{notice.text}</span>
          <button type="button" aria-label="Dismiss" onClick={() => setNotice(null)}>×</button>
        </div>
      )}

      <section className="ui-stats-grid">
        <StatCard label="Offerings" value={summary.offerings} sub="assigned to you" />
        <StatCard label="Students" value={summary.students} sub="in this section" />
        <StatCard label="Graded" value={summary.graded} sub="saved records" />
        <StatCard label="Passing" value={summary.passing} sub="finals ≤ 3.0" />
      </section>

      <section className="ui-panel">
        {!selected ? (
          <div className="ui-empty">Choose an offering from the sidebar to load its students.</div>
        ) : loading ? (
          <div className="ui-empty">Loading students…</div>
        ) : enrollments.length === 0 ? (
          <div className="ui-empty">No enrolled students for this offering yet.</div>
        ) : (
          <div className="ui-table-wrap">
            <table className="ui-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th className="center">ID</th>
                  <th className="center">Prelim</th>
                  <th className="center">Midterm</th>
                  <th className="center">Finals</th>
                  <th>Remarks</th>
                  <th className="center">Action</th>
                </tr>
              </thead>
              <tbody>
                {enrollments.map((row, index) => {
                  const rowErrors = errors[row.enrollment_id] || {};
                  const saving = savingId === row.enrollment_id;
                  return (
                    <tr key={row.enrollment_id}>
                      <td style={{ fontWeight: 600 }}>{row.student_name}</td>
                      <td className="center"><span className="ui-mono">{row.student_id_no}</span></td>
                      {['prelim', 'midterm', 'finals'].map((key) => (
                        <td key={key} className="center">
                          <input
                            className={`ui-input grade${rowErrors[key] ? ' invalid' : ''}`}
                            aria-label={`${key} for ${row.student_name}`}
                            value={row[key]}
                            onChange={(e) => setCell(index, key, e.target.value)}
                          />
                          {rowErrors[key] && <div className="ui-field-error">{rowErrors[key]}</div>}
                        </td>
                      ))}
                      <td>
                        <input
                          className="ui-input"
                          aria-label={`remarks for ${row.student_name}`}
                          value={row.remarks}
                          onChange={(e) => setCell(index, 'remarks', e.target.value)}
                          placeholder="Optional"
                        />
                      </td>
                      <td className="center">
                        <div className="ui-row-actions">
                          <button type="button" className="ui-btn primary small" onClick={() => handleSubmitGrade(row)} disabled={saving}>
                            {saving ? 'Saving…' : row.grade_id ? 'Update' : 'Post'}
                          </button>
                          {row.grade_id && (
                            <button type="button" className="ui-btn danger small" onClick={() => handleDeleteGrade(row)}>
                              {confirmDeleteId === row.enrollment_id ? 'Confirm?' : 'Delete'}
                            </button>
                          )}
                        </div>
                        {rowErrors._row && <div className="ui-field-error">{rowErrors._row}</div>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </DashboardLayout>
  );
}