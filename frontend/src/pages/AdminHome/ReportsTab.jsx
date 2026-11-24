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
  fetchGradeReport, exportGradeReportCsv,
  fetchAuditLogs, adminUpdateUser, adminDeleteUser, adminDeleteStudentRecord,
  fetchNotifications,
} from '../../controllers/adminController';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function ReportsTab() {
  const [filters, setFilters] = useState({ term: '', program: '', year_level: '', student: '', subject: '' });
  const [report, setReport] = useState(null);
  const [programs, setPrograms] = useState([]);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportMenuRef = useRef(null);

  useEffect(() => {
    fetchProgram().then(({ data }) => setPrograms(data)).catch(console.error);
  }, []);

  useEffect(() => {
    const closeMenu = (event) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) {
        setExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', closeMenu);
    return () => document.removeEventListener('mousedown', closeMenu);
  }, []);

  async function loadReport() {
    const { data } = await fetchGradeReport(filters);
    setReport(data);
  }

  function handlePrint() {
    if (!report) return;

    const win = window.open('', '_blank', 'width=1100,height=800');
    if (!win) {
      notify('Popup blocked. Please allow popups to print the report.');
      return;
    }

    const rows = (report.results || []).map((row) => `
      <tr>
        <td>${escapeHtml(row.student_id_no || row.student || '--')}</td>
        <td>${escapeHtml(row.student_name || '--')}</td>
        <td>${escapeHtml(row.subject_code || '--')}</td>
        <td>${escapeHtml(row.subject_name || '--')}</td>
        <td>${escapeHtml(row.term_label || row.term || '--')}</td>
        <td>${escapeHtml(row.prelim ?? '--')}</td>
        <td>${escapeHtml(row.midterm ?? '--')}</td>
        <td>${escapeHtml(row.finals ?? '--')}</td>
        <td>${escapeHtml(row.remarks || '--')}</td>
      </tr>
    `).join('');

    win.document.write(`
      <html>
        <head>
          <title>Grade Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
            h1 { margin: 0 0 8px; font-size: 22px; }
            .meta { color: #4b5563; font-size: 12px; margin-bottom: 18px; }
            .stats { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 18px; }
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
          <div class="meta">Generated ${new Date().toLocaleString()}</div>
          <div class="stats">
            <div class="card"><div class="label">Total</div><div class="value">${report.summary.total}</div></div>
            <div class="card"><div class="label">Graded</div><div class="value">${report.summary.graded}</div></div>
            <div class="card"><div class="label">Passing</div><div class="value">${report.summary.passing}</div></div>
            <div class="card"><div class="label">Failing</div><div class="value">${report.summary.failing}</div></div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Student ID</th><th>Student</th><th>Code</th><th>Subject</th><th>Term</th><th>Prelim</th><th>Midterm</th><th>Finals</th><th>Remarks</th>
              </tr>
            </thead>
            <tbody>${rows || '<tr><td colspan="9">No rows found.</td></tr>'}</tbody>
          </table>
          <script>window.onload = () => { window.print(); window.close(); };</script>
        </body>
      </html>
    `);
    win.document.close();
  }

  async function handleExportCsv() {
    const res = await exportGradeReportCsv(filters);
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'grade_report.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }

  function handleExportPdf() {
    if (!report) {
      notify('Generate a report first.');
      return;
    }

    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(14);
    doc.text('Grade Summary Report', 14, 14);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 20);
    doc.text(
      `Total: ${report.summary.total} | Graded: ${report.summary.graded} | Passing: ${report.summary.passing} | Failing: ${report.summary.failing}`,
      14,
      26,
    );

    autoTable(doc, {
      startY: 32,
      head: [['Student ID', 'Student', 'Code', 'Subject', 'Term', 'Prelim', 'Midterm', 'Finals', 'Remarks']],
      body: (report.results || []).map((row) => [
        row.student_id_no || row.student || '--',
        row.student_name || '--',
        row.subject_code || '--',
        row.subject_name || '--',
        row.term_label || row.term || '--',
        row.prelim ?? '--',
        row.midterm ?? '--',
        row.finals ?? '--',
        row.remarks || '--',
      ]),
      styles: { fontSize: 8.5, cellPadding: 2 },
      headStyles: { fillColor: [30, 35, 53] },
    });

    doc.save('grade_report.pdf');
  }

  return (
    <>
      <PageHeader title="Reports" subtitle="Generate grade summary reports and export files." />

      <div style={{ ...s.panel, width: '100%', flex: '0 0 auto', boxSizing: 'border-box' }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 16, flexWrap: 'wrap',
        }}>
          <PanelTitle>Report Filters</PanelTitle>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button style={s.submitBtn(false)} onClick={loadReport}>Generate Report</button>
            <div ref={exportMenuRef} style={{ position: 'relative' }}>
              <button
                type="button"
                style={s.paginationButton(false)}
                onClick={() => setExportMenuOpen((open) => !open)}
                aria-haspopup="menu"
                aria-expanded={exportMenuOpen}
              >
                Export ▾
              </button>
              {exportMenuOpen && (
                <div
                  role="menu"
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 'calc(100% + 6px)',
                    zIndex: 20,
                    minWidth: 150,
                    padding: 6,
                    background: c.card,
                    border: `1px solid ${c.border}`,
                    borderRadius: 8,
                    boxShadow: c.shadowLg,
                  }}
                >
                  <button
                    type="button"
                    role="menuitem"
                    disabled={!report}
                    onClick={() => { setExportMenuOpen(false); handleExportPdf(); }}
                    style={{
                      width: '100%',
                      border: 'none',
                      borderRadius: 6,
                      padding: '9px 10px',
                      background: 'transparent',
                      color: report ? c.text : c.muted,
                      cursor: report ? 'pointer' : 'not-allowed',
                      textAlign: 'left',
                      fontFamily: 'inherit',
                      fontSize: 12,
                    }}
                  >
                    Export as PDF
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={async () => { setExportMenuOpen(false); await handleExportCsv(); }}
                    style={{
                      width: '100%',
                      border: 'none',
                      borderRadius: 6,
                      padding: '9px 10px',
                      background: 'transparent',
                      color: c.text,
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontFamily: 'inherit',
                      fontSize: 12,
                    }}
                  >
                    Export as CSV
                  </button>
                </div>
              )}
            </div>
            <button style={s.paginationButton(!report)} onClick={handlePrint} disabled={!report} title="Print report">Print</button>
          </div>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(180px, 1fr) minmax(260px, 2fr) minmax(150px, 1fr)',
          gap: 12,
          alignItems: 'end',
          marginTop: 16,
        }}>
          <Field label="Academic Term">
            <input
              style={s.input}
              placeholder="Term ID"
              value={filters.term}
              onChange={(e) => setFilters({ ...filters, term: e.target.value })}
            />
          </Field>
          <Field label="Degree Program">
            <select
              style={s.input}
              value={filters.program}
              onChange={(e) => setFilters({ ...filters, program: e.target.value })}
            >
              <option value="">All Programs</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Year Level">
            <select
              style={s.input}
              value={filters.year_level}
              onChange={(e) => setFilters({ ...filters, year_level: e.target.value })}
            >
              <option value="">All Years</option>
              {[1, 2, 3, 4].map((y) => (
                <option key={y} value={y}>Year {y}</option>
              ))}
            </select>
          </Field>
        </div>
        <div style={{ paddingTop: 4, borderTop: '1px solid var(--app-border)' }}>
          <details>
            <summary style={{
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--app-muted)',
              listStyle: 'none',
              outline: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}>
              <span>More Filters</span>
              <span style={{ fontSize: 12, color: 'var(--app-border)' }}>▾</span>
            </summary>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12, marginTop: 10 }}>
              <Field label="Student ID">
                <input
                  style={s.input}
                  placeholder="Optional student ID"
                  value={filters.student}
                  onChange={(e) => setFilters({ ...filters, student: e.target.value })}
                />
              </Field>
              <Field label="Subject ID">
                <input
                  style={s.input}
                  placeholder="Optional subject ID"
                  value={filters.subject}
                  onChange={(e) => setFilters({ ...filters, subject: e.target.value })}
                />
              </Field>
            </div>
          </details>
        </div>
      </div>

      {report && (
        <div style={{ ...s.panel, padding: 0, overflow: 'hidden' }}>
          <SectionHeader title="Summary" />
          <div style={{ padding: 16, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <StatCard label="Total" value={report.summary.total} />
            <StatCard label="Graded" value={report.summary.graded} />
            <StatCard label="Passing" value={report.summary.passing} />
            <StatCard label="Failing" value={report.summary.failing} />
          </div>
          <SectionHeader title="Results" right={`${report.results?.length || 0} rows`} />
          {report.results?.length ? (
            <div style={{ maxHeight: 460, overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: 'var(--app-panel)' }}>
                    {['Student', 'Subject', 'Term', 'Prelim', 'Midterm', 'Finals', 'Remarks'].map((h) => (
                      <th key={h} style={s.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.results.map((row) => (
                    <tr key={row.id}>
                      <td style={s.td}>{row.student_name} ({row.student_id_no})</td>
                      <td style={s.td}>{row.subject_code} - {row.subject_name}</td>
                      <td style={s.td}>{row.term_label || row.term || '--'}</td>
                      <td style={s.td}>{row.prelim ?? '--'}</td>
                      <td style={s.td}>{row.midterm ?? '--'}</td>
                      <td style={s.td}>{row.finals ?? '--'}</td>
                      <td style={s.td}>{row.remarks || '--'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: 16, color: c.muted }}>No grade rows found for the selected filters.</div>
          )}
        </div>
      )}
    </>
  );
}
