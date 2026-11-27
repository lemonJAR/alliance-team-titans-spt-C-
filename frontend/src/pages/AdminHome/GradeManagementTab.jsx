import { useState, useEffect, useMemo } from 'react';
import { notify, confirmDialog } from '../../components/toastBus';
import { PageHeader, PanelTitle, Field, SectionHeader } from '../../components/ui';
import { s, c, fmtGrade, paginate, apiErrorText } from './adminHelpers';
import { UserPagination } from './AdminShared';
import { useUrlPage } from '../../hooks/useUrlState';
import { fetchSubjects, fetchStudents, fetchTerms, fetchGrades, updateGrade, deleteGrade } from '../../controllers/adminController';

const ROWS_PER_PAGE = 10;
const PERIODS = [
  { key: 'prelim', label: 'Prelim' },
  { key: 'midterm', label: 'Midterm' },
  { key: 'finals', label: 'Finals' },
];
const EMPTY_FILTERS = { student: '', term: '', subject: '', period: '' };

// Grade values the server accepts: 1.00 - 5.00 in steps of 0.25 (blank = not graded yet).
function gradeError(value) {
  if (value === '' || value == null) return null;
  const n = Number(value);
  if (Number.isNaN(n) || n < 1 || n > 5 || Math.round((n - 1) * 100) % 25 !== 0) return '1.00-5.00, steps of 0.25';
  return null;
}

const toEditable = (g) => ({
  ...g,
  prelim: fmtGrade(g.prelim ?? ''),
  midterm: fmtGrade(g.midterm ?? ''),
  finals: fmtGrade(g.finals ?? ''),
  remarks: g.remarks ?? '',
});

const isDirty = (row, original) =>
  !!original && ['prelim', 'midterm', 'finals', 'remarks'].some((k) => String(row[k] ?? '') !== String(original[k] ?? ''));

const cell = { ...s.td, whiteSpace: 'nowrap' };
const center = { textAlign: 'center' };
const gradeInput = (invalid) => ({
  ...s.input, width: 76, textAlign: 'center', padding: '7px 6px',
  ...(invalid ? { borderColor: 'var(--app-danger)' } : {}),
});

