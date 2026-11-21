// Admin grade report: filter defaults and the column layout shared by the PDF export and the print view.

export const EMPTY_REPORT_FILTERS = Object.freeze({
  term: '',
  program: '',
  year_level: '',
  student: '',
  subject: '',
});

export const REPORT_COLUMNS = Object.freeze([
  'Student ID', 'Student', 'Code', 'Subject', 'Term', 'Prelim', 'Midterm', 'Finals', 'Remarks',
]);

// One report row -> display values in REPORT_COLUMNS order.
export function toReportCells(row) {
  return [
    row.student_id_no || row.student || '--',
    row.student_name || '--',
    row.subject_code || '--',
    row.subject_name || '--',
    row.term_label || row.term || '--',
    row.prelim ?? '--',
    row.midterm ?? '--',
    row.finals ?? '--',
    row.remarks || '--',
  ];
}
