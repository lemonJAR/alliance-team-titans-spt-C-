// Shared styles and plain helper functions for the admin pages.
// Components live in AdminShared.jsx; keeping them apart lets React fast-refresh work.

export const s = {
  pageTitle: { fontSize: 26, fontWeight: 600, letterSpacing: '-0.01em' },
  pageSub:   { fontSize: 13, color: 'var(--app-muted)', marginTop: 4 },
  panels:    { display: 'flex', gap: 20, flexWrap: 'wrap' },
  panel: {
    background: 'var(--app-card)', border: '1px solid var(--app-border)', borderRadius: 10,
    padding: 24, flex: 1, minWidth: 260, display: 'flex', flexDirection: 'column', gap: 14,
  },
  panelTitle: {
    fontSize: 14, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase',
    color: 'var(--app-accent)', display: 'flex', alignItems: 'center', gap: 6,
  },
  tabNav: {
    display: 'flex', gap: 8, padding: '12px 16px', background: 'var(--app-panel)', borderBottom: '1px solid var(--app-border)',
    alignItems: 'center',
  },
  tabButton: (active) => ({
    padding: '10px 14px', borderRadius: 999, border: active ? '1px solid var(--app-accent)' : '1px solid transparent',
    background: active ? 'var(--app-accent-bg)' : 'transparent', color: active ? 'var(--app-accent)' : 'var(--app-muted)',
    fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.18s', whiteSpace: 'nowrap', flexShrink: 0,
  }),
  tabPanel: {
    padding: 20,
    overflowX: 'auto',
  },
  hint:  { fontSize: 12, color: 'var(--app-muted)', marginTop: -8, lineHeight: 1.5 },
  label: {
    display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--app-muted)',
    letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 5,
  },
  input: {
    width: '100%', background: 'var(--app-panel)', border: '1px solid var(--app-border)', borderRadius: 7,
    padding: '9px 12px', color: 'var(--app-text)', fontSize: 13.5, fontFamily: 'inherit',
    outline: 'none', boxSizing: 'border-box',
  },
  submitBtn: (disabled) => ({
    background: disabled ? 'var(--app-panel)' : 'var(--app-accent-bg)',
    border:     disabled ? '1px solid var(--app-border)' : '1px solid var(--app-accent)',
    color:      disabled ? 'var(--app-muted)' : 'var(--app-accent)',
    fontSize: 13, fontWeight: 600, padding: '10px 16px', borderRadius: 7,
    cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'inherit', marginTop: 2,
  }),
  paginationButton: (disabled) => ({
    padding: '7px 10px', borderRadius: 7, border: '1px solid var(--app-border)',
    background: disabled ? 'var(--app-panel)' : 'var(--app-card)',
    color: disabled ? 'var(--app-muted)' : 'var(--app-text)',
    fontSize: 12, cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
  }),
  // Table cells. Every admin table uses these so columns line up the same way everywhere.
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13, tableLayout: 'auto' },
  th: {
    padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
    textTransform: 'uppercase', color: 'var(--app-muted)', background: 'var(--app-panel)',
    borderBottom: '1px solid var(--app-border)', whiteSpace: 'nowrap', verticalAlign: 'middle',
  },
  td: {
    padding: '10px 16px', textAlign: 'left', color: 'var(--app-text)',
    borderBottom: '1px solid var(--app-border)', verticalAlign: 'middle',
  },
  mono: { fontFamily: 'var(--mono, monospace)', fontSize: 12, color: 'var(--app-muted)', whiteSpace: 'nowrap' },
  comingSoon: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', minHeight: 320, gap: 12, color: 'var(--app-muted)', textAlign: 'center',
  },
};


export const c = {
  text: 'var(--app-text)',
  muted: 'var(--app-muted)',
  border: 'var(--app-border)',
  card: 'var(--app-card)',
  panel: 'var(--app-panel)',
  accent: 'var(--app-accent)',
  accentBg: 'var(--app-accent-bg)',
  accentSoft: 'var(--app-accent-soft)',
  shadowLg: 'var(--app-shadow-lg)',
  rowAlt: 'rgba(148, 163, 184, 0.08)',
  overlay: 'rgba(15, 23, 42, 0.16)',
  danger: 'var(--app-danger)',
  dangerBg: 'var(--app-danger-bg)',
  dangerBorder: 'var(--app-danger-border)',
  info: 'var(--app-info)',
  infoBg: 'var(--app-info-bg)',
  infoBorder: 'var(--app-info-border)',
  warning: 'var(--app-warning)',
  warningBg: 'var(--app-warning-bg)',
  warningBorder: 'var(--app-warning-border)',
  purple: '#a855f7',
  purpleBg: 'rgba(168, 85, 247, 0.10)',
  purpleBorder: 'rgba(168, 85, 247, 0.26)',
};


export function fmtGrade(value) {
  if (value === '' || value == null) return '';
  const n = Number(value);
  return Number.isNaN(n) ? value : n.toFixed(2);
}


export function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = '';
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"' && quoted && next === '"') {
      value += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      row.push(value.trim());
      value = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') i += 1;
      row.push(value.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      value = '';
    } else {
      value += char;
    }
  }

  row.push(value.trim());
  if (row.some(Boolean)) rows.push(row);
  if (rows.length < 2) return [];

  const headers = rows[0].map((header) => header.toLowerCase().replace(/\s+/g, '_'));
  return rows.slice(1).map((cells, index) => ({
    rowNumber: index + 2,
    ...headers.reduce((record, header, column) => ({ ...record, [header]: cells[column] || '' }), {}),
  }));
}


// Rows for one page (1-based) plus the page count, clamped so a shrinking list never shows an empty page.
export function paginate(rows, page, pageSize) {
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(Math.max(1, page), totalPages);
  return { current, totalPages, visible: rows.slice((current - 1) * pageSize, current * pageSize) };
}


// Turns an API error into one readable sentence (the API sends { detail }, { error } or { field: [messages] }).
export function apiErrorText(err) {
  const data = err?.response?.data;
  if (!data) return err?.message || 'Something went wrong.';
  if (typeof data.detail === 'string') return data.detail;
  if (typeof data.error === 'string') return data.error;
  const parts = Object.entries(data).map(([field, msgs]) => `${field.replace(/_/g, ' ')}: ${[].concat(msgs).join(' ')}`);
  return parts.length ? parts.join(String.fromCharCode(10)) : (err.message || 'Something went wrong.');
}


export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