export function GradeManagementTab() {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [subjects, setSubjects] = useState([]);
  const [terms, setTerms] = useState([]);
  const [students, setStudents] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState(null);

  const [rows, setRows] = useState([]);         // editable copies
  const [originals, setOriginals] = useState({}); // id -> row as loaded, to detect changes
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [page, setPage] = useUrlPage('gpage');

  useEffect(() => {
    fetchSubjects().then(({ data }) => setSubjects(data || [])).catch(console.error);
    fetchStudents().then(({ data }) => setStudents(data || [])).catch(console.error);
    fetchTerms().then(({ data }) => setTerms(data || [])).catch(console.error);
    loadGrades(EMPTY_FILTERS, null);
  // Initial load only; later loads come from the Search button.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const suggestions = useMemo(() => {
    const q = filters.student.trim().toLowerCase();
    if (!q) return [];
    return students.filter((st) =>
      (st.student_id || '').toLowerCase().includes(q) || (st.full_name || '').toLowerCase().includes(q),
    ).slice(0, 12);
  }, [filters.student, students]);

  async function loadGrades(f = filters, studentId = selectedStudentId) {
    setLoading(true);
    try {
      // A typed ID number is resolved to the student's database id.
      const typed = f.student.trim();
      const match = !studentId && typed ? students.find((st) => st.student_id === typed) : null;
      const { data } = await fetchGrades({
        student: studentId ?? match?.id ?? undefined,
        term: f.term || undefined,
        subject: f.subject || undefined,
        period: f.period || undefined,
      });
      const editable = (data || []).map(toEditable);
      setRows(editable);
      setOriginals(Object.fromEntries(editable.map((r) => [r.id, { ...r }])));
    } catch (err) {
      notify('Failed to load grades. ' + apiErrorText(err));
    } finally {
      setLoading(false);
    }
  }

  function search() {
    setPage(1);
    loadGrades();
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
    setSelectedStudentId(null);
    setPage(1);
    loadGrades(EMPTY_FILTERS, null);
  }

  const editRow = (id, field, value) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));

  const resetRow = (id) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...originals[id] } : r)));

  async function saveRow(row) {
    const original = originals[row.id];
    const changes = PERIODS
      .filter((p) => String(row[p.key]) !== String(original[p.key]))
      .map((p) => `${p.label}: ${original[p.key] || '--'} -> ${row[p.key] || '--'}`);
    if (row.remarks !== original.remarks) changes.push('Remarks updated');

    const ok = await confirmDialog(
      `Override grade for ${row.student_name} (${row.subject_code})?\n${changes.join('\n')}\nThis change is recorded in the grade history and audit log.`,
    );
    if (!ok) return;

    setSavingId(row.id);
    try {
      const { data } = await updateGrade(row.id, {
        prelim: row.prelim === '' ? null : Number(row.prelim),
        midterm: row.midterm === '' ? null : Number(row.midterm),
        finals: row.finals === '' ? null : Number(row.finals),
        remarks: row.remarks,
      });
      const saved = toEditable(data);
      setRows((prev) => prev.map((r) => (r.id === row.id ? saved : r)));
      setOriginals((prev) => ({ ...prev, [row.id]: { ...saved } }));
      notify('Grade updated.');
    } catch (err) {
      notify('Failed to update grade. ' + apiErrorText(err));
    } finally {
      setSavingId(null);
    }
  }

  async function removeRow(row) {
    if (!await confirmDialog(`Delete the grade entry for ${row.student_name} (${row.subject_code})? The deletion stays in the grade history.`)) return;
    try {
      await deleteGrade(row.id);
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      notify('Grade deleted.');
    } catch (err) {
      notify('Failed to delete grade. ' + apiErrorText(err));
    }
  }

  const pageData = paginate(rows, page, ROWS_PER_PAGE);
  const dirtyCount = rows.filter((r) => isDirty(r, originals[r.id])).length;

  return (
    <>
      <PageHeader title="Grade Overrides" subtitle="Search and correct grade entries as an administrator. Every change is recorded." />

      <div style={{ ...s.panel, flex: '0 0 auto' }}>
        <PanelTitle>Search Filters</PanelTitle>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(240px, 2fr) repeat(3, minmax(160px, 1fr)) auto',
          gap: 12,
          alignItems: 'end',
        }}>
          <Field label="Student">
            <div style={{ position: 'relative' }}>
              <input
                style={s.input}
                placeholder="Student ID or name"
                value={filters.student}
                onChange={(e) => {
                  setFilters({ ...filters, student: e.target.value });
                  setSelectedStudentId(null);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                onKeyDown={(e) => { if (e.key === 'Enter') search(); }}
              />
              {showSuggestions && filters.student && (
                <div style={{
                  position: 'absolute', left: 0, right: 0, top: 'calc(100% + 4px)', zIndex: 50,
                  background: 'var(--app-card)', border: '1px solid var(--app-border)', borderRadius: 8,
                  maxHeight: 240, overflow: 'auto', boxShadow: 'var(--app-shadow-lg)',
                }}>
                  {suggestions.length === 0 ? (
                    <div style={{ padding: 10, color: c.muted, fontSize: 12 }}>No students found</div>
                  ) : suggestions.map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onMouseDown={(ev) => ev.preventDefault()}
                      onClick={() => {
                        setFilters({ ...filters, student: st.student_id });
                        setSelectedStudentId(st.id);
                        setShowSuggestions(false);
                      }}
                      style={{
                        width: '100%', display: 'grid', gridTemplateColumns: '100px 1fr', gap: 10, alignItems: 'center',
                        padding: '8px 12px', border: 'none', borderBottom: '1px solid var(--app-border)',
                        background: 'transparent', color: c.text, textAlign: 'left', cursor: 'pointer', font: 'inherit', fontSize: 13,
                      }}
                    >
                      <span style={s.mono}>{st.student_id}</span>
                      <span>{st.full_name || <em style={{ color: c.muted }}>Not registered</em>}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Field>

          <Field label="Academic Term">
            <select style={s.input} value={filters.term} onChange={(e) => setFilters({ ...filters, term: e.target.value })}>
              <option value="">All terms</option>
              {terms.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.school_year} - Sem {t.semester}{t.is_active ? ' (active)' : ''}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Grading Period">
            <select style={s.input} value={filters.period} onChange={(e) => setFilters({ ...filters, period: e.target.value })}>
              <option value="">All periods</option>
              {PERIODS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
          </Field>

          <Field label="Subject">
            <select style={s.input} value={filters.subject} onChange={(e) => setFilters({ ...filters, subject: e.target.value })}>
              <option value="">All subjects</option>
              {subjects.map((sub) => <option key={sub.id} value={sub.id}>{sub.code} - {sub.name}</option>)}
            </select>
          </Field>

          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" style={{ ...s.submitBtn(loading), marginTop: 0, whiteSpace: 'nowrap' }} disabled={loading} onClick={search}>
              {loading ? 'Searching...' : 'Search'}
            </button>
            <button type="button" style={{ ...s.paginationButton(false), padding: '10px 14px' }} onClick={clearFilters}>Clear</button>
          </div>
        </div>
      </div>

      <div style={{ ...s.panel, padding: 0, gap: 0, overflow: 'hidden' }}>
        <SectionHeader
          title="Grade Entries"
          right={`${rows.length} ${rows.length === 1 ? 'entry' : 'entries'}${dirtyCount ? ` · ${dirtyCount} unsaved` : ''}`}
        />
        {loading ? (
          <div style={{ ...s.comingSoon, minHeight: 160 }}>Loading grades...</div>
        ) : rows.length === 0 ? (
          <div style={{ ...s.comingSoon, minHeight: 160 }}>
            <div style={{ fontSize: 13, color: c.muted }}>No grade records found for these filters.</div>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ ...s.table, minWidth: 1050 }}>
                <colgroup>
                  <col style={{ width: '20%' }} />
                  <col style={{ width: '20%' }} />
                  <col style={{ width: 140 }} />
                  <col style={{ width: 96 }} /><col style={{ width: 96 }} /><col style={{ width: 96 }} />
                  <col />
                  <col style={{ width: 210 }} />
                </colgroup>
                <thead>
                  <tr>
                    <th style={s.th}>Student</th>
                    <th style={s.th}>Subject</th>
                    <th style={s.th}>Term</th>
                    {PERIODS.map((p) => <th key={p.key} style={{ ...s.th, ...center }}>{p.label}</th>)}
                    <th style={s.th}>Remarks</th>
                    <th style={{ ...s.th, ...center }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageData.visible.map((row) => {
                    const dirty = isDirty(row, originals[row.id]);
                    const invalid = PERIODS.some((p) => gradeError(row[p.key]));
                    const saving = savingId === row.id;
                    return (
                      <tr key={row.id} style={dirty ? { background: 'var(--app-accent-bg)' } : undefined}>
                        <td style={s.td}>
                          <div style={{ fontWeight: 500 }}>{row.student_name}</div>
                          <div style={{ ...s.mono, fontSize: 11 }}>{row.student_id_no}</div>
                        </td>
                        <td style={s.td}>
                          <div style={s.mono}>{row.subject_code}</div>
                          <div style={{ fontSize: 12, color: c.muted }}>{row.subject_name}</div>
                        </td>
                        <td style={{ ...cell, color: c.muted, fontSize: 12 }}>{row.term_label || '--'}</td>
                        {PERIODS.map((p) => {
                          const err = gradeError(row[p.key]);
                          return (
                            <td key={p.key} style={{ ...cell, ...center }}>
                              <input
                                style={gradeInput(!!err)}
                                inputMode="decimal"
                                placeholder="--"
                                title={err || undefined}
                                aria-label={`${p.label} grade`}
                                value={row[p.key]}
                                onChange={(e) => editRow(row.id, p.key, e.target.value)}
                              />
                            </td>
                          );
                        })}
                        <td style={s.td}>
                          <input
                            style={{ ...s.input, padding: '7px 10px' }}
                            placeholder="Optional"
                            aria-label="Remarks"
                            value={row.remarks}
                            onChange={(e) => editRow(row.id, 'remarks', e.target.value)}
                          />
                        </td>
                        <td style={{ ...cell, ...center }}>
                          <div style={{ display: 'inline-flex', gap: 6 }}>
                            <button
                              type="button"
                              style={{ ...s.submitBtn(!dirty || invalid || saving), marginTop: 0, padding: '7px 12px' }}
                              disabled={!dirty || invalid || saving}
                              title={invalid ? 'Fix the highlighted grades first' : undefined}
                              onClick={() => saveRow(row)}
                            >
                              {saving ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              type="button"
                              style={{ ...s.paginationButton(!dirty), padding: '7px 10px' }}
                              disabled={!dirty}
                              onClick={() => resetRow(row.id)}
                            >
                              Reset
                            </button>
                            <button
                              type="button"
                              style={{ ...s.paginationButton(false), padding: '7px 10px', borderColor: 'var(--app-danger)', color: 'var(--app-danger)' }}
                              onClick={() => removeRow(row)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ padding: '0 16px 12px' }}>
              <UserPagination
                page={pageData.current}
                totalPages={pageData.totalPages}
                totalItems={rows.length}
                pageSize={ROWS_PER_PAGE}
                onPageChange={setPage}
                itemLabel="grade entries"
              />
            </div>
          </>
        )}
      </div>
    </>
  );
}
