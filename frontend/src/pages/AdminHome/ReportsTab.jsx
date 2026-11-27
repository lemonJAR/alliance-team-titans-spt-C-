import { useState, useEffect } from 'react';
import { notify } from '../../components/toastBus';
import { PageHeader, PanelTitle, Field, SectionHeader, StatCard } from '../../components/ui';
import { s, c, escapeHtml, fmtGrade, paginate, apiErrorText } from './adminHelpers';
import { UserPagination } from './AdminShared';
import { useUrlPage } from '../../hooks/useUrlState';
import { fetchProgram, fetchTerms, fetchGradeReport } from '../../controllers/adminController';
import { downloadLockedGradePdf } from '../../utils/securePdf';

// Reports can be printed or saved as a locked PDF. There is no CSV/Excel export, so an exported
// report can't be opened in a spreadsheet and have its grades changed.

const ROWS_PER_PAGE = 15;
const EMPTY_FILTERS = { term: '', program: '', year_level: '', student: '', subject: '' };
const COLUMNS = ['Student ID', 'Student', 'Code', 'Subject', 'Term', 'Prelim', 'Midterm', 'Finals', 'Remarks'];
const center = { textAlign: 'center' };

const toCells = (row) => [
  row.student_id_no || '--',
  row.student_name || '--',
  row.subject_code || '--',
  row.subject_name || '--',
  row.term_label || '--',
  fmtGrade(row.prelim) || '--',
  fmtGrade(row.midterm) || '--',
  fmtGrade(row.finals) || '--',
  row.remarks || '--',
];

