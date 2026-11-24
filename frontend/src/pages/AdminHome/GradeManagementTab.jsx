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

export function GradeManagementTab() {
  const [filters, setFilters] = useState({ student: '', term: '', subject: '', period: '' });
  const [subjects, setSubjects] = useState([]);
  const [termsList, setTermsList] = useState([]);
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [studentsList, setStudentsList] = useState([]);
  const [showStudentSuggestions, setShowStudentSuggestions] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState(null);

  useEffect(() => {
    fetchSubjects().then(({ data }) => setSubjects(data || [])).catch(console.error);
    fetchStudents().then(({ data }) => setStudentsList(data || [])).catch(console.error);
    fetchTerms().then(({ data }) => setTermsList(data || [])).catch(console.error);
  }, []);

  async function loadGrades() {
    setLoading(true);
    try {
      // Prefer selectedProfileId (from picker). Otherwise try to resolve typed student value.
      let studentParam = selectedProfileId ?? (filters.student || undefined);
      if (!selectedProfileId && filters.student) {
        try {
          const matched = (studentsList || []).find(s => String(s.student_id_no) === String(filters.student) || String(s.student_id) === String(filters.student) || String(s.id) === String(filters.student));
          if (matched) studentParam = matched.id;
        } catch (e) {
          console.error('Failed to resolve student id:', e);
        }
      }

      // Normalize term and subject to numeric IDs when possible.
      let termParam = undefined;
      if (filters.term) {
        const n = Number(filters.term);
        if (!isNaN(n)) termParam = n;
        else {
          const matched = (termsList || []).find(t => String(t.id) === String(filters.term) || String(t.label) === String(filters.term) || String(t.name) === String(filters.term));
          if (matched) termParam = matched.id;
        }
      }

      const paramsForRequest = {
        student: studentParam || undefined,
        term: termParam || undefined,
        subject: filters.subject ? parseInt(filters.subject) : undefined,
        period: filters.period || undefined,
      };
      const { data } = await fetchGrades(paramsForRequest);
      const mapped = (data || []).map((g) => ({
        ...g,
        prelim: fmtGrade(g.prelim ?? ''),
        midterm: fmtGrade(g.midterm ?? ''),
        finals: fmtGrade(g.finals ?? ''),
        remarks: g.remarks ?? '',
      }));
      setGrades(mapped);
    } catch (err) {
      console.error('Failed to load grades', err);
      const status = err.response?.status;
      const body = err.response?.data;
      notify('Failed to load grades.' + (status ? ` Status ${status}.` : '') + (body ? ` Response: ${JSON.stringify(body)}` : ''));
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(row) {
    try {
      setSavingId(row.id);
      await updateGrade(row.id, {
        prelim: row.prelim === '' ? null : Number(row.prelim),
        midterm: row.midterm === '' ? null : Number(row.midterm),
        finals: row.finals === '' ? null : Number(row.finals),
        remarks: row.remarks,
      });
      await loadGrades();
    } catch (err) {
      const body = err.response?.data ? JSON.stringify(err.response.data) : err.message;
      notify('Failed to update grade. ' + body);
    } finally {
      setSavingId(null);
    }
  }

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewRow, setPreviewRow] = useState(null);

  function handlePreview(row) {
    const payload = {
      prelim: row.prelim === '' ? null : row.prelim,
      midterm: row.midterm === '' ? null : row.midterm,
      finals: row.finals === '' ? null : row.finals,
      remarks: row.remarks,
    };
    const updated = [];
    if (payload.prelim !== null) updated.push('Prelim');
    if (payload.midterm !== null) updated.push('Midterm');
    if (payload.finals !== null) updated.push('Finals');
    setPreviewRow({ row, payload, updated });
    setPreviewOpen(true);
  }

  async function confirmPreviewSave() {
    if (!previewRow) return;
    setPreviewOpen(false);
    // ensure numeric values when saving previewed payload
    const r = { ...previewRow.row };
    r.prelim = r.prelim === '' ? null : Number(r.prelim);
    r.midterm = r.midterm === '' ? null : Number(r.midterm);
    r.finals = r.finals === '' ? null : Number(r.finals);
    await handleSave(r);
    setPreviewRow(null);
  }
  async function handleDelete(row) {
    if (!await confirmDialog('Delete this grade entry?')) return;
    try {
      await deleteGrade(row.id);
      await loadGrades();
    } catch {
      notify('Failed to delete grade.');
    }
  }

  return (
    <>
      <PageHeader title="Grade Overrides" subtitle="Search and adjust grade entries as an administrator." />

      <div style={{ ...s.panel, width: '100%', flex: '0 0 auto', boxSizing: 'border-box' }}>
        <PanelTitle>Search Filters</PanelTitle>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(260px, 2fr) repeat(3, minmax(150px, 1fr)) 42px',
          gap: 12,
          alignItems: 'end',
        }}>
          <div style={{ position: 'relative', minWidth: 0 }}>
            <label style={s.label}>Student</label>
            <input
              style={s.input}
              placeholder="Student ID or name"
              value={filters.student}
              onChange={(e) => {
                setFilters({ ...filters, student: e.target.value });
                setSelectedProfileId(null);
                setShowStudentSuggestions(true);
              }}
              onFocus={() => setShowStudentSuggestions(true)}
              onBlur={() => setTimeout(() => setShowStudentSuggestions(false), 150)}
            />
            {showStudentSuggestions && filters.student && (
              <div style={{ position: 'absolute', left: 0, right: 0, zIndex: 50, background: 'var(--app-card)', border: '1px solid var(--app-border)', borderRadius: 6, maxHeight: 220, overflow: 'auto' }}>
                {(studentsList || []).filter(s => {
                  const q = (filters.student || '').toString().toLowerCase();
                  return q && (
                    (s.student_id_no && s.student_id_no.toString().toLowerCase().includes(q)) ||
                    (s.student_id && s.student_id.toString().toLowerCase().includes(q)) ||
                    ((s.first_name || s.last_name || s.full_name) && ((s.first_name || s.last_name || s.full_name).toString().toLowerCase().includes(q)))
                  );
                }).slice(0, 15).map((s) => (
                  <div
                    key={s.id}
                    onMouseDown={(ev) => { ev.preventDefault(); /* prevent blur */ }}
                    onClick={() => {
                      setFilters({ ...filters, student: s.student_id_no || s.student_id || String(s.id) });
                      setSelectedProfileId(s.id);
                      setShowStudentSuggestions(false);
                    }}
                    style={{ padding: '8px 10px', borderBottom: '1px solid var(--app-border)', cursor: 'pointer', display: 'flex', gap: 8, alignItems: 'center' }}
                  >
                    <div style={{ fontFamily: 'monospace', color: '#0f766e', minWidth: 110 }}>{s.student_id_no || s.student_id || s.id}</div>
                    <div style={{ color: 'var(--app-text)' }}>{s.full_name || `${s.first_name || ''} ${s.last_name || ''}`.trim()}</div>
                  </div>
                ))}
                {(studentsList || []).filter(s => {
                  const q = (filters.student || '').toString().toLowerCase();
                  return q && (
                    (s.student_id_no && s.student_id_no.toString().toLowerCase().includes(q)) ||
                    (s.student_id && s.student_id.toString().toLowerCase().includes(q)) ||
                    ((s.first_name || s.last_name || s.full_name) && ((s.first_name || s.last_name || s.full_name).toString().toLowerCase().includes(q)))
                  );
                }).length === 0 && (
                  <div style={{ padding: 10, color: 'var(--app-muted)' }}>No students found</div>
                )}
              </div>
            )}
          </div>
          <Field label="Academic Term">
            <select
              style={s.input}
              value={filters.term}
              onChange={(e) => setFilters({ ...filters, term: e.target.value })}
            >
              <option value="">All Terms</option>
              {(termsList || []).map((t) => {
                const display = t.label || (t.year_start && t.year_end && t.semester ? `${t.year_start}-${t.year_end} - Sem ${t.semester}` : (t.name || t.id));
                return <option key={t.id} value={t.id}>{display}</option>;
              })}
            </select>
          </Field>

          <Field label="Grading Period">
            <select
              style={s.input}
              value={filters.period}
              onChange={(e) => setFilters({ ...filters, period: e.target.value })}
            >
              <option value="">All Periods</option>
              <option value="prelim">Prelim</option>
              <option value="midterm">Midterm</option>
              <option value="finals">Finals</option>
            </select>
          </Field>

          <Field label="Subject">
            <select
              style={s.input}
              value={filters.subject}
              onChange={(e) => setFilters({ ...filters, subject: e.target.value })}
            >
              <option value="">All Subjects</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>{subject.code} - {subject.name}</option>
              ))}
            </select>
          </Field>
          <button
            type="button"
            title="Search grades"
            aria-label="Search grades"
            style={{
              ...s.submitBtn(false),
              width: 42,
              height: 38,
              padding: 0,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 0,
            }}
            onClick={loadGrades}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-4-4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Removed debug text per user request */}

      {loading ? (
        <div style={{ ...s.comingSoon, minHeight: 160 }}>Loading grades...</div>
      ) : grades.length === 0 ? (
        <div style={{ ...s.comingSoon, minHeight: 160 }}>
          <div style={{ fontSize: 30, opacity: 0.25 }}>*</div>
          <div style={{ fontSize: 13, color: c.muted }}>No grade records found.</div>
        </div>
      ) : (
        <div style={{ ...s.panel, padding: 0, overflow: 'hidden' }}>
          <SectionHeader title="Grade Entries" />
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: 'var(--app-panel)' }}>
                {['Student', 'Subject', 'Term', 'Prelim', 'Midterm', 'Finals', 'Remarks', 'Action'].map((h) => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grades.map((row, idx) => (
                <tr key={row.id} style={{ background: idx % 2 === 0 ? 'transparent' : c.rowAlt }}>
                  <td style={s.td}>{row.student_name} ({row.student_id_no})</td>
                  <td style={s.td}>{row.subject_code} - {row.subject_name}</td>
                  <td style={s.td}>{row.term_label || row.term || '--'}</td>
                  <td style={s.td}>
                    <input
                      style={{ ...s.input, maxWidth: 96 }}
                      value={row.prelim ?? ''}
                      onChange={(e) => {
                        const copy = [...grades];
                        copy[idx].prelim = e.target.value;
                        setGrades(copy);
                      }}
                    />
                  </td>
                  <td style={s.td}>
                    <input
                      style={{ ...s.input, maxWidth: 96 }}
                      value={row.midterm ?? ''}
                      onChange={(e) => {
                        const copy = [...grades];
                        copy[idx].midterm = e.target.value;
                        setGrades(copy);
                      }}
                    />
                  </td>
                  <td style={s.td}>
                    <input
                      style={{ ...s.input, maxWidth: 96 }}
                      value={row.finals ?? ''}
                      onChange={(e) => {
                        const copy = [...grades];
                        copy[idx].finals = e.target.value;
                        setGrades(copy);
                      }}
                    />
                  </td>
                  <td style={s.td}>
                    <input
                      style={s.input}
                      value={row.remarks ?? ''}
                      onChange={(e) => {
                        const copy = [...grades];
                        copy[idx].remarks = e.target.value;
                        setGrades(copy);
                      }}
                    />
                  </td>
                  <td style={s.td}>
                    <button
                      style={s.submitBtn(savingId === row.id)}
                      disabled={savingId === row.id}
                      onClick={() => handleSave(row)}
                    >
                      {savingId === row.id ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      style={{ ...s.submitBtn(false), marginLeft: 8, background: 'transparent', borderColor: 'var(--app-border)', color: c.muted }}
                      onClick={() => handlePreview(row)}
                    >
                      Preview
                    </button>
                    <button
                      style={{ ...s.submitBtn(false), marginLeft: 8, borderColor: c.danger, color: c.danger }}
                      onClick={() => handleDelete(row)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {previewOpen && previewRow && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60 }}>
          <div style={{ width: 'min(800px, 96%)', maxHeight: '80vh', overflow: 'auto', background: 'var(--app-card)', border: '1px solid var(--app-border)', borderRadius: 12, padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--app-accent)' }}>Preview Grade Payload</div>
              {filters.period && (
                <div style={{ marginLeft: 12, fontSize: 12, color: 'var(--app-muted)' }}>
                  Period: {filters.period.charAt(0).toUpperCase() + filters.period.slice(1)}
                </div>
              )}
              {previewRow.updated && previewRow.updated.length > 0 && (
                <div style={{ marginLeft: 12, fontSize: 12, color: 'var(--app-muted)' }}>
                  Updating: {previewRow.updated.join(', ')}
                </div>
              )}
              <div style={{ marginLeft: 'auto' }}>
                <button onClick={() => setPreviewOpen(false)} style={{ ...s.submitBtn(false), background: 'transparent', borderColor: 'var(--app-border)', color: 'var(--app-muted)' }}>Close</button>
              </div>
            </div>
            <pre style={{ marginTop: 12, background: 'var(--app-panel)', border: '1px solid var(--app-border)', padding: 12, borderRadius: 6, fontSize: 12, overflowX: 'auto' }}>{JSON.stringify(previewRow.payload, null, 2)}</pre>
            <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
              <button onClick={confirmPreviewSave} style={{ ...s.submitBtn(false) }}>Confirm Save</button>
              <button onClick={() => setPreviewOpen(false)} style={{ ...s.submitBtn(false), background: 'transparent', borderColor: 'var(--app-border)', color: 'var(--app-muted)' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


