// Small UI pieces shared by the admin pages. Styles and helpers are in adminHelpers.js.
import { s, c } from './adminHelpers';

export function MultiSelect({ options, selected, onChange, placeholder, groupKey = 'program_name' }) {
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


export function UserPagination({ page, totalPages, totalItems, pageSize, onPageChange, itemLabel = 'users' }) {
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


// Shows ONE group (a college, program or department) at a time: Previous / dropdown / Next.
export function GroupPager({ groups, value, onChange, label = 'Group' }) {
  if (groups.length === 0) return null;
  const index = Math.max(0, groups.indexOf(value));
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <button type="button" style={s.paginationButton(index === 0)} disabled={index === 0}
        onClick={() => onChange(groups[index - 1])}>Previous</button>
      <select aria-label={label} style={{ ...s.input, width: 'auto', minWidth: 220, padding: '7px 12px', fontSize: 12.5 }}
        value={groups[index]} onChange={(e) => onChange(e.target.value)}>
        {groups.map((g) => <option key={g} value={g}>{g}</option>)}
      </select>
      <button type="button" style={s.paginationButton(index === groups.length - 1)} disabled={index === groups.length - 1}
        onClick={() => onChange(groups[index + 1])}>Next</button>
      <span style={{ fontSize: 12, color: 'var(--app-muted)' }}>{label} {index + 1} of {groups.length}</span>
    </div>
  );
}
