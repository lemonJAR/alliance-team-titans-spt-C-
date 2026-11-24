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

export function StudentTab() {
  const emptyForm = {
    first_name: '', last_name: '', middle_name: '',
    email: '', student_id: '', college: '', program: '', year_level: '1',
  };

  const [form, setForm]             = useState(emptyForm);
  const [colleges, setColleges]     = useState([]);
  const [programs, setPrograms]     = useState([]);
  const [allPrograms, setAllPrograms] = useState([]);
  const [students, setStudents]     = useState([]);
  const [loading, setLoading]       = useState(false);
  const [filterProg, setFilterProg] = useState('');
  const [expandedStudent, setExpandedStudent] = useState(null);
  const [activeStudentTab, setActiveStudentTab] = useState('manual');
  const csvInputRef = useRef(null);
  const [csvRows, setCsvRows] = useState([]);
  const [csvError, setCsvError] = useState('');
  const [csvImporting, setCsvImporting] = useState(false);

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  useEffect(() => {
    fetchCollege().then(async ({ data }) => {
      setColleges(data);
      const results = await Promise.all(data.map((college) => fetchProgram(college.id)));
      setAllPrograms(results.flatMap(({ data: items }) => items));
    }).catch(console.error);
    loadStudents();
  }, []);

  useEffect(() => {
    if (!form.college) {
      queueMicrotask(() => {
        setPrograms([]);
        set('program', '');
      });
      return;
    }
    fetchProgram(form.college).then(({ data }) => setPrograms(data)).catch(console.error);
    queueMicrotask(() => set('program', ''));
  }, [form.college]);

  async function loadStudents() {
    try { const { data } = await fetchStudents(); setStudents(data); } catch (e) { console.error(e); }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await adminCreateStudent({
        first_name: form.first_name, last_name: form.last_name, middle_name: form.middle_name,
        email: form.email, student_id: form.student_id,
        program: parseInt(form.program), year_level: parseInt(form.year_level),
      });
      notify(`OK: Student account created. Credentials sent to ${form.email}.`);
      setForm(emptyForm); setPrograms([]); loadStudents();
    } catch (err) {
      notify('Error: ' + (err.response?.data ? JSON.stringify(err.response.data) : err.message));
    } finally { setLoading(false); }
  }

  function validateStudentCsv(rows) {
    const emails = new Set();
    const studentIds = new Set();
    return rows.map((row) => {
      const errors = [];
      const college = colleges.find((item) => item.code?.toLowerCase() === row.college_code?.toLowerCase());
      const program = allPrograms.find((item) =>
        item.code?.toLowerCase() === row.program_code?.toLowerCase()
        && (!college || String(item.college) === String(college.id) || String(item.college_id) === String(college.id))
      );
      if (!row.first_name || !row.last_name || !row.email || !row.student_id || !row.college_code || !row.program_code || !row.year_level) {
        errors.push('Required fields are missing');
      }
      if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) errors.push('Invalid email');
      if (row.email && emails.has(row.email.toLowerCase())) errors.push('Duplicate email in file');
      if (row.student_id && studentIds.has(row.student_id.toLowerCase())) errors.push('Duplicate student ID in file');
      if (row.email) emails.add(row.email.toLowerCase());
      if (row.student_id) studentIds.add(row.student_id.toLowerCase());
      if (!college && row.college_code) errors.push('College code not found');
      if (!program && row.program_code) errors.push('Program code not found for college');
      if (!/^[1-4]$/.test(row.year_level)) errors.push('Year level must be 1, 2, 3, or 4');
      return { ...row, college, program, errors };
    });
  }

  function handleCsvFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    setCsvError('');
    setCsvRows([]);
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setCsvError('Choose a .csv file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const rows = parseCsv(String(reader.result || ''));
        if (!rows.length) {
          setCsvError('The CSV is empty or has no data rows.');
          return;
        }
        setCsvRows(validateStudentCsv(rows));
      } catch {
        setCsvError('The CSV could not be read. Check the required columns and try again.');
      }
    };
    reader.onerror = () => setCsvError('The CSV could not be read. Please try again.');
    reader.readAsText(file);
  }

  async function handleCsvImport() {
    const validRows = csvRows.filter((row) => row.errors.length === 0);
    if (!validRows.length) return;
    if (!await confirmDialog(`Create ${validRows.length} student account${validRows.length === 1 ? '' : 's'}? Temporary credentials will be emailed to each student.`)) return;
    setCsvImporting(true);
    let created = 0;
    const failures = [];
    for (const row of validRows) {
      try {
        await adminCreateStudent({
          first_name: row.first_name,
          last_name: row.last_name,
          middle_name: row.middle_name,
          email: row.email,
          student_id: row.student_id,
          program: row.program.id,
          year_level: parseInt(row.year_level),
        });
        created += 1;
      } catch (error) {
        failures.push(`Row ${row.rowNumber}: ${error.response?.data ? JSON.stringify(error.response.data) : error.message}`);
      }
    }
    setCsvImporting(false);
    setCsvRows([]);
    await loadStudents();
    notify(`${created} student account${created === 1 ? '' : 's'} created.${failures.length ? ` ${failures.length} row${failures.length === 1 ? '' : 's'} failed:\n${failures.join('\n')}` : ''}`);
  }

  const grouped = students.reduce((acc, st) => {
    const key = st.program_name || 'Unassigned';
    if (!acc[key]) acc[key] = [];
    acc[key].push(st);
    return acc;
  }, {});

  const progKeys = filterProg
    ? Object.keys(grouped).filter((p) => p === filterProg)
    : Object.keys(grouped);

  const bySemester = (subjects) => subjects.reduce((acc, sub) => {
    const key = `${sub.year_level}-${sub.semester}`;
    if (!acc[key]) acc[key] = { year_level: sub.year_level, semester: sub.semester, items: [] };
    acc[key].items.push(sub);
    return acc;
  }, {});

  return (
    <>
      <div style={{ ...s.panel, padding: 0, overflow: 'hidden' }}>
        <div style={s.tabNav}>
          {[
            { key: 'manual', label: 'New Student Account' },
            { key: 'directory', label: 'Students by Program' },
          ].map((tab) => (
            <button key={tab.key} type="button" onClick={() => setActiveStudentTab(tab.key)} style={s.tabButton(activeStudentTab === tab.key)}>
              {tab.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => csvInputRef.current?.click()}
            style={{ ...s.paginationButton(false), marginLeft: 'auto' }}
          >
            Import Student CSV
          </button>
          <input ref={csvInputRef} type="file" accept=".csv,text/csv" onChange={handleCsvFile} style={{ display: 'none' }} />
        </div>

        {(csvRows.length > 0 || csvError) && (
          <div style={{ ...s.tabPanel, paddingBottom: 8, borderBottom: '1px solid var(--app-border)' }}>
            <div style={{ ...s.panel, maxWidth: 720, margin: '0 auto' }}>
              <PanelTitle>Import Student CSV</PanelTitle>
              <p style={s.hint}>Upload a prepared CSV with student account, college, program, and year-level fields.</p>
              {csvError && <div style={{ color: c.danger, fontSize: 12, marginTop: 10 }}>{csvError}</div>}
              {csvRows.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 12, color: c.muted, marginBottom: 8 }}>
                    {csvRows.filter((row) => row.errors.length === 0).length} valid of {csvRows.length} rows
                  </div>
                  <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid var(--app-border)', borderRadius: 7 }}>
                    {csvRows.map((row) => (
                      <div key={row.rowNumber} style={{ padding: '7px 10px', borderBottom: '1px solid var(--app-border)', fontSize: 11, color: row.errors.length ? c.danger : c.text }}>
                        Row {row.rowNumber}: {row.first_name} {row.last_name} · {row.email} {row.errors.length ? `— ${row.errors.join(', ')}` : '— Ready'}
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={handleCsvImport} disabled={csvImporting || !csvRows.some((row) => row.errors.length === 0)} style={{ ...s.submitBtn(csvImporting || !csvRows.some((row) => row.errors.length === 0)), width: '100%', marginTop: 10 }}>
                    {csvImporting ? 'Creating accounts...' : 'Review and create valid accounts'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeStudentTab === 'manual' && (
          <div style={{ ...s.tabPanel, paddingBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div style={{ ...s.panel, width: '100%', maxWidth: 760, minWidth: 0 }}>
          <PanelTitle>New Student Account</PanelTitle>
          <p style={s.hint}>A temporary password will be emailed. Student selects subjects on first login.</p>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
              <Field label="First Name">
                <input style={s.input} type="text" value={form.first_name}
                  onChange={(e) => set('first_name', e.target.value)} required />
              </Field>
              <Field label="Middle">
                <input style={s.input} type="text" value={form.middle_name}
                  onChange={(e) => set('middle_name', e.target.value)} />
              </Field>
            </div>
            <Field label="Last Name">
              <input style={s.input} type="text" value={form.last_name}
                onChange={(e) => set('last_name', e.target.value)} required />
            </Field>
            <Field label="Email">
              <input style={s.input} type="email" value={form.email}
                onChange={(e) => set('email', e.target.value)} required />
            </Field>
            <Field label="Student ID">
              <input style={s.input} type="text" value={form.student_id}
                onChange={(e) => set('student_id', e.target.value)} required />
            </Field>
            <Field label="College">
              <select style={s.input} value={form.college}
                onChange={(e) => set('college', e.target.value)} required>
                <option value="">-- Select College --</option>
                {colleges.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
              </select>
            </Field>
            <Field label="Degree Program">
              <select style={s.input} value={form.program}
                onChange={(e) => set('program', e.target.value)} required disabled={!form.college}>
                <option value="">-- Select Program --</option>
                {programs.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
              </select>
            </Field>
            <Field label="Year Level">
              <select style={s.input} value={form.year_level}
                onChange={(e) => set('year_level', e.target.value)} required>
                <option value="1">1st Year</option>
                <option value="2">2nd Year</option>
                <option value="3">3rd Year</option>
                <option value="4">4th Year</option>
              </select>
            </Field>
            <button type="submit" style={s.submitBtn(!form.program || loading)} disabled={!form.program || loading}>
              {loading ? 'Creating...' : 'Create & Send Credentials'}
            </button>
          </form>
        </div>

        </div>
            </div>
        )}

        {activeStudentTab === 'directory' && (
          <div style={{ ...s.tabPanel, paddingBottom: 8 }}>
        <div style={{ ...s.panel, minWidth: 0, padding: 0, gap: 0, overflow: 'hidden' }}>
          <div style={{ padding: '10px 18px', background: c.accentBg, borderBottom: '1px solid var(--app-border)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <PanelTitle>Students by Program</PanelTitle>
            <div style={{ marginLeft: 'auto' }}>
              <select style={{ ...s.input, width: 'auto', fontSize: 12, padding: '6px 10px' }}
                value={filterProg} onChange={(e) => setFilterProg(e.target.value)}>
                <option value="">All Programs</option>
                {Object.keys(grouped).map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          {progKeys.length === 0 && (
            <div style={{ ...s.comingSoon, minHeight: 420, padding: 24, boxSizing: 'border-box' }}>
              <div style={{ fontSize: 36, opacity: 0.3 }}>*</div>
              <div style={{ fontSize: 14, color: c.muted }}>No students enrolled yet.</div>
            </div>
          )}

          {progKeys.map((prog) => (
            <div key={prog} style={{ ...s.panel, gap: 0, padding: 0, overflow: 'hidden' }}>
              <div style={{
                padding: '10px 18px', background: c.accentBg, borderBottom: '1px solid var(--app-border)',
                fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                color: c.accent, display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <span style={{ width: 6, height: 6, background: c.accent, borderRadius: '50%', display: 'inline-block' }} />
                {prog}
                <span style={{ marginLeft: 'auto', fontWeight: 400, color: c.muted, fontSize: 11 }}>
                  {grouped[prog].length} {grouped[prog].length === 1 ? 'student' : 'students'}
                </span>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--app-panel)' }}>
                    {['Name', 'Student ID', 'Email', 'Year', 'Enrolled', 'Subjects'].map((h, index) => (
                      <th key={h} style={{
                        padding: '8px 16px', textAlign: index === 0 ? 'left' : 'center', fontSize: 10, fontWeight: 600,
                        letterSpacing: '0.08em', textTransform: 'uppercase',
                        color: c.muted, borderBottom: '1px solid var(--app-border)',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {grouped[prog].map((st, i) => {
                    const isExpanded = expandedStudent === st.student_id;
                    const semGroups  = bySemester(st.enrolled_subjects || []);
                    const semKeys    = Object.keys(semGroups).sort();
                    return (
                      <React.Fragment key={st.student_id}>
                        <tr style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(148, 163, 184, 0.08)', borderBottom: isExpanded ? 'none' : '1px solid var(--app-border)' }}>
                          <td style={{ padding: '10px 16px', fontWeight: 500, color: c.text, textAlign: 'left' }}>{st.full_name}</td>
                          <td style={{ padding: '10px 16px', fontFamily: 'monospace', color: c.muted, fontSize: 12, textAlign: 'center' }}>{st.student_id}</td>
                          <td style={{ padding: '10px 16px', color: c.muted, fontSize: 12, textAlign: 'center' }}>{st.email}</td>
                          <td style={{ padding: '10px 16px', color: c.muted, fontSize: 12, textAlign: 'center' }}>Year {st.year_level}</td>
                          <td style={{ padding: '10px 16px', color: c.muted, fontSize: 12, textAlign: 'center' }}>
                            {st.date_joined ? new Date(st.date_joined).toLocaleDateString() : '-'}
                          </td>
                          <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                            <button onClick={() => setExpandedStudent(isExpanded ? null : st.student_id)} style={{
                              background: isExpanded ? c.accentBg : 'var(--app-panel)',
                              border: `1px solid ${isExpanded ? 'var(--app-accent)' : 'var(--app-border)'}`,
                              color: isExpanded ? c.accent : c.muted,
                              borderRadius: 5, padding: '3px 10px', fontSize: 11,
                              cursor: 'pointer', fontFamily: 'inherit',
                            }}>
                              {st.enrolled_subjects?.length || 0} subjects {isExpanded ? 'v' : '>'}
                            </button>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr style={{ background: 'var(--app-panel)', borderBottom: '1px solid var(--app-border)' }}>
                            <td colSpan={6} style={{ padding: '12px 24px 16px' }}>
                              {semKeys.length === 0
                                ? <span style={{ color: c.muted, fontSize: 12 }}>No subjects enrolled yet.</span>
                                : (
                                  <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                                    {semKeys.map((key) => {
                                      const { year_level, semester, items } = semGroups[key];
                                      return (
                                        <div key={key}>
                                          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: c.muted, marginBottom: 6 }}>
                                            Year {year_level} - Sem {semester}
                                          </div>
                                          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                            {items.map((sub) => (
                                              <span key={sub.id} style={{
                                                background: c.accentBg, border: '1px solid var(--app-accent)',
                                                color: c.accent, borderRadius: 4, padding: '3px 8px', fontSize: 11,
                                              }}>{sub.name}</span>
                                            ))}
                                          </div>
                                        </div>
                                      );
                                  })}
                                </div>
                              )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
        </div>
        </div>
        )}
      </div>
    </>
  );
}