export function ReportsTab() {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [report, setReport] = useState(null);
  const [programs, setPrograms] = useState([]);
  const [terms, setTerms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useUrlPage('rpage');

  useEffect(() => {
    fetchProgram().then(({ data }) => setPrograms(data || [])).catch(console.error);
    fetchTerms().then(({ data }) => setTerms(data || [])).catch(console.error);
  }, []);

  const set = (field, value) => setFilters((f) => ({ ...f, [field]: value }));

  // A readable description of the filters, printed on the PDF / print-out.
  function filterSummary() {
    const term = terms.find((t) => String(t.id) === String(filters.term));
    const program = programs.find((p) => String(p.id) === String(filters.program));
    return [
      `Term: ${term ? `${term.school_year} - Sem ${term.semester}` : 'All terms'}`,
      `Program: ${program ? `${program.name} (${program.code})` : 'All programs'}`,
      `Year: ${filters.year_level ? `Year ${filters.year_level}` : 'All years'}`,
      filters.student && `Student: ${filters.student}`,
      filters.subject && `Subject: ${filters.subject}`,
    ].filter(Boolean).join('  |  ');
  }

  async function loadReport() {
    setLoading(true);
    try {
      const { data } = await fetchGradeReport(filters);
      setReport(data);
      setPage(1);
    } catch (err) {
      notify('Failed to generate report. ' + apiErrorText(err));
    } finally {
      setLoading(false);
    }
  }

  function handlePrint() {
    if (!report) return;
    const win = window.open('', '_blank', 'width=1100,height=800');
    if (!win) {
      notify('Popup blocked. Please allow popups to print the report.');
      return;
    }
    const rows = (report.results || [])
      .map((row) => `<tr>${toCells(row).map((v) => `<td>${escapeHtml(v)}</td>`).join('')}</tr>`)
      .join('');
    const { summary } = report;
    win.document.write(`
      <html>
        <head>
          <title>Grade Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
            h1 { margin: 0 0 8px; font-size: 22px; }
            .meta { color: #4b5563; font-size: 12px; margin-bottom: 6px; }
            .stats { display: flex; gap: 12px; flex-wrap: wrap; margin: 14px 0 18px; }
            .card { border: 1px solid #d1d5db; border-radius: 8px; padding: 12px 14px; min-width: 110px; }
            .label { font-size: 10px; text-transform: uppercase; letter-spacing: .08em; color: #6b7280; }
            .value { font-size: 22px; font-weight: 700; margin-top: 6px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #d1d5db; padding: 8px 10px; text-align: left; vertical-align: top; }
            th { background: #f3f4f6; }
          </style>
        </head>
        <body>
          <h1>Grade Summary Report</h1>
          <div class="meta">${escapeHtml(filterSummary())}</div>
          <div class="meta">Generated ${escapeHtml(new Date().toLocaleString())}</div>
          <div class="stats">
            <div class="card"><div class="label">Total</div><div class="value">${summary.total}</div></div>
            <div class="card"><div class="label">Graded</div><div class="value">${summary.graded}</div></div>
            <div class="card"><div class="label">Passing</div><div class="value">${summary.passing}</div></div>
            <div class="card"><div class="label">Failing</div><div class="value">${summary.failing}</div></div>
          </div>
          <table>
            <thead><tr>${COLUMNS.map((h) => `<th>${h}</th>`).join('')}</tr></thead>
            <tbody>${rows || '<tr><td colspan="9">No rows found.</td></tr>'}</tbody>
          </table>
          <script>window.onload = () => { window.print(); window.close(); };</script>
        </body>
      </html>
    `);
    win.document.close();
  }

  function handleExportPdf() {
    if (!report) return;
    const { summary } = report;
    try {
      downloadLockedGradePdf({
        fileName: 'grade_report.pdf',
        title: 'Grade Summary Report',
        subtitleLines: [
          filterSummary(),
          `Total: ${summary.total}  |  Graded: ${summary.graded}  |  Passing: ${summary.passing}  |  Failing: ${summary.failing}`,
        ],
        head: COLUMNS,
        body: (report.results || []).map(toCells),
      });
    } catch (err) {
      console.error(err);
      notify('Failed to create the PDF.');
    }
  }

  const results = report?.results || [];
  const pageData = paginate(results, page, ROWS_PER_PAGE);

  return (
    <>
      <PageHeader title="Reports" subtitle="Generate grade summary reports, then print them or save a locked PDF." />

      <div style={{ ...s.panel, flex: '0 0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <PanelTitle>Report Filters</PanelTitle>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" style={{ ...s.submitBtn(loading), marginTop: 0 }} disabled={loading} onClick={loadReport}>
              {loading ? 'Generating...' : 'Generate Report'}
            </button>
            <button type="button" style={s.paginationButton(!report)} disabled={!report} onClick={handleExportPdf}>Export PDF</button>
            <button type="button" style={s.paginationButton(!report)} disabled={!report} onClick={handlePrint}>Print</button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, alignItems: 'end' }}>
          <Field label="Academic Term">
            <select style={s.input} value={filters.term} onChange={(e) => set('term', e.target.value)}>
              <option value="">All terms</option>
              {terms.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.school_year} - Sem {t.semester}{t.is_active ? ' (active)' : ''}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Degree Program">
            <select style={s.input} value={filters.program} onChange={(e) => set('program', e.target.value)}>
              <option value="">All programs</option>
              {programs.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
            </select>
          </Field>
          <Field label="Year Level">
            <select style={s.input} value={filters.year_level} onChange={(e) => set('year_level', e.target.value)}>
              <option value="">All years</option>
              {[1, 2, 3, 4].map((y) => <option key={y} value={y}>Year {y}</option>)}
            </select>
          </Field>
          <Field label="Student ID (optional)">
            <input style={s.input} placeholder="e.g. 2025-0001" value={filters.student} onChange={(e) => set('student', e.target.value)} />
          </Field>
          <Field label="Subject Code (optional)">
            <input style={s.input} placeholder="e.g. IT101" value={filters.subject} onChange={(e) => set('subject', e.target.value.toUpperCase())} />
          </Field>
        </div>
      </div>

      {report && (
        <div style={{ ...s.panel, padding: 0, gap: 0, overflow: 'hidden' }}>
          <SectionHeader title="Summary" />
          <div style={{ padding: 16, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <StatCard label="Total" value={report.summary.total} />
            <StatCard label="Graded" value={report.summary.graded} />
            <StatCard label="Passing" value={report.summary.passing} accent="var(--app-success)" />
            <StatCard label="Failing" value={report.summary.failing} accent={report.summary.failing ? 'var(--app-danger)' : undefined} />
          </div>
          <SectionHeader title="Results" right={`${results.length} rows${report.truncated ? ' (first 5000 shown)' : ''}`} />
          {results.length ? (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ ...s.table, minWidth: 900 }}>
                  <colgroup>
                    <col style={{ width: '24%' }} /><col style={{ width: '26%' }} /><col style={{ width: 140 }} />
                    <col style={{ width: 84 }} /><col style={{ width: 84 }} /><col style={{ width: 84 }} /><col />
                  </colgroup>
                  <thead>
                    <tr>
                      <th style={s.th}>Student</th>
                      <th style={s.th}>Subject</th>
                      <th style={s.th}>Term</th>
                      <th style={{ ...s.th, ...center }}>Prelim</th>
                      <th style={{ ...s.th, ...center }}>Midterm</th>
                      <th style={{ ...s.th, ...center }}>Finals</th>
                      <th style={s.th}>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageData.visible.map((row) => (
                      <tr key={row.enrollment_id}>
                        <td style={s.td}>
                          <div style={{ fontWeight: 500 }}>{row.student_name}</div>
                          <div style={{ ...s.mono, fontSize: 11 }}>{row.student_id_no}</div>
                        </td>
                        <td style={s.td}>
                          <div style={s.mono}>{row.subject_code}</div>
                          <div style={{ fontSize: 12, color: c.muted }}>{row.subject_name}</div>
                        </td>
                        <td style={{ ...s.td, color: c.muted, fontSize: 12, whiteSpace: 'nowrap' }}>{row.term_label}</td>
                        <td style={{ ...s.td, ...center }}>{fmtGrade(row.prelim) || '--'}</td>
                        <td style={{ ...s.td, ...center }}>{fmtGrade(row.midterm) || '--'}</td>
                        <td style={{ ...s.td, ...center, fontWeight: 600 }}>{fmtGrade(row.finals) || '--'}</td>
                        <td style={{ ...s.td, color: c.muted, fontSize: 12 }}>{row.remarks || '--'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ padding: '0 16px 12px' }}>
                <UserPagination
                  page={pageData.current}
                  totalPages={pageData.totalPages}
                  totalItems={results.length}
                  pageSize={ROWS_PER_PAGE}
                  onPageChange={setPage}
                  itemLabel="rows"
                />
              </div>
            </>
          ) : (
            <div style={{ padding: 16, color: c.muted }}>No grade rows found for the selected filters.</div>
          )}
        </div>
      )}
    </>
  );
}
