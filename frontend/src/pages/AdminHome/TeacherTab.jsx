import { useState, useEffect, useRef } from 'react';
import { notify, confirmDialog } from '../../components/toastBus';
import { PanelTitle, Field } from '../../components/ui';
import { s, c, parseCsv, paginate, apiErrorText } from './adminHelpers';
import { UserPagination, MultiSelect, GroupPager } from './AdminShared';
import { useUrlState, useUrlPage } from '../../hooks/useUrlState';
import { fetchCollege, fetchProgram, fetchSubjects, adminCreateTeacher, fetchTeachers } from '../../controllers/adminController';

const FACULTY_PER_PAGE = 10;

export function TeacherTab() {
  const emptyForm = {
    first_name: '', last_name: '', middle_name: '',
    email: '', department: '', subjects: [],
  };

  const [form, setForm]               = useState(emptyForm);
  const [colleges, setColleges]       = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers]       = useState([]);
  const [loading, setLoading]         = useState(false);
  // Sub-tab, department and page live in the URL so a refresh keeps the same view.
  const [activeFacultyTab, changeFacultyTab] = useUrlState('faculty', 'manual', ['manual', 'directory']);
  const [filterDept, setFilterDept] = useUrlState('dept', '');
  const [facultyPage, setFacultyPage] = useUrlPage('fpage');
  const csvInputRef = useRef(null);
  const [csvRows, setCsvRows] = useState([]);
  const [csvError, setCsvError] = useState('');
  const [csvImporting, setCsvImporting] = useState(false);

  const changeDepartmentFilter = (department) => {
    setFilterDept(department);
    setFacultyPage(1);
  };

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
      const { data } = await adminCreateTeacher({
        first_name: form.first_name, last_name: form.last_name, middle_name: form.middle_name,
        email: form.email,
        department: parseInt(form.department), subjects: form.subjects,
      });
      notify(`OK: Teacher account created with employee ID ${data.employee_id}. Credentials sent to ${form.email}.`);
      setForm(emptyForm); setSubjects([]); loadTeachers();
    } catch (err) {
      notify('Error: ' + apiErrorText(err));
    } finally { setLoading(false); }
  }

  function validateCsvRows(rows) {
    const emails = new Set();
    return rows.map((row) => {
      const errors = [];
      const department = colleges.find((college) => college.code?.toLowerCase() === row.department_code?.toLowerCase());
      if (!row.first_name || !row.last_name || !row.email || !row.department_code) {
        errors.push('Required fields are missing');
      }
      if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) errors.push('Invalid email');
      if (row.email && emails.has(row.email.toLowerCase())) errors.push('Duplicate email in file');
      if (row.email) emails.add(row.email.toLowerCase());
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
          department: row.department.id,
          subjects: [],
        });
        created += 1;
      } catch (error) {
        failures.push(`Row ${row.rowNumber}: ${apiErrorText(error)}`);
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

  const deptKeys = Object.keys(grouped).sort();
  const currentDept = deptKeys.includes(filterDept) ? filterDept : deptKeys[0];
  const deptRows = currentDept ? grouped[currentDept] : [];
  const facultyPageData = paginate(deptRows, facultyPage, FACULTY_PER_PAGE);

  return (
    <>
      <div style={{ ...s.panel, padding: 0, overflow: 'hidden' }}>
        <div style={s.tabNav}>
          {[
            { key: 'manual', label: 'New Faculty Account' },
            { key: 'directory', label: 'Faculty by Department' },
          ].map((tab) => (
            <button key={tab.key} type="button" onClick={() => changeFacultyTab(tab.key)} style={s.tabButton(activeFacultyTab === tab.key)}>
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
              <p style={s.hint}>Columns: first_name, middle_name, last_name, email, department_code. Employee IDs are assigned automatically.</p>
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
          <p style={s.hint}>The employee ID (EMP-0001, EMP-0002 ...) is assigned automatically. A temporary password is emailed to the teacher.</p>
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
              <div style={{ padding: '10px 18px', background: c.accentBg, borderBottom: '1px solid var(--app-border)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <PanelTitle>Faculty by Department</PanelTitle>
                <div style={{ marginLeft: 'auto' }}>
                  <GroupPager groups={deptKeys} value={currentDept} onChange={changeDepartmentFilter} label="Department" />
                </div>
              </div>
              {deptKeys.length === 0 ? (
                <div style={{ ...s.comingSoon, minHeight: 240, padding: 24, boxSizing: 'border-box' }}>
                  <div style={{ fontSize: 14, color: c.muted }}>No faculty added yet.</div>
                </div>
              ) : (
                <div style={{ paddingBottom: 12 }}>
                  <table style={s.table}>
                    <colgroup>
                      <col style={{ width: '26%' }} /><col style={{ width: 130 }} /><col style={{ width: '28%' }} /><col />
                    </colgroup>
                    <thead>
                      <tr>{['Name', 'Employee ID', 'Email', 'Subjects'].map((h) => <th key={h} style={s.th}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {facultyPageData.visible.map((t) => (
                        <tr key={t.id}>
                          <td style={{ ...s.td, fontWeight: 500 }}>{t.full_name}</td>
                          <td style={{ ...s.td, ...s.mono }}>{t.employee_id}</td>
                          <td style={{ ...s.td, color: c.muted, fontSize: 12 }}>{t.email}</td>
                          <td style={s.td}>
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
                  <div style={{ padding: '0 16px' }}>
                    <UserPagination
                      page={facultyPageData.current}
                      totalPages={facultyPageData.totalPages}
                      totalItems={deptRows.length}
                      pageSize={FACULTY_PER_PAGE}
                      onPageChange={setFacultyPage}
                      itemLabel="faculty members"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
