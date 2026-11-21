// Admin grade report: generate, export (PDF / CSV / Excel) and print.
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  fetchGradeReport,
  exportGradeReportCsv,
  exportGradeReportExcel,
} from '../services/api';
import { downloadBlob } from '../services/download';
import { REPORT_COLUMNS, toReportCells } from '../models/report';

// Resolves to { summary: { total, graded, passing, failing }, truncated, results }.
export async function generateReport(filters) {
  const { data } = await fetchGradeReport(filters);
  return data;
}

// Built in the browser from the loaded report; no server call.
export function exportReportPdf(report) {
  const { summary } = report;
  const doc = new jsPDF({ orientation: 'landscape' });
  doc.setFontSize(14);
  doc.text('Grade Summary Report', 14, 14);
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 20);
  doc.text(
    `Total: ${summary.total} | Graded: ${summary.graded} | Passing: ${summary.passing} | Failing: ${summary.failing}`,
    14,
    26,
  );

  autoTable(doc, {
    startY: 32,
    head: [REPORT_COLUMNS],
    body: (report.results || []).map(toReportCells),
    styles: { fontSize: 8.5, cellPadding: 2 },
    headStyles: { fillColor: [30, 35, 53] },
  });

  doc.save('grade_report.pdf');
}

// CSV and Excel are built by the API from the same filters.
export async function exportReportCsv(filters) {
  const res = await exportGradeReportCsv(filters);
  downloadBlob(res.data, 'grade_report.csv');
}

export async function exportReportExcel(filters) {
  const res = await exportGradeReportExcel(filters);
  downloadBlob(res.data, 'grade_report.xlsx');
}

// Opens a print-ready copy in a pop-up that prints itself and closes.
// Returns false when the pop-up is blocked.
export function printReport(report) {
  const win = window.open('', '_blank', 'width=1100,height=800');
  if (!win) return false;

  win.document.write(buildPrintHtml(report));
  win.document.close();
  return true;
}

// Report values include user-typed text (remarks, names), so escape before writing HTML.
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildPrintHtml(report) {
  const { summary } = report;
  const headerCells = REPORT_COLUMNS.map((title) => `<th>${title}</th>`).join('');
  const rows = (report.results || []).map((row) => `
      <tr>
        ${toReportCells(row).map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}
      </tr>
    `).join('');

  return `
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
            <div class="card"><div class="label">Total</div><div class="value">${summary.total}</div></div>
            <div class="card"><div class="label">Graded</div><div class="value">${summary.graded}</div></div>
            <div class="card"><div class="label">Passing</div><div class="value">${summary.passing}</div></div>
            <div class="card"><div class="label">Failing</div><div class="value">${summary.failing}</div></div>
          </div>
          <table>
            <thead>
              <tr>${headerCells}</tr>
            </thead>
            <tbody>${rows || '<tr><td colspan="9">No rows found.</td></tr>'}</tbody>
          </table>
          <script>window.onload = () => { window.print(); window.close(); };</script>
        </body>
      </html>
    `;
}
