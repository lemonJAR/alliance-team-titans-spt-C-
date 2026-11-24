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

export function TeacherTab() {
  const emptyForm = {
    first_name: '', last_name: '', middle_name: '',
    email: '', employee_id: '', department: '', subjects: [],
  };

  const [form, setForm]               = useState(emptyForm);
  const [colleges, setColleges]       = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers]       = useState([]);
  const [loading, setLoading]         = useState(false);
  const [filterDept, setFilterDept]   = useState('');
  const [activeFacultyTab, setActiveFacultyTab] = useState('manual');
  const csvInputRef = useRef(null);
  const [csvRows, setCsvRows] = useState([]);
  const [csvError, setCsvError] = useState('');
  const [csvImporting, setCsvImporting] = useState(false);

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  useEffect(() => {
    fetchCollege().then(({ data }) => setColleges(data)).catch(console.error);
    loadTeachers();
  }, []);

  useEffect(() => {
    if (!form.department) {
      queueMicrotask(() => {
        setSubjects([]);
        set('subjects', []);
      });
      return;
    }
    const load = async () => {
      try {
        const { data: progs } = await fetchProgram(form.department);
        const results = await Promise.all(progs.map((p) => fetchSubjects(p.id)));
        setSubjects(results.flatMap(({ data }) => data));
      } catch (e) { console.error(e); }
    };
    queueMicrotask(() => set('subjects', []));
    load();
  }, [form.department]);

  async function loadTeachers() {
    try { const { data } = await fetchTeachers(); setTeachers(data); } catch (e) { console.error(e); }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await adminCreateTeacher({
        first_name: form.first_name, last_name: form.last_name, middle_name: form.middle_name,
        email: form.email, employee_id: form.employee_id,
        department: parseInt(form.department), subjects: form.subjects,
      });
      notify(`OK: Teacher account created. Credentials sent to ${form.email}.`);
      setForm(emptyForm); setSubjects([]); loadTeachers();
    } catch (err) {
      notify('Error: ' + (err.response?.data ? JSON.stringify(err.response.data) : err.message));
    } finally { setLoading(false); }
  }

  function validateCsvRows(rows) {
    const emails = new Set();
    const employeeIds = new Set();
    return rows.map((row) => {
      const errors = [];
      const department = colleges.find((college) => college.code?.toLowerCase() === row.department_code?.toLowerCase());
      if (!row.first_name || !row.last_name || !row.email || !row.employee_id || !row.department_code) {
        errors.push('Required fields are missing');
      }
      if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) errors.push('Invalid email');
      if (row.email && emails.has(row.email.toLowerCase())) errors.push('Duplicate email in file');
      if (row.employee_id && employeeIds.has(row.employee_id.toLowerCase())) errors.push('Duplicate employee ID in file');
      if (row.email) emails.add(row.email.toLowerCase());
      if (row.employee_id) employeeIds.add(row.employee_id.toLowerCase());
      if (!department && row.department_code) errors.push('Department code not found');
      return { ...row, department, errors };
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
        setCsvRows(validateCsvRows(rows));
      } catch {
        setCsvError('The CSV could not be read. Download the template and try again.');
      }
    };
    reader.onerror = () => setCsvError('The CSV could not be read. Please try again.');
    reader.readAsText(file);
  }

  async function handleCsvImport() {
    const validRows = csvRows.filter((row) => row.errors.length === 0);
    if (!validRows.length) return;
    if (!await confirmDialog(`Create ${validRows.length} faculty account${validRows.length === 1 ? '' : 's'}? Temporary credentials will be emailed to each teacher.`)) return;
    setCsvImporting(true);
    let created = 0;
    const failures = [];
    for (const row of validRows) {
      try {
        await adminCreateTeacher({
          first_name: row.first_name,
          last_name: row.last_name,
          middle_name: row.middle_name,
          email: row.email,
          employee_id: row.employee_id,
          department: row.department.id,
          subjects: [],
        });
        created += 1;
      } catch (error) {
        failures.push(`Row ${row.rowNumber}: ${error.response?.data ? JSON.stringify(error.response.data) : error.message}`);
      }
    }
    setCsvImporting(false);
    setCsvRows([]);
    await loadTeachers();
    notify(`${created} faculty account${created === 1 ? '' : 's'} created.${failures.length ? ` ${failures.length} row${failures.length === 1 ? '' : 's'} failed:\n${failures.join('\n')}` : ''}`);
  }

  const grouped = teachers.reduce((acc, t) => {
    const dept = t.department || 'Unassigned';
    if (!acc[dept]) acc[dept] = [];
    acc[dept].push(t);
    return acc;
  }, {});

  const deptKeys = filterDept
    ? Object.keys(grouped).filter((d) => d === filterDept)
    : Object.keys(grouped);

  return (
    <>
      <div style={{ ...s.panel, padding: 0, overflow: 'hidden' }}>
        <div style={s.tabNav}>
          {[
            { key: 'manual', label: 'New Faculty Account' },
            { key: 'directory', label: 'Faculty by Department' },
          ].map((tab) => (
            <button key={tab.key} type="button" onClick={() => setActiveFacultyTab(tab.key)} style={s.tabButton(activeFacultyTab === tab.key)}>
              {tab.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => csvInputRef.current?.click()}
            style={{
              ...s.paginationButton(false),
              marginLeft: 'auto',
            }}
          >
            Import Faculty CSV
          </button>
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleCsvFile}
            style={{ display: 'none' }}
          />
        </div>

        {(csvRows.length > 0 || csvError) && (
          <div style={{ ...s.tabPanel, paddingBottom: 8, borderBottom: '1px solid var(--app-border)' }}>
            <div style={{ ...s.panel, maxWidth: 720, margin: '0 auto' }}>
              <PanelTitle>Import Faculty CSV</PanelTitle>
              <p style={s.hint}>Upload a prepared CSV with the required faculty fields. Subject assignments can be added afterward.</p>
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

        {activeFacultyTab === 'manual' && (
      <div style={{ ...s.tabPanel, paddingBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div style={{ ...s.panel, width: '100%', maxWidth: 760, minWidth: 0 }}>
          <PanelTitle>New Faculty Account</PanelTitle>
          <p style={s.hint}>A temporary password will be auto-generated and emailed to the teacher.</p>
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
            <Field label="Employee ID">
              <input style={s.input} type="text" value={form.employee_id}
                onChange={(e) => set('employee_id', e.target.value)} required />
            </Field>
            <Field label="Department (College)">
              <select style={s.input} value={form.department}
                onChange={(e) => set('department', e.target.value)} required>
                <option value="">-- Select Department --</option>
                {colleges.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
              </select>
            </Field>
            <Field label={`Subjects ${form.subjects.length ? `(${form.subjects.length} selected)` : ''}`}>
              <MultiSelect
                options={subjects} selected={form.subjects}
                onChange={(val) => set('subjects', val)}
                placeholder={form.department ? 'No subjects found.' : 'Select a department first.'}
              />
            </Field>
            <button type="submit" style={s.submitBtn(!form.department || loading)} disabled={!form.department || loading}>
              {loading ? 'Creating account...' : 'Create & Send Credentials'}
            </button>
          </form>

        </div>

      </div>
      </div>
        )}
        {activeFacultyTab === 'directory' && (
          <div style={{ ...s.tabPanel, paddingBottom: 8 }}>
            <div style={{ ...s.panel, minWidth: 0, padding: 0, gap: 0, overflow: 'hidden' }}>
              <div style={{ padding: '10px 18px', background: c.accentBg, borderBottom: '1px solid var(--app-border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <PanelTitle>Faculty by Department</PanelTitle>
                <div style={{ marginLeft: 'auto' }}>
                  <select style={{ ...s.input, width: 'auto', fontSize: 12, padding: '6px 10px' }}
                    value={filterDept} onChange={(e) => setFilterDept(e.target.value)}>
                    <option value="">All Departments</option>
                    {Object.keys(grouped).map((department) => (
                      <option key={department} value={department}>{department}</option>
                    ))}
                  </select>
                </div>
              </div>
              {!filterDept ? (
                deptKeys.length === 0 ? (
                  <div style={{ ...s.comingSoon, minHeight: 420, padding: 24, boxSizing: 'border-box' }}>
                    <div style={{ fontSize: 36, opacity: 0.3 }}>*</div>
                    <div style={{ fontSize: 14, color: c.muted }}>No faculty added yet.</div>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, padding: 16 }}>
                    {deptKeys.map((department) => (
                      <button
                        key={department}
                        type="button"
                        onClick={() => setFilterDept(department)}
                        style={{
                          ...s.submitBtn(false),
                          marginTop: 0,
                          minHeight: 84,
                          textAlign: 'left',
                          padding: '14px 16px',
                          background: c.card,
                          color: c.text,
                          borderColor: c.border,
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          gap: 6,
                        }}
                      >
                        <span style={{ color: c.accent, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                          {department}
                        </span>
                        <span style={{ color: c.muted, fontSize: 12 }}>
                          {grouped[department].length} {grouped[department].length === 1 ? 'faculty member' : 'faculty members'}
                        </span>
                      </button>
                    ))}
                  </div>
                )
              ) : deptKeys.length === 0 ? (
                <div style={{ ...s.comingSoon, minHeight: 420, padding: 24, boxSizing: 'border-box' }}>
                  <div style={{ fontSize: 36, opacity: 0.3 }}>*</div>
                  <div style={{ fontSize: 14, color: c.muted }}>No faculty added yet.</div>
                </div>
              ) : deptKeys.map((dept) => (
                <div key={dept} style={{ borderBottom: '1px solid var(--app-border)' }}>
                  <div style={{ padding: '10px 18px', background: c.accentBg, borderBottom: '1px solid var(--app-border)', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: c.accent, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 6, height: 6, background: c.accent, borderRadius: '50%', display: 'inline-block' }} />
                    {dept}
                    <span style={{ marginLeft: 'auto', fontWeight: 400, color: c.muted, fontSize: 11 }}>
                      {grouped[dept].length} {grouped[dept].length === 1 ? 'faculty' : 'faculty members'}
                    </span>
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: 'var(--app-panel)' }}>
                        {['Name', 'Employee ID', 'Email', 'Subjects'].map((h, index) => (
                          <th key={h} style={{ padding: '8px 16px', textAlign: index === 0 ? 'left' : 'center', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: c.muted, borderBottom: '1px solid var(--app-border)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {grouped[dept].map((t, i) => (
                        <tr key={t.employee_id} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(148, 163, 184, 0.08)', borderBottom: '1px solid var(--app-border)' }}>
                          <td style={{ padding: '10px 16px', fontWeight: 500, color: c.text, textAlign: 'left' }}>{t.full_name}</td>
                          <td style={{ padding: '10px 16px', fontFamily: 'monospace', color: c.muted, fontSize: 12, textAlign: 'center' }}>{t.employee_id}</td>
                          <td style={{ padding: '10px 16px', color: c.muted, fontSize: 12, textAlign: 'center' }}>{t.email}</td>
                          <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                              {t.subjects?.length > 0
                                ? t.subjects.map((subject) => <span key={subject} style={{ background: c.accentBg, border: '1px solid var(--app-accent)', color: c.accent, borderRadius: 4, padding: '2px 7px', fontSize: 11 }}>{subject}</span>)
                                : <span style={{ color: c.muted, fontSize: 12 }}>-</span>}
                            </div>
                          </td>
                        </tr>
                      ))}
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
