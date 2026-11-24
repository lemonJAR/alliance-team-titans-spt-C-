import React from 'react';

const s = {
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
  comingSoon: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', minHeight: 320, gap: 12, color: 'var(--app-muted)', textAlign: 'center',
  },
};


const c = {
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



function MultiSelect({ options, selected, onChange, placeholder, groupKey = 'program_name' }) {
  const toggle = (id) =>
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);

  const grouped = options.reduce((acc, opt) => {
    const key = opt[groupKey] || 'Other';
    if (!acc[key]) acc[key] = [];
    acc[key].push(opt);
    return acc;
  }, {});

  return (
    <div style={{
      background: 'var(--app-panel)', border: '1px solid var(--app-border)', borderRadius: 7,
      maxHeight: 200, overflowY: 'auto', padding: '4px 0',
    }}>
      {options.length === 0 && (
        <div style={{ padding: '10px 12px', fontSize: 12, color: 'var(--app-muted)' }}>{placeholder}</div>
      )}
      {Object.entries(grouped).map(([groupName, items]) => (
        <div key={groupName}>
          <div style={{
            padding: '5px 12px 3px', fontSize: 10, fontWeight: 700,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            color: 'var(--app-muted)', borderTop: '1px solid var(--app-border)',
          }}>{groupName}</div>
          {items.map((opt) => {
            const active = selected.includes(opt.id);
            return (
              <div key={opt.id} onClick={() => toggle(opt.id)} style={{
                padding: '7px 12px', cursor: 'pointer', fontSize: 13,
                display: 'flex', alignItems: 'center', gap: 8,
                background: active ? 'var(--app-accent-bg)' : 'transparent',
                color: active ? 'var(--app-accent)' : 'var(--app-text)', transition: 'background 0.12s',
              }}>
                <span style={{
                  width: 14, height: 14, borderRadius: 3, flexShrink: 0,
                  border: active ? '1px solid var(--app-accent)' : '1px solid var(--app-border)',
                  background: active ? 'var(--app-accent)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {active && <span style={{ fontSize: 9, color: 'var(--app-card)', fontWeight: 700 }}>x</span>}
                </span>
                {opt.name}
                {opt.year_level && opt.semester && (
                  <span style={{ fontSize: 10, color: 'var(--app-muted)', marginLeft: 'auto' }}>
                    Y{opt.year_level}S{opt.semester}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}



function fmtGrade(value) {
  if (value === '' || value == null) return '';
  const n = Number(value);
  return Number.isNaN(n) ? value : n.toFixed(2);
}


function parseCsv(text) {
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



function UserPagination({ page, totalPages, totalItems, pageSize, onPageChange, itemLabel = 'users' }) {
  const firstItem = (page - 1) * pageSize + 1;
  const lastItem = Math.min(page * pageSize, totalItems);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 12, marginTop: 16, paddingTop: 12,
      borderTop: '1px solid var(--app-border)', flexWrap: 'wrap',
    }}>
      <span style={{ fontSize: 12, color: c.muted }}>
        Showing {firstItem}-{lastItem} of {totalItems} {itemLabel}
      </span>
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            type="button"
            style={s.paginationButton(page === 1)}
            disabled={page === 1}
            onClick={() => onPageChange(page - 1)}
          >
            Previous
          </button>
          <span style={{ fontSize: 12, color: c.muted, minWidth: 72, textAlign: 'center' }}>
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            style={s.paginationButton(page === totalPages)}
            disabled={page === totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}


function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}



export { s, c, MultiSelect, fmtGrade, parseCsv, UserPagination, escapeHtml };