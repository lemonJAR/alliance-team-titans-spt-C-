import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  addCollege, addDegreeProgram, addDiscipline,
  fetchCollege, fetchProgram, fetchDiscipline,
  adminCreateTeacher, fetchTeachers,
  adminCreateStudent, fetchStudents,
  fetchSemesterLoads, addSemesterLoad,
  fetchTerms, createTerm, fetchOfferings, createOffering,
  fetchTeachers as fetchAllTeachers,
  getEnrollmentQueue, approveRejectEnrollments,
  fetchGrades, updateGrade, deleteGrade,
  fetchGradeReport, exportGradeReportCsv, exportGradeReportExcel,
  fetchAuditLogs, adminUpdateUser, adminDeleteUser,
  fetchNotifications,
} from '../controllers/adminController';
import { signOut } from '../controllers/authController';
import Logo from '../assets/Logo.png';

const s = {
  root: {
    display: 'flex', minHeight: '100vh',
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    background: 'var(--app-bg-gradient)', color: 'var(--app-text)',
  },
  sidebar: {
    width: 220, minHeight: '100vh', background: 'var(--app-card)',
    borderRight: '1px solid var(--app-border)', display: 'flex',
    flexDirection: 'column', padding: '28px 16px', gap: 6, flexShrink: 0,
  },
  sidebarFooter: {
    marginTop: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  logo: {
    fontFamily: 'monospace', fontSize: 16, color: 'var(--app-accent)',
    letterSpacing: '0.08em', marginBottom: 28, paddingLeft: 4,
    display: 'flex', alignItems: 'center', gap: 8,
  },
  logoImg: { width: 28, height: 28, objectFit: 'contain' },
  logoDot: {
    width: 8, height: 8, background: 'var(--app-accent)', borderRadius: '50%',
    boxShadow: '0 0 8px var(--app-accent)', flexShrink: 0,
  },
  navLabel: {
    fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', color: 'var(--app-muted)',
    textTransform: 'uppercase', padding: '0 10px', margin: '12px 0 4px',
  },
  pillBtn: (active) => ({
    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
    borderRadius: 50, border: active ? '1px solid var(--app-accent)' : '1px solid transparent',
    background: active ? 'var(--app-accent-bg)' : 'transparent',
    color: active ? 'var(--app-accent)' : 'var(--app-muted)', fontSize: 13.5, fontWeight: 500,
    cursor: 'pointer', textAlign: 'left', width: '100%', fontFamily: 'inherit',
    transition: 'all 0.18s',
  }),
  main: {
    flex: 1, overflowY: 'auto', padding: '24px 28px',
    display: 'flex', flexDirection: 'column', gap: 20,
  },
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
  danger: '#dc2626',
  dangerBg: 'rgba(220, 38, 38, 0.08)',
  dangerBorder: 'rgba(220, 38, 38, 0.24)',
  info: '#2563eb',
  infoBg: 'rgba(37, 99, 235, 0.08)',
  infoBorder: 'rgba(37, 99, 235, 0.24)',
  warning: '#d97706',
  warningBg: 'rgba(245, 158, 11, 0.10)',
  warningBorder: 'rgba(245, 158, 11, 0.26)',
  purple: '#a855f7',
  purpleBg: 'rgba(168, 85, 247, 0.10)',
  purpleBorder: 'rgba(168, 85, 247, 0.26)',
};


function PanelTitle({ children }) {
  return (
    <div style={s.panelTitle}>
      <span style={{ width: 6, height: 6, background: 'var(--app-accent)', borderRadius: '50%', opacity: 0.7, display: 'inline-block' }} />
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label style={s.label}>{label}</label>
      {children}
    </div>
  );
}

function SectionHeader({ title, right }) {
  return (
    <div style={{
      padding: '10px 20px', background: 'var(--app-accent-bg)', borderBottom: '1px solid var(--app-border)',
      fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
      color: 'var(--app-accent)', display: 'flex', alignItems: 'center', gap: 6,
    }}>
      <span style={{ width: 6, height: 6, background: 'var(--app-accent)', borderRadius: '50%', display: 'inline-block' }} />
      {title}
      {right && <span style={{ marginLeft: 'auto', fontWeight: 400, color: 'var(--app-muted)', fontSize: 11 }}>{right}</span>}
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div style={{
      background: 'var(--app-panel)', border: '1px solid var(--app-border)', borderRadius: 8,
      padding: '12px 16px', minWidth: 120, display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--app-muted)' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--app-text)' }}>{value ?? '--'}</div>
    </div>
  );
}

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


function SchoolTab() {
  const [colleges,      setColleges]      = useState([]);
  const [programs,      setPrograms]      = useState([]);
  const [semLoads,      setSemLoads]      = useState([]);
  const [prereqOptions, setPrereqOptions] = useState([]);

  const [col,     setCol]     = useState({ name: '', code: '' });
  const [prog,    setProg]    = useState({ college: '', name: '', code: '' });
  const [disc,    setDisc]    = useState({ program: '', name: '', code: '', year_level: '1', semester: '1', units: '3', prerequisites: [] });
  const [semload, setSemload] = useState({ program: '', year_level: '1', semester: '1', max_units: '27' });
  const [loadFilter, setLoadFilter] = useState('');

useEffect(() => {
  Promise.all([loadColleges(), loadPrograms(), loadSemLoads()]);
}, []);

  useEffect(() => {
    if (!disc.program) { setPrereqOptions([]); return; }
    fetchDiscipline(disc.program)
      .then(({ data }) => setPrereqOptions(data))
      .catch(console.error);
  }, [disc.program]);

  async function loadColleges() {
    try { const { data } = await fetchCollege(); setColleges(data); } catch (e) { console.error(e); }
  }
  async function loadPrograms() {
    try { const { data } = await fetchProgram(); setPrograms(data); } catch (e) { console.error(e); }
  }
  async function loadSemLoads() {
    try { const { data } = await fetchSemesterLoads(); setSemLoads(data); } catch (e) { console.error(e); }
  }

  async function handleAddCollege(e) {
    e.preventDefault();
    try {
      await addCollege({ name: col.name, code: col.code.toUpperCase() });
      alert(`OK: College "${col.name} (${col.code})" added.`);
      setCol({ name: '', code: '' }); loadColleges();
    } catch (err) { alert('Error: ' + (err.response?.data ? JSON.stringify(err.response.data) : err.message)); }
  }

  async function handleAddProgram(e) {
    e.preventDefault();
    try {
      await addDegreeProgram({ college: parseInt(prog.college), name: prog.name, code: prog.code.toUpperCase() });
      alert(`OK: Program "${prog.name} (${prog.code})" added.`);
      setProg({ college: '', name: '', code: '' }); loadPrograms();
    } catch (err) { alert('Error: ' + (err.response?.data ? JSON.stringify(err.response.data) : err.message)); }
  }

  async function handleAddDiscipline(e) {
    e.preventDefault();
    try {
      await addDiscipline({
        program:  parseInt(disc.program),
        name:     disc.name,
        code:     disc.code,
        year_level:    parseInt(disc.year_level),
        semester:      parseInt(disc.semester),
        units:         parseInt(disc.units),
        prerequisites: disc.prerequisites,
      });
      alert(`OK: Discipline "${disc.name}" added.`);
      setDisc({ program: disc.program, name: '', code: '', year_level: '1', semester: '1', units: '3', prerequisites: [] });
      fetchDiscipline(disc.program).then(({ data }) => setPrereqOptions(data)).catch(console.error);
    } catch (err) { alert('Error: ' + (err.response?.data ? JSON.stringify(err.response.data) : err.message)); }
  }

  async function handleAddSemLoad(e) {
    e.preventDefault();
    try {
      await addSemesterLoad({
        program:    parseInt(semload.program),
        year_level: parseInt(semload.year_level),
        semester:   parseInt(semload.semester),
        max_units:  parseInt(semload.max_units),
      });
      alert('OK: Semester load set.');
      setSemload({ program: '', year_level: '1', semester: '1', max_units: '27' });
      loadSemLoads();
    } catch (err) { alert('Error: ' + (err.response?.data ? JSON.stringify(err.response.data) : err.message)); }
  }

  const groupedLoads = semLoads.reduce((acc, sl) => {
    const key = `${sl.program_name} (${sl.program_code})`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(sl);
    return acc;
  }, {});

  const filteredLoadKeys = loadFilter
    ? Object.keys(groupedLoads).filter((k) => k === loadFilter)
    : Object.keys(groupedLoads);

  return (
    <>
      <div>
        <div style={s.pageTitle}>School Setup</div>
        <div style={s.pageSub}>Configure colleges, programs, disciplines, and semester unit loads.</div>
      </div>

      <div style={s.panels}>
        <div style={s.panel}>
          <PanelTitle>Add College</PanelTitle>
          <p style={s.hint}>Top-level unit, e.g. School of Computer Studies.</p>
          <form onSubmit={handleAddCollege} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Field label="College Name">
              <input style={s.input} type="text" placeholder="e.g. School of Engineering"
                value={col.name} onChange={(e) => setCol({ ...col, name: e.target.value })} required />
            </Field>
            <Field label="College Code">
              <input style={s.input} type="text" placeholder="e.g. SOE" maxLength={10}
                value={col.code} onChange={(e) => setCol({ ...col, code: e.target.value })} required />
            </Field>
            <button type="submit" style={s.submitBtn(false)}>Add College</button>
          </form>
        </div>

        <div style={s.panel}>
          <PanelTitle>Add Degree Program</PanelTitle>
          <p style={s.hint}>Programs belong to a college, e.g. BSCS under SCS.</p>
          <form onSubmit={handleAddProgram} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Field label="Select College">
              <select style={s.input} value={prog.college}
                onChange={(e) => setProg({ ...prog, college: e.target.value })} required>
                <option value="">-- Select College --</option>
                {colleges.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
              </select>
            </Field>
            <Field label="Program Name">
              <input style={s.input} type="text" placeholder="e.g. BS Computer Science"
                value={prog.name} onChange={(e) => setProg({ ...prog, name: e.target.value })} required />
            </Field>
            <Field label="Program Code">
              <input style={s.input} type="text" placeholder="e.g. BSCS" maxLength={10}
                value={prog.code} onChange={(e) => setProg({ ...prog, code: e.target.value })} required />
            </Field>
            <button type="submit" style={s.submitBtn(!prog.college)} disabled={!prog.college}>
              Add Degree Program
            </button>
          </form>
        </div>

        <div style={s.panel}>
          <PanelTitle>Add Discipline</PanelTitle>
          <p style={s.hint}>Set program, year, semester, units, and optional prerequisites.</p>
          <form onSubmit={handleAddDiscipline} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Field label="Degree Program">
              <select style={s.input} value={disc.program}
                onChange={(e) => setDisc({ ...disc, program: e.target.value, prerequisites: [] })} required>
                <option value="">-- Select Program --</option>
                {programs.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
              </select>
            </Field>
            <Field label="Discipline Name">
              <input style={s.input} type="text" placeholder="e.g. Web Development"
                value={disc.name} onChange={(e) => setDisc({ ...disc, name: e.target.value })} required />
            </Field>
            <Field label="Code">
              <input style={s.input} type="text" placeholder="e.g. CS101" maxLength={20}
                value={disc.code} onChange={(e) => setDisc({ ...disc, code: e.target.value.toUpperCase() })} required />
            </Field>
            <div style={{ display: 'flex', gap: 8 }}>
              <Field label="Year Level">
                <select style={s.input} value={disc.year_level}
                  onChange={(e) => setDisc({ ...disc, year_level: e.target.value })} required>
                  <option value="1">Year 1</option>
                  <option value="2">Year 2</option>
                  <option value="3">Year 3</option>
                  <option value="4">Year 4</option>
                </select>
              </Field>
              <Field label="Semester">
                <select style={s.input} value={disc.semester}
                  onChange={(e) => setDisc({ ...disc, semester: e.target.value })} required>
                  <option value="1">1st Sem</option>
                  <option value="2">2nd Sem</option>
                </select>
              </Field>
              <Field label="Units">
                <select style={s.input} value={disc.units}
                  onChange={(e) => setDisc({ ...disc, units: e.target.value })} required>
                  <option value="1">1 - Guidance/PE</option>
                  <option value="2">2 - Minor</option>
                  <option value="3">3 - Major</option>
                </select>
              </Field>
            </div>
            <Field label={`Prerequisites ${disc.prerequisites.length ? `(${disc.prerequisites.length} selected)` : '- optional'}`}>
              <MultiSelect
                options={prereqOptions}
                selected={disc.prerequisites}
                onChange={(val) => setDisc({ ...disc, prerequisites: val })}
                placeholder={disc.program ? 'No existing disciplines yet - add some first.' : 'Select a program first.'}
              />
            </Field>
            <button type="submit" style={s.submitBtn(!disc.program || !disc.name)} disabled={!disc.program || !disc.name}>
              Add Discipline
            </button>
          </form>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ ...s.panel, maxWidth: 300, flex: '0 0 300px' }}>
          <PanelTitle>Set Semester Load</PanelTitle>
          <p style={s.hint}>Define max units per semester per program. Caps student subject selection.</p>
          <form onSubmit={handleAddSemLoad} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Field label="Degree Program">
              <select style={s.input} value={semload.program}
                onChange={(e) => setSemload({ ...semload, program: e.target.value })} required>
                <option value="">-- Select Program --</option>
                {programs.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
              </select>
            </Field>
            <div style={{ display: 'flex', gap: 8 }}>
              <Field label="Year Level">
                <select style={s.input} value={semload.year_level}
                  onChange={(e) => setSemload({ ...semload, year_level: e.target.value })} required>
                  <option value="1">Year 1</option>
                  <option value="2">Year 2</option>
                  <option value="3">Year 3</option>
                  <option value="4">Year 4</option>
                </select>
              </Field>
              <Field label="Semester">
                <select style={s.input} value={semload.semester}
                  onChange={(e) => setSemload({ ...semload, semester: e.target.value })} required>
                  <option value="1">1st Sem</option>
                  <option value="2">2nd Sem</option>
                </select>
              </Field>
            </div>
            <Field label="Units">
              <select style={s.input} value={semload.max_units}
                onChange={(e) => setSemload({ ...semload, max_units: e.target.value })} required>
                <option value="15">15</option>
                <option value="18">18</option>
                <option value="21">21</option>
                <option value="24">24</option>
                <option value="27">27</option>
              </select>
            </Field>
            <button type="submit" style={s.submitBtn(!semload.program)} disabled={!semload.program}>
              Set Semester Load
            </button>
          </form>
        </div>

        <div style={{ flex: 1, minWidth: 320, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <PanelTitle>Semester Loads by Program</PanelTitle>
            <div style={{ marginLeft: 'auto' }}>
              <select style={{ ...s.input, width: 'auto', fontSize: 12, padding: '6px 10px' }}
                value={loadFilter} onChange={(e) => setLoadFilter(e.target.value)}>
                <option value="">All Programs</option>
                {Object.keys(groupedLoads).map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
          </div>

          {filteredLoadKeys.length === 0 && (
            <div style={{ ...s.comingSoon, minHeight: 140 }}>
              <div style={{ fontSize: 32, opacity: 0.3 }}>*</div>
              <div style={{ fontSize: 13, color: 'var(--app-muted)' }}>No semester loads configured yet.</div>
            </div>
          )}

          {filteredLoadKeys.map((progName) => (
            <div key={progName} style={{ ...s.panel, gap: 0, padding: 0, overflow: 'hidden' }}>
              <div style={{
                padding: '10px 18px', background: 'var(--app-accent-bg)', borderBottom: '1px solid var(--app-border)',
                fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                color: 'var(--app-accent)', display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <span style={{ width: 6, height: 6, background: 'var(--app-accent)', borderRadius: '50%', display: 'inline-block' }} />
                {progName}
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--app-panel)' }}>
                    {['Year', 'Semester', 'Units', 'Disciplines'].map((h) => (
                      <th key={h} style={{
                        padding: '8px 16px', textAlign: 'left', fontSize: 10, fontWeight: 600,
                        letterSpacing: '0.08em', textTransform: 'uppercase',
                        color: 'var(--app-muted)', borderBottom: '1px solid var(--app-border)',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {groupedLoads[progName]
                    .sort((a, b) => a.year_level - b.year_level || a.semester - b.semester)
                    .map((sl, i) => (
                      <tr key={sl.id} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(148, 163, 184, 0.08)', borderBottom: '1px solid var(--app-border)' }}>
                        <td style={{ padding: '10px 16px', color: 'var(--app-text)' }}>Year {sl.year_level}</td>
                        <td style={{ padding: '10px 16px', color: 'var(--app-muted)' }}>{sl.semester === 1 ? '1st Semester' : '2nd Semester'}</td>
                        <td style={{ padding: '10px 16px' }}>
                          <span style={{
                            background: 'var(--app-accent-bg)', border: '1px solid var(--app-accent)', color: 'var(--app-accent)',
                            borderRadius: 4, padding: '2px 10px', fontSize: 12, fontWeight: 600,
                          }}>{sl.max_units}</span>
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {sl.disciplines?.length > 0
                              ? sl.disciplines.map(d => (
                                  <span key={d.id} style={{
                                    background: 'var(--app-panel)', border: '1px solid var(--app-border)',
                                    color: 'var(--app-muted)', borderRadius: 4, padding: '2px 8px', fontSize: 11,
                                  }}>
                                    {d.code} - {d.name} <span style={{ color: 'var(--app-accent)' }}>({d.units}u)</span>
                                  </span>
                                ))
                              : <span style={{ color: 'var(--app-muted)', fontSize: 12 }}>No disciplines yet</span>
                            }
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
    </>
  );
}

function fmtGrade(value) {
  if (value === '' || value == null) return '';
  const n = Number(value);
  return Number.isNaN(n) ? value : n.toFixed(2);
}


function TeacherTab() {
  const emptyForm = {
    first_name: '', last_name: '', middle_name: '',
    email: '', employee_id: '', department: '', disciplines: [],
  };

  const [form, setForm]               = useState(emptyForm);
  const [colleges, setColleges]       = useState([]);
  const [disciplines, setDisciplines] = useState([]);
  const [teachers, setTeachers]       = useState([]);
  const [loading, setLoading]         = useState(false);
  const [filterDept, setFilterDept]   = useState('');

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  useEffect(() => {
    fetchCollege().then(({ data }) => setColleges(data)).catch(console.error);
    loadTeachers();
  }, []);

  useEffect(() => {
    if (!form.department) { setDisciplines([]); set('disciplines', []); return; }
    const load = async () => {
      try {
        const { data: progs } = await fetchProgram(form.department);
        const results = await Promise.all(progs.map((p) => fetchDiscipline(p.id)));
        setDisciplines(results.flatMap(({ data }) => data));
      } catch (e) { console.error(e); }
    };
    set('disciplines', []);
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
        department: parseInt(form.department), disciplines: form.disciplines,
      });
      alert(`OK: Teacher account created. Credentials sent to ${form.email}.`);
      setForm(emptyForm); setDisciplines([]); loadTeachers();
    } catch (err) {
      alert('Error: ' + (err.response?.data ? JSON.stringify(err.response.data) : err.message));
    } finally { setLoading(false); }
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
      <div>
        <div style={s.pageTitle}>Faculty Management</div>
        <div style={s.pageSub}>Create teacher accounts and view faculty assignments by department.</div>
      </div>

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ ...s.panel, maxWidth: 340, flex: '0 0 340px' }}>
          <PanelTitle>New Faculty Account</PanelTitle>
          <p style={s.hint}>A temporary password will be auto-generated and emailed to the teacher.</p>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', gap: 8 }}>
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
            <Field label={`Disciplines ${form.disciplines.length ? `(${form.disciplines.length} selected)` : ''}`}>
              <MultiSelect
                options={disciplines} selected={form.disciplines}
                onChange={(val) => set('disciplines', val)}
                placeholder={form.department ? 'No disciplines found.' : 'Select a department first.'}
              />
            </Field>
            <button type="submit" style={s.submitBtn(!form.department || loading)} disabled={!form.department || loading}>
              {loading ? 'Creating account...' : 'Create & Send Credentials'}
            </button>
          </form>
        </div>

        <div style={{ flex: '1 1 0', minWidth: 320, maxWidth: 1040, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <PanelTitle>Faculty by Department</PanelTitle>
            <div style={{ marginLeft: 'auto' }}>
              <select style={{ ...s.input, width: 'auto', fontSize: 12, padding: '6px 10px' }}
                value={filterDept} onChange={(e) => setFilterDept(e.target.value)}>
                <option value="">All Departments</option>
                {Object.keys(grouped).map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>

          {deptKeys.length === 0 && (
            <div style={{ ...s.comingSoon, minHeight: 180 }}>
              <div style={{ fontSize: 36, opacity: 0.3 }}>*</div>
              <div style={{ fontSize: 14, color: c.muted }}>No faculty added yet.</div>
            </div>
          )}

          {deptKeys.map((dept) => (
            <div key={dept} style={{ ...s.panel, gap: 0, padding: 0, overflow: 'hidden' }}>
              <div style={{
                padding: '10px 18px', background: c.accentBg, borderBottom: '1px solid var(--app-border)',
                fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                color: c.accent, display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <span style={{ width: 6, height: 6, background: c.accent, borderRadius: '50%', display: 'inline-block' }} />
                {dept}
                <span style={{ marginLeft: 'auto', fontWeight: 400, color: c.muted, fontSize: 11 }}>
                  {grouped[dept].length} {grouped[dept].length === 1 ? 'faculty' : 'faculty members'}
                </span>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--app-panel)' }}>
                    {['Name', 'Employee ID', 'Email', 'Disciplines'].map((h, index) => (
                      <th key={h} style={{
                        padding: '8px 16px', textAlign: index === 0 ? 'left' : 'center', fontSize: 10, fontWeight: 600,
                        letterSpacing: '0.08em', textTransform: 'uppercase',
                        color: c.muted, borderBottom: '1px solid var(--app-border)',
                      }}>{h}</th>
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
                          {t.disciplines?.length > 0
                            ? t.disciplines.map((d) => (
                                <span key={d} style={{
                                  background: c.accentBg, border: '1px solid var(--app-accent)',
                                  color: c.accent, borderRadius: 4, padding: '2px 7px', fontSize: 11,
                                }}>{d}</span>
                              ))
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
    </>
  );
}


function StudentTab() {
  const emptyForm = {
    first_name: '', last_name: '', middle_name: '',
    email: '', student_id: '', college: '', program: '', year_level: '1',
  };

  const [form, setForm]             = useState(emptyForm);
  const [colleges, setColleges]     = useState([]);
  const [programs, setPrograms]     = useState([]);
  const [students, setStudents]     = useState([]);
  const [loading, setLoading]       = useState(false);
  const [filterProg, setFilterProg] = useState('');
  const [expandedStudent, setExpandedStudent] = useState(null);

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  useEffect(() => {
    fetchCollege().then(({ data }) => setColleges(data)).catch(console.error);
    loadStudents();
  }, []);

  useEffect(() => {
    if (!form.college) { setPrograms([]); set('program', ''); return; }
    fetchProgram(form.college).then(({ data }) => setPrograms(data)).catch(console.error);
    set('program', '');
  }, [form.college]);

  async function loadStudents() {
    try { const { data } = await fetchStudents(); setStudents(data); } catch (e) { console.error(e); }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await adminCreateStudent({
        first_name: form.first_name, last_name: form.last_name, middle_name: form.middle_name,
        email: form.email, student_id: form.student_id,
        program: parseInt(form.program), year_level: parseInt(form.year_level),
      });
      alert(`OK: Student account created. Credentials sent to ${form.email}.`);
      setForm(emptyForm); setPrograms([]); loadStudents();
    } catch (err) {
      alert('Error: ' + (err.response?.data ? JSON.stringify(err.response.data) : err.message));
    } finally { setLoading(false); }
  }

  const grouped = students.reduce((acc, st) => {
    const key = st.program_name || 'Unassigned';
    if (!acc[key]) acc[key] = [];
    acc[key].push(st);
    return acc;
  }, {});

  const progKeys = filterProg
    ? Object.keys(grouped).filter((p) => p === filterProg)
    : Object.keys(grouped);

  const bySemester = (subjects) => subjects.reduce((acc, sub) => {
    const key = `${sub.year_level}-${sub.semester}`;
    if (!acc[key]) acc[key] = { year_level: sub.year_level, semester: sub.semester, items: [] };
    acc[key].items.push(sub);
    return acc;
  }, {});

  return (
    <>
      <div>
        <div style={s.pageTitle}>Student Enrollment</div>
        <div style={s.pageSub}>Create student accounts. Students select their own subjects after logging in.</div>
      </div>

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ ...s.panel, maxWidth: 340, flex: '0 0 340px' }}>
          <PanelTitle>New Student Account</PanelTitle>
          <p style={s.hint}>A temporary password will be emailed. Student selects subjects on first login.</p>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', gap: 8 }}>
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
            <Field label="Student ID">
              <input style={s.input} type="text" value={form.student_id}
                onChange={(e) => set('student_id', e.target.value)} required />
            </Field>
            <Field label="College">
              <select style={s.input} value={form.college}
                onChange={(e) => set('college', e.target.value)} required>
                <option value="">-- Select College --</option>
                {colleges.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
              </select>
            </Field>
            <Field label="Degree Program">
              <select style={s.input} value={form.program}
                onChange={(e) => set('program', e.target.value)} required disabled={!form.college}>
                <option value="">-- Select Program --</option>
                {programs.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
              </select>
            </Field>
            <Field label="Year Level">
              <select style={s.input} value={form.year_level}
                onChange={(e) => set('year_level', e.target.value)} required>
                <option value="1">1st Year</option>
                <option value="2">2nd Year</option>
                <option value="3">3rd Year</option>
                <option value="4">4th Year</option>
              </select>
            </Field>
            <button type="submit" style={s.submitBtn(!form.program || loading)} disabled={!form.program || loading}>
              {loading ? 'Creating...' : 'Create & Send Credentials'}
            </button>
          </form>
        </div>

        <div style={{ flex: '1 1 0', minWidth: 320, maxWidth: 1040, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <PanelTitle>Students by Program</PanelTitle>
            <div style={{ marginLeft: 'auto' }}>
              <select style={{ ...s.input, width: 'auto', fontSize: 12, padding: '6px 10px' }}
                value={filterProg} onChange={(e) => setFilterProg(e.target.value)}>
                <option value="">All Programs</option>
                {Object.keys(grouped).map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          {progKeys.length === 0 && (
            <div style={{ ...s.comingSoon, minHeight: 180 }}>
              <div style={{ fontSize: 36, opacity: 0.3 }}>*</div>
              <div style={{ fontSize: 14, color: c.muted }}>No students enrolled yet.</div>
            </div>
          )}

          {progKeys.map((prog) => (
            <div key={prog} style={{ ...s.panel, gap: 0, padding: 0, overflow: 'hidden' }}>
              <div style={{
                padding: '10px 18px', background: c.accentBg, borderBottom: '1px solid var(--app-border)',
                fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                color: c.accent, display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <span style={{ width: 6, height: 6, background: c.accent, borderRadius: '50%', display: 'inline-block' }} />
                {prog}
                <span style={{ marginLeft: 'auto', fontWeight: 400, color: c.muted, fontSize: 11 }}>
                  {grouped[prog].length} {grouped[prog].length === 1 ? 'student' : 'students'}
                </span>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--app-panel)' }}>
                    {['Name', 'Student ID', 'Email', 'Year', 'Enrolled', 'Subjects'].map((h, index) => (
                      <th key={h} style={{
                        padding: '8px 16px', textAlign: index === 0 ? 'left' : 'center', fontSize: 10, fontWeight: 600,
                        letterSpacing: '0.08em', textTransform: 'uppercase',
                        color: c.muted, borderBottom: '1px solid var(--app-border)',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {grouped[prog].map((st, i) => {
                    const isExpanded = expandedStudent === st.student_id;
                    const semGroups  = bySemester(st.enrolled_subjects || []);
                    const semKeys    = Object.keys(semGroups).sort();
                    return (
                      <React.Fragment key={st.student_id}>
                        <tr style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(148, 163, 184, 0.08)', borderBottom: isExpanded ? 'none' : '1px solid var(--app-border)' }}>
                          <td style={{ padding: '10px 16px', fontWeight: 500, color: c.text, textAlign: 'left' }}>{st.full_name}</td>
                          <td style={{ padding: '10px 16px', fontFamily: 'monospace', color: c.muted, fontSize: 12, textAlign: 'center' }}>{st.student_id}</td>
                          <td style={{ padding: '10px 16px', color: c.muted, fontSize: 12, textAlign: 'center' }}>{st.email}</td>
                          <td style={{ padding: '10px 16px', color: c.muted, fontSize: 12, textAlign: 'center' }}>Year {st.year_level}</td>
                          <td style={{ padding: '10px 16px', color: c.muted, fontSize: 12, textAlign: 'center' }}>
                            {st.date_joined ? new Date(st.date_joined).toLocaleDateString() : '-'}
                          </td>
                          <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                            <button onClick={() => setExpandedStudent(isExpanded ? null : st.student_id)} style={{
                              background: isExpanded ? c.accentBg : 'var(--app-panel)',
                              border: `1px solid ${isExpanded ? 'var(--app-accent)' : 'var(--app-border)'}`,
                              color: isExpanded ? c.accent : c.muted,
                              borderRadius: 5, padding: '3px 10px', fontSize: 11,
                              cursor: 'pointer', fontFamily: 'inherit',
                            }}>
                              {st.enrolled_subjects?.length || 0} subjects {isExpanded ? 'v' : '>'}
                            </button>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr style={{ background: 'var(--app-panel)', borderBottom: '1px solid var(--app-border)' }}>
                            <td colSpan={6} style={{ padding: '12px 24px 16px' }}>
                              {semKeys.length === 0
                                ? <span style={{ color: c.muted, fontSize: 12 }}>No subjects enrolled yet.</span>
                                : (
                                  <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                                    {semKeys.map((key) => {
                                      const { year_level, semester, items } = semGroups[key];
                                      return (
                                        <div key={key}>
                                          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: c.muted, marginBottom: 6 }}>
                                            Year {year_level} - Sem {semester}
                                          </div>
                                          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                            {items.map((sub) => (
                                              <span key={sub.id} style={{
                                                background: c.accentBg, border: '1px solid var(--app-accent)',
                                                color: c.accent, borderRadius: 4, padding: '3px 8px', fontSize: 11,
                                              }}>{sub.name}</span>
                                            ))}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}


function CreateTermModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    school_year: '', semester: '1', start_date: '', end_date: '', is_active: false,
  });
  const [loading, setLoading] = useState(false);

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await createTerm({
        school_year: form.school_year,
        semester:    parseInt(form.semester),
        start_date:  form.start_date,
        end_date:    form.end_date,
        is_active:   form.is_active,
      });
      onCreated();
      onClose();
    } catch (err) {
      alert('Error: ' + (err.response?.data ? JSON.stringify(err.response.data) : err.message));
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = form.school_year && form.start_date && form.end_date && !loading;

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: c.overlay,
          zIndex: 100, backdropFilter: 'blur(2px)',
        }}
      />
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 101,
        background: c.card, border: '1px solid var(--app-border)',
        borderRadius: 12, padding: 28, width: 400, maxWidth: '90vw',
        display: 'flex', flexDirection: 'column', gap: 16,
        boxShadow: c.shadowLg,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
            textTransform: 'uppercase', color: c.accent,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{ width: 6, height: 6, background: c.accent, borderRadius: '50%', display: 'inline-block' }} />
            New Academic Term
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: c.muted,
            fontSize: 18, cursor: 'pointer', lineHeight: 1,
          }}>x</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Field label="School Year">
            <input
              style={s.input} type="text"
              placeholder="e.g. 2024-2025"
              value={form.school_year}
              onChange={(e) => set('school_year', e.target.value)}
              required
            />
          </Field>

          <Field label="Semester">
            <select style={s.input} value={form.semester}
              onChange={(e) => set('semester', e.target.value)} required>
              <option value="1">1st Semester</option>
              <option value="2">2nd Semester</option>
            </select>
          </Field>

          <div style={{ display: 'flex', gap: 8 }}>
            <Field label="Start Date">
              <input style={s.input} type="date" value={form.start_date}
                onChange={(e) => set('start_date', e.target.value)} required />
            </Field>
            <Field label="End Date">
              <input style={s.input} type="date" value={form.end_date}
                onChange={(e) => set('end_date', e.target.value)} required />
            </Field>
          </div>

          <div
            onClick={() => set('is_active', !form.is_active)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px', borderRadius: 7, cursor: 'pointer',
              background: form.is_active ? c.accentBg : 'var(--app-panel)',
              border: `1px solid ${form.is_active ? 'var(--app-accent)' : 'var(--app-border)'}`,
              transition: 'all 0.15s',
            }}
          >
            <div style={{
              width: 32, height: 18, borderRadius: 9,
              background: form.is_active ? 'var(--app-accent)' : 'var(--app-border)',
              position: 'relative', transition: 'background 0.2s', flexShrink: 0,
            }}>
              <div style={{
                position: 'absolute', top: 2,
                left: form.is_active ? 16 : 2,
                width: 14, height: 14, borderRadius: '50%',
                background: form.is_active ? c.card : c.muted,
                transition: 'left 0.2s',
              }} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: form.is_active ? c.accent : c.muted }}>
                {form.is_active ? 'Active Term' : 'Inactive'}
              </div>
              <div style={{ fontSize: 11, color: c.muted }}>
                Setting as active will deactivate all other terms
              </div>
            </div>
          </div>

          <button type="submit" style={{ ...s.submitBtn(!canSubmit), marginTop: 4 }} disabled={!canSubmit}>
            {loading ? 'Creating...' : 'Create Term'}
          </button>
        </form>
      </div>
    </>
  );
}


const emptyOfferingForm = () => ({
  teacher: '', schedule: '', room: '', max_slots: '40',
});


const STATUS_COLORS = {
  PENDING:   { bg: 'var(--app-panel)', border: 'var(--app-border)',  color: 'var(--app-muted)' },
  APPROVED:  { bg: c.accentBg, border: 'var(--app-accent)',  color: c.accent },
  REJECTED:  { bg: c.dangerBg, border: c.dangerBorder,  color: c.danger },
  ENROLLED:  { bg: c.infoBg, border: c.infoBorder,  color: c.info },
  DROPPED:   { bg: c.warningBg, border: c.warningBorder,  color: c.warning },
  WITHDRAWN: { bg: c.purpleBg, border: c.purpleBorder,  color: c.purple },
};

function ApprovalQueue() {
  const [queue,         setQueue]         = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [selected,      setSelected]      = useState(new Set());
  const [submitting,    setSubmitting]    = useState(false);
  const [statusFilter,  setStatusFilter]  = useState('PENDING');
  const [expandedKey,   setExpandedKey]   = useState(null);

  useEffect(() => { loadQueue(); }, [statusFilter]);

  async function loadQueue() {
    setLoading(true);
    setSelected(new Set());
    try {
      const { data } = await getEnrollmentQueue(statusFilter);
      setQueue(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  // Group: year_level -> program -> "DISC_CODE - DISC_NAME" -> [enrollments]
  const grouped = queue.reduce((acc, enr) => {
    const yl   = enr.year_level ?? '?';
    const prog = enr.program    ?? 'Unknown';
    const disc = `${enr.discipline_code} - ${enr.discipline_name}`;
    if (!acc[yl])             acc[yl]             = {};
    if (!acc[yl][prog])       acc[yl][prog]       = {};
    if (!acc[yl][prog][disc]) acc[yl][prog][disc] = [];
    acc[yl][prog][disc].push(enr);
    return acc;
  }, {});

  const yearLevels = Object.keys(grouped).sort((a, b) => a - b);

  const toggleOne = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleGroup = (ids) => {
    const allSel = ids.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => allSel ? next.delete(id) : next.add(id));
      return next;
    });
  };

  async function handleAction(action) {
    if (!selected.size) return;
    setSubmitting(true);
    try {
      await approveRejectEnrollments([...selected], action);
      await loadQueue();
    } catch (err) {
      alert('Error: ' + (err.response?.data ? JSON.stringify(err.response.data) : err.message));
    } finally { setSubmitting(false); }
  }

  const isPending = statusFilter === 'PENDING';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 18, fontWeight: 600, color: c.text, letterSpacing: '-0.01em' }}>
          Enrollment Requests
        </div>

        {/* Status filter pills */}
        <div style={{ display: 'flex', gap: 6 }}>
          {['PENDING', 'APPROVED', 'REJECTED', 'ENROLLED'].map((st) => {
            const sc     = STATUS_COLORS[st];
            const active = statusFilter === st;
            return (
              <button key={st} onClick={() => setStatusFilter(st)} style={{
                background: active ? sc.bg : 'transparent',
                border:     `1px solid ${active ? sc.border : 'var(--app-border)'}`,
                color:      active ? sc.color : c.muted,
                borderRadius: 20, padding: '4px 12px',
                fontSize: 11, fontWeight: 600, letterSpacing: '0.06em',
                cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
              }}>
                {st}
              </button>
            );
          })}
        </div>

        {/* Bulk actions - PENDING only, when something is selected */}
        {isPending && selected.size > 0 && (
          <div style={{ display: 'flex', gap: 8, marginLeft: 'auto', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: c.muted }}>{selected.size} selected</span>
            <button onClick={() => handleAction('APPROVED')} disabled={submitting} style={{
              background: submitting ? 'var(--app-panel)' : c.accentBg,
              border:     `1px solid ${submitting ? 'var(--app-border)' : 'var(--app-accent)'}`,
              color:      submitting ? c.muted : c.accent,
              borderRadius: 7, padding: '7px 16px',
              fontSize: 12, fontWeight: 600,
              cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
            }}>
              {submitting ? 'Working...' : 'Approve'}
            </button>
            <button onClick={() => handleAction('REJECTED')} disabled={submitting} style={{
              background: submitting ? 'var(--app-panel)' : c.dangerBg,
              border:     `1px solid ${submitting ? 'var(--app-border)' : c.dangerBorder}`,
              color:      submitting ? c.muted : c.danger,
              borderRadius: 7, padding: '7px 16px',
              fontSize: 12, fontWeight: 600,
              cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
            }}>
              Reject
            </button>
          </div>
        )}

        <button
          onClick={loadQueue}
          title="Refresh"
          aria-label="Refresh"
          style={{
            marginLeft: (isPending && selected.size > 0) ? 0 : 'auto',
            background: 'transparent', border: '1px solid var(--app-border)',
            color: c.muted, borderRadius: 7, padding: '6px 10px',
            fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display: 'block'}}>
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0114.13-3.36L23 10" />
            <path d="M20.49 15a9 9 0 01-14.13 3.36L1 14" />
          </svg>
        </button>
      </div>

      {loading && (
        <div style={{ ...s.comingSoon, minHeight: 140 }}>
          <div style={{ fontSize: 13, color: c.muted }}>Loading...</div>
        </div>
      )}

      {!loading && queue.length === 0 && (
        <div style={{ ...s.comingSoon, minHeight: 160 }}>
          <div style={{ fontSize: 36, opacity: 0.25 }}>*</div>
          <div style={{ fontSize: 13, color: c.muted }}>
            No {statusFilter.toLowerCase()} enrollment requests.
          </div>
        </div>
      )}

      {!loading && yearLevels.map((yl) => (
        <div key={yl} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Year divider */}
          <div style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.14em',
            textTransform: 'uppercase', color: c.accent,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ width: 24, height: 1, background: 'var(--app-border)', display: 'inline-block' }} />
            Year {yl}
            <span style={{ flex: 1, height: 1, background: 'var(--app-border)', display: 'inline-block' }} />
          </div>

          {/* Programs */}
          {Object.entries(grouped[yl]).map(([prog, disciplines]) => {
            const groupKey   = `Y${yl}_${prog}`;
            const isExpanded = expandedKey === groupKey;
            const allIds     = Object.values(disciplines).flat().map((e) => e.id);
            const selCount   = allIds.filter((id) => selected.has(id)).length;
            const totalCount = allIds.length;

            return (
              <div key={prog} style={{ ...s.panel, gap: 0, padding: 0, overflow: 'hidden' }}>

                {/* Program header */}
                <div
                  onClick={() => setExpandedKey(isExpanded ? null : groupKey)}
                  style={{
                    padding: '11px 18px',
                    background: isExpanded ? c.accentBg : 'var(--app-card)',
                    borderBottom: isExpanded ? '1px solid var(--app-border)' : 'none',
                    display: 'flex', alignItems: 'center', gap: 10,
                    cursor: 'pointer', transition: 'background 0.15s',
                  }}
                >
                  <span style={{
                    background: 'var(--app-panel)', border: '1px solid var(--app-border)',
                    color: c.muted, borderRadius: 5,
                    padding: '3px 10px', fontSize: 11, fontFamily: 'monospace', flexShrink: 0,
                  }}>{prog}</span>

                  <span style={{ fontSize: 13, color: c.muted, flex: 1 }}>
                    {Object.keys(disciplines).length}{' '}
                    {Object.keys(disciplines).length === 1 ? 'discipline' : 'disciplines'}
                    <span style={{ color: c.muted, marginLeft: 6, fontSize: 12 }}>
                      - {totalCount} {totalCount === 1 ? 'request' : 'requests'}
                    </span>
                  </span>

                  {/* Select-all for group - PENDING only */}
                  {isPending && (
                    <div
                      onClick={(e) => { e.stopPropagation(); toggleGroup(allIds); }}
                      style={{
                        fontSize: 11,
                        color:      selCount === totalCount ? c.accent : c.muted,
                        border:     `1px solid ${selCount === totalCount ? 'var(--app-accent)' : 'var(--app-border)'}`,
                        background: selCount === totalCount ? c.accentBg : 'transparent',
                        borderRadius: 5, padding: '3px 10px',
                        cursor: 'pointer', flexShrink: 0,
                      }}
                    >
                      {selCount === totalCount ? 'All selected' : `Select all (${totalCount})`}
                    </div>
                  )}

                  <span style={{ color: c.muted, fontSize: 12, flexShrink: 0 }}>
                    {isExpanded ? 'v' : '>'}
                  </span>
                </div>

                {/* Expanded disciplines */}
                {isExpanded && (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {Object.entries(disciplines).map(([discLabel, enrollments], di) => {
                      const discIds    = enrollments.map((e) => e.id);
                      const allDiscSel = discIds.every((id) => selected.has(id));

                      return (
                        <div key={discLabel} style={{
                          borderTop: di > 0 ? '1px solid var(--app-border)' : 'none',
                        }}>
                          {/* Discipline sub-header */}
                          <div style={{
                            padding: '9px 20px', background: 'var(--app-panel)',
                            display: 'flex', alignItems: 'center', gap: 10,
                          }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: c.text, flex: 1 }}>
                              {discLabel}
                            </span>
                            <span style={{
                              fontSize: 11, color: c.muted,
                              background: 'var(--app-card)', border: '1px solid var(--app-border)',
                              borderRadius: 4, padding: '2px 8px',
                            }}>
                              {enrollments[0]?.units ?? '?'} units
                            </span>
                            <span style={{ fontSize: 11, color: c.muted }}>
                              {enrollments.length} {enrollments.length === 1 ? 'student' : 'students'}
                            </span>
                            {/* Select-all for discipline - PENDING only */}
                            {isPending && (
                              <div
                                onClick={() => toggleGroup(discIds)}
                                style={{
                                  fontSize: 10,
                                  color:      allDiscSel ? c.accent : c.muted,
                                  border:     `1px solid ${allDiscSel ? 'var(--app-accent)' : 'var(--app-border)'}`,
                                  background: allDiscSel ? c.accentBg : 'transparent',
                                  borderRadius: 4, padding: '2px 8px',
                                  cursor: 'pointer', flexShrink: 0,
                                }}
                              >
                                {allDiscSel ? 'Selected' : 'Select all'}
                              </div>
                            )}
                          </div>

                          {/* Student rows */}
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                            <tbody>
                              {enrollments.map((enr, i) => {
                                const isSel = selected.has(enr.id);
                                const sc    = STATUS_COLORS[enr.status] || STATUS_COLORS.PENDING;
                                return (
                                  <tr
                                    key={enr.id}
                                    onClick={() => isPending && toggleOne(enr.id)}
                                    style={{
                                      background: isSel
                                        ? c.accentSoft
                                        : i % 2 === 0 ? 'transparent' : c.rowAlt,
                                      borderBottom: '1px solid var(--app-border)',
                                      cursor: isPending ? 'pointer' : 'default',
                                      transition: 'background 0.1s',
                                    }}
                                  >
                                    {/* Checkbox - PENDING only */}
                                    {isPending && (
                                      <td style={{ width: 40, padding: '10px 0 10px 20px' }}>
                                        <div style={{
                                          width: 15, height: 15, borderRadius: 3, flexShrink: 0,
                                          border:     isSel ? '1px solid var(--app-accent)' : '1px solid var(--app-border)',
                                          background: isSel ? 'var(--app-accent)' : 'transparent',
                                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }}>
                                          {isSel && <span style={{ fontSize: 9, color: c.card, fontWeight: 700 }}>x</span>}
                                        </div>
                                      </td>
                                    )}

                                    <td style={{ padding: '10px 16px', fontWeight: 500, color: c.text }}>
                                      {enr.student_name}
                                    </td>
                                    <td style={{ padding: '10px 16px', fontFamily: 'monospace', color: c.muted, fontSize: 11 }}>
                                      {enr.student_id_no}
                                    </td>
                                    <td style={{ padding: '10px 16px', color: c.muted, fontSize: 11 }}>
                                      {enr.enrolled_at
                                        ? new Date(enr.enrolled_at).toLocaleDateString('en-PH', {
                                            month: 'short', day: 'numeric',
                                            hour: '2-digit', minute: '2-digit',
                                          })
                                        : '-'}
                                    </td>
                                    <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                                      <span style={{
                                        background: sc.bg, border: `1px solid ${sc.border}`,
                                        color: sc.color, borderRadius: 20,
                                        padding: '2px 10px', fontSize: 10, fontWeight: 600,
                                        letterSpacing: '0.05em',
                                      }}>
                                        {enr.status}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}


function OfferingsTab() {
  const [terms,     setTerms]     = useState([]);
  const [programs,  setPrograms]  = useState([]);
  const [teachers,  setTeachers]  = useState([]);

  const [selTerm,      setSelTerm]      = useState('');
  const [selProgram,   setSelProgram]   = useState('');
  const [selYearLevel, setSelYearLevel] = useState('');
  const [selSemester,  setSelSemester]  = useState('');

  const [disciplines, setDisciplines] = useState([]);
  const [offerings,   setOfferings]   = useState([]);
  const [expandedDisc, setExpandedDisc] = useState(null);
  const [forms,       setForms]       = useState({});
  const [submitting,  setSubmitting]  = useState({});
  const [showTermModal, setShowTermModal] = useState(false);

 useEffect(() => {
  Promise.all([
    loadTerms(),
    fetchProgram().then(({ data }) => setPrograms(data)).catch(console.error),
    fetchAllTeachers().then(({ data }) => setTeachers(data)).catch(console.error),
  ]);
}, []);

  function loadTerms() {
    return fetchTerms().then(({ data }) => {
      setTerms(data);
      const active = data.find((t) => t.is_active);
      if (active) setSelTerm(String(active.id));
    }).catch(console.error);
  }

  useEffect(() => {
    if (!selProgram || !selYearLevel || !selSemester) {
      setDisciplines([]);
      setOfferings([]);
      return;
    }
    fetchDiscipline(selProgram).then(({ data }) => {
      const filtered = data.filter(
        (d) =>
          String(d.year_level) === selYearLevel &&
          String(d.semester)   === selSemester,
      );
      setDisciplines(filtered);
      setForms((prev) => {
        const next = { ...prev };
        filtered.forEach((d) => {
          if (!next[d.id]) next[d.id] = emptyOfferingForm();
        });
        return next;
      });
    }).catch(console.error);
  }, [selProgram, selYearLevel, selSemester]);

  useEffect(() => {
    if (!selTerm || !selProgram || !selYearLevel || !selSemester) {
      setOfferings([]);
      return;
    }
    fetchOfferings({
      term:       selTerm,
      program:    selProgram,
      year_level: selYearLevel,
      semester:   selSemester,
    }).then(({ data }) => setOfferings(data)).catch(console.error);
  }, [selTerm, selProgram, selYearLevel, selSemester]);

  const offeringsForDisc = (discId) =>
    offerings.filter((o) => o.discipline === discId);

  const setForm = (discId, field, value) =>
    setForms((prev) => ({
      ...prev,
      [discId]: { ...prev[discId], [field]: value },
    }));

  async function handleAddOffering(e, discId) {
    e.preventDefault();
    const form = forms[discId];
    if (!selTerm) { alert('Select a term first.'); return; }

    setSubmitting((prev) => ({ ...prev, [discId]: true }));
    try {
      await createOffering({
        term:       parseInt(selTerm),
        discipline: discId,
        teacher:    form.teacher ? parseInt(form.teacher) : null,
        schedule:   form.schedule,
        room:       form.room,
        max_slots:  parseInt(form.max_slots),
      });
      setForms((prev) => ({ ...prev, [discId]: emptyOfferingForm() }));
      setExpandedDisc(null);
      const { data } = await fetchOfferings({
        term: selTerm, program: selProgram,
        year_level: selYearLevel, semester: selSemester,
      });
      setOfferings(data);
    } catch (err) {
      alert('Error: ' + (err.response?.data ? JSON.stringify(err.response.data) : err.message));
    } finally {
      setSubmitting((prev) => ({ ...prev, [discId]: false }));
    }
  }

  const filtersReady = selProgram && selYearLevel && selSemester;

  return (
    <>
      {showTermModal && (
        <CreateTermModal
          onClose={() => setShowTermModal(false)}
          onCreated={loadTerms}
        />
      )}

      <div>
        <div style={s.pageTitle}>Subject Offerings</div>
        <div style={s.pageSub}>
          Select a term, program, and semester - then add schedule offerings per discipline.
        </div>
        <div style={{ ...s.hint, marginTop: 8 }}>
          To assign an existing teacher, open a discipline card and use the Existing Teacher dropdown in the Add New Offering section.
        </div>
      </div>

      <div style={{
        ...s.panel,
        flex: '0 0 auto',
        flexDirection: 'row', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end', padding: '18px 24px',
      }}>
        <div style={{ minWidth: 200, flex: 1 }}>
          <label style={s.label}>Academic Term</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <select style={{ ...s.input, flex: 1 }} value={selTerm} onChange={(e) => setSelTerm(e.target.value)}>
              <option value="">-- Select Term --</option>
              {terms.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.school_year} - Sem {t.semester}{t.is_active ? ' (active)' : ''}
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowTermModal(true)}
              title="Create new term"
              style={{
                background: 'var(--app-panel)', border: '1px solid var(--app-border)',
                color: 'var(--app-accent)', borderRadius: 7,
                padding: '0 12px', fontSize: 18, cursor: 'pointer',
                flexShrink: 0, lineHeight: 1,
              }}
            >+</button>
          </div>
        </div>

        <div style={{ minWidth: 200, flex: 1 }}>
          <label style={s.label}>Degree Program</label>
          <select style={s.input} value={selProgram}
            onChange={(e) => { setSelProgram(e.target.value); setSelYearLevel(''); setSelSemester(''); setExpandedDisc(null); }}>
            <option value="">-- Select Program --</option>
            {programs.map((p) => (
              <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
            ))}
          </select>
        </div>

        <div style={{ minWidth: 120 }}>
          <label style={s.label}>Year Level</label>
          <select style={s.input} value={selYearLevel}
            onChange={(e) => { setSelYearLevel(e.target.value); setExpandedDisc(null); }}
            disabled={!selProgram}>
            <option value="">--</option>
            <option value="1">Year 1</option>
            <option value="2">Year 2</option>
            <option value="3">Year 3</option>
            <option value="4">Year 4</option>
          </select>
        </div>

        <div style={{ minWidth: 120 }}>
          <label style={s.label}>Semester</label>
          <select style={s.input} value={selSemester}
            onChange={(e) => { setSelSemester(e.target.value); setExpandedDisc(null); }}
            disabled={!selYearLevel}>
            <option value="">--</option>
            <option value="1">1st Sem</option>
            <option value="2">2nd Sem</option>
          </select>
        </div>
      </div>

      {!filtersReady && (
        <div style={{ ...s.comingSoon, minHeight: 220 }}>
          <div style={{ fontSize: 40, opacity: 0.25 }}>*</div>
          <div style={{ fontSize: 13, color: 'var(--app-muted)' }}>
            Select a program, year level, and semester to manage offerings.
          </div>
        </div>
      )}

      {filtersReady && disciplines.length === 0 && (
        <div style={{ ...s.comingSoon, minHeight: 160 }}>
          <div style={{ fontSize: 36, opacity: 0.25 }}>*</div>
          <div style={{ fontSize: 13, color: 'var(--app-muted)' }}>
            No disciplines found for this program / year / semester combo.
          </div>
        </div>
      )}

      {filtersReady && disciplines.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {disciplines.map((disc) => {
            const discOfferings = offeringsForDisc(disc.id);
            const isExpanded    = expandedDisc === disc.id;
            const form          = forms[disc.id] || emptyOfferingForm();
            const isSubmitting  = submitting[disc.id] || false;
            const canSubmit     = !!selTerm && !!form.schedule && !isSubmitting;

            return (
              <div key={disc.id} style={{ ...s.panel, gap: 0, padding: 0, overflow: 'visible' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '14px 20px',
                  background: isExpanded ? 'var(--app-panel)' : 'transparent',
                  borderBottom: isExpanded ? '1px solid var(--app-border)' : 'none',
                  cursor: 'pointer', transition: 'background 0.15s',
                }}
                  onClick={() => setExpandedDisc(isExpanded ? null : disc.id)}
                >
                  <span style={{
                    background: 'var(--app-panel)', border: '1px solid var(--app-border)',
                    color: 'var(--app-muted)', borderRadius: 5,
                    padding: '3px 10px', fontSize: 11, fontFamily: 'monospace', flexShrink: 0,
                  }}>{disc.code}</span>

                  <span style={{ fontWeight: 500, fontSize: 14, color: 'var(--app-text)', flex: 1 }}>
                    {disc.name}
                  </span>

                  <span style={{ fontSize: 12, color: 'var(--app-muted)', flexShrink: 0 }}>
                    {disc.units} {disc.units === 1 ? 'unit' : 'units'}
                  </span>

                  <span style={{
                    background: discOfferings.length > 0 ? 'var(--app-accent-bg)' : 'var(--app-panel)',
                    border: `1px solid ${discOfferings.length > 0 ? 'var(--app-accent)' : 'var(--app-border)'}`,
                    color: discOfferings.length > 0 ? 'var(--app-accent)' : 'var(--app-muted)',
                    borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600, flexShrink: 0,
                  }}>
                    {discOfferings.length} {discOfferings.length === 1 ? 'offering' : 'offerings'}
                  </span>

                  <span style={{ color: 'var(--app-muted)', fontSize: 12, flexShrink: 0 }}>
                    {isExpanded ? 'v' : '>'}
                  </span>
                </div>

                {isExpanded && (
                  <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {discOfferings.length > 0 && (
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                          <thead>
                            <tr style={{ background: 'var(--app-panel)' }}>
                              {['Offer Code', 'Teacher', 'Schedule', 'Room', 'Slots'].map((h) => (
                                <th key={h} style={{
                                  padding: '7px 14px', textAlign: 'left', fontSize: 10,
                                  fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
                                  color: 'var(--app-muted)', borderBottom: '1px solid var(--app-border)',
                                }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {discOfferings.map((o, i) => (
                              <tr key={o.id} style={{
                                background: i % 2 === 0 ? 'transparent' : 'rgba(148, 163, 184, 0.08)',
                                borderBottom: '1px solid var(--app-border)',
                              }}>
                                <td style={{ padding: '8px 14px', fontFamily: 'monospace', color: 'var(--app-accent)', fontSize: 12 }}>
                                  {o.offer_code}
                                </td>
                                <td style={{ padding: '8px 14px', color: 'var(--app-text)' }}>
                                  {o.teacher_name || <span style={{ color: 'var(--app-muted)' }}>-</span>}
                                </td>
                                <td style={{ padding: '8px 14px', color: 'var(--app-muted)' }}>{o.schedule}</td>
                                <td style={{ padding: '8px 14px', color: 'var(--app-muted)' }}>
                                  {o.room || <span style={{ color: 'var(--app-muted)' }}>-</span>}
                                </td>
                                <td style={{ padding: '8px 14px' }}>
                                  <span style={{
                                    color: o.available_slots > 0 ? 'var(--app-accent)' : c.danger,
                                    fontWeight: 600,
                                  }}>
                                    {o.current_slots}/{o.max_slots}
                                  </span>
                                  <span style={{ color: 'var(--app-muted)', fontSize: 11, marginLeft: 4 }}>
                                    ({o.available_slots} open)
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    <div style={{
                      background: 'var(--app-panel)', border: '1px solid var(--app-border)',
                      borderRadius: 8, padding: '16px 18px',
                    }}>
                      <div style={{
                        fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
                        textTransform: 'uppercase', color: 'var(--app-accent)', marginBottom: 14,
                        display: 'flex', alignItems: 'center', gap: 6,
                      }}>
                        <span style={{ width: 5, height: 5, background: 'var(--app-accent)', borderRadius: '50%', display: 'inline-block' }} />
                        Add New Offering
                        {!selTerm && (
                          <span style={{ color: c.danger, fontWeight: 400, fontSize: 10, marginLeft: 8 }}>
                            - select a term above first
                          </span>
                        )}
                      </div>

                      <form
                        onSubmit={(e) => handleAddOffering(e, disc.id)}
                        style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}
                      >
                        <div style={{ minWidth: 180, flex: 1 }}>
                          <label style={s.label}>Existing Teacher</label>
                          <select style={s.input} value={form.teacher}
                            onChange={(e) => setForm(disc.id, 'teacher', e.target.value)}>
                            <option value="">-- Select an existing teacher --</option>
                            {teachers.map((t) => (
                              <option key={t.id} value={t.id}>{t.full_name}</option>
                            ))}
                          </select>
                        </div>

                        <div style={{ minWidth: 180, flex: 2 }}>
                          <label style={s.label}>Schedule <span style={{ color: c.danger }}>*</span></label>
                          <input
                            style={s.input} type="text"
                            placeholder="e.g. MWF 7:30-9:00 AM"
                            value={form.schedule}
                            onChange={(e) => setForm(disc.id, 'schedule', e.target.value)}
                            required
                          />
                        </div>

                        <div style={{ minWidth: 120, flex: 1 }}>
                          <label style={s.label}>Room</label>
                          <input
                            style={s.input} type="text"
                            placeholder="e.g. SL-201"
                            value={form.room}
                            onChange={(e) => setForm(disc.id, 'room', e.target.value)}
                          />
                        </div>

                        <div style={{ minWidth: 90 }}>
                          <label style={s.label}>Max Slots</label>
                          <select style={s.input} value={form.max_slots}
                            onChange={(e) => setForm(disc.id, 'max_slots', e.target.value)}>
                            {[20, 25, 30, 35, 40, 45, 50].map((n) => (
                              <option key={n} value={n}>{n}</option>
                            ))}
                          </select>
                        </div>

                        <div style={{ flexShrink: 0, paddingTop: 2 }}>
                          <button
                            type="submit"
                            style={{
                              ...s.submitBtn(!canSubmit),
                              padding: '9px 20px',
                              minHeight: 38,
                              lineHeight: '20px',
                              whiteSpace: 'nowrap',
                            }}
                            disabled={!canSubmit}
                          >
                            {isSubmitting ? 'Adding...' : '+ Add Offering'}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div style={{
        height: 1,
        background: 'linear-gradient(to right, transparent, var(--app-border), transparent)',
        margin: '4px 0',
      }} />

      <ApprovalQueue />
    </>
  );
}


function UserManagementTab() {
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [userAccountTab, setUserAccountTab] = useState('faculty');

  async function reloadUsers() {
    const [tRes, sRes] = await Promise.all([fetchTeachers(), fetchStudents()]);
    setTeachers(tRes.data || []);
    setStudents(sRes.data || []);
  }

  useEffect(() => {
    reloadUsers()
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const normalize = (val) => (val || '').toString().toLowerCase();
  const matches = (row) => {
    const key = normalize(search);
    if (!key) return true;
    return [row.full_name, row.email, row.employee_id, row.student_id].some((v) => normalize(v).includes(key));
  };

  async function toggleActive(userId, isActive) {
    try {
      await adminUpdateUser(userId, { is_active: !isActive });
      await reloadUsers();
    } catch (err) {
      alert('Failed to update user: ' + (err.response?.data ? JSON.stringify(err.response.data) : err.message));
    }
  }

  async function editUser(row) {
    const parts = (row.full_name || '').trim().split(/\s+/).filter(Boolean);
    const defaultFirst = parts[0] || '';
    const defaultLast = parts.length > 1 ? parts[parts.length - 1] : '';
    const defaultMiddle = parts.length > 2 ? parts.slice(1, -1).join(' ') : '';

    setEditingUser({
      user_id: row.user_id,
      first_name: defaultFirst,
      middle_name: defaultMiddle,
      last_name: defaultLast,
      email: row.email || '',
    });
  }

  async function saveEditingUser(e) {
    e.preventDefault();
    if (!editingUser) return;

    if (!editingUser.first_name.trim() || !editingUser.last_name.trim() || !editingUser.email.trim()) {
      alert('First name, last name, and email are required.');
      return;
    }

    setEditSaving(true);
    try {
      await adminUpdateUser(editingUser.user_id, {
        first_name: editingUser.first_name.trim(),
        middle_name: editingUser.middle_name.trim(),
        last_name: editingUser.last_name.trim(),
        email: editingUser.email.trim(),
      });
      await reloadUsers();
      setEditingUser(null);
    } catch (err) {
      alert('Failed to update user: ' + (err.response?.data ? JSON.stringify(err.response.data) : err.message));
    } finally {
      setEditSaving(false);
    }
  }

  async function deleteUser(userId, label) {
    if (!confirm(`Delete ${label}? This will permanently remove the account and related profile data.`)) return;
    try {
      await adminDeleteUser(userId);
      await reloadUsers();
    } catch (err) {
      alert('Failed to delete user: ' + (err.response?.data ? JSON.stringify(err.response.data) : err.message));
    }
  }

  return (
    <>
      <div>
        <div style={s.pageTitle}>User Management</div>
        <div style={s.pageSub}>Search, activate, and manage faculty/student accounts.</div>
      </div>

      {editingUser && (
        <div style={{ ...s.panel, maxWidth: 420 }}>
          <PanelTitle>Edit User Account</PanelTitle>
          <p style={s.hint}>Update the account details here instead of using pop-up prompts.</p>
          <form onSubmit={saveEditingUser} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <Field label="First Name">
                <input
                  style={s.input}
                  type="text"
                  value={editingUser.first_name}
                  onChange={(e) => setEditingUser((prev) => ({ ...prev, first_name: e.target.value }))}
                  required
                />
              </Field>
              <Field label="Middle">
                <input
                  style={s.input}
                  type="text"
                  value={editingUser.middle_name}
                  onChange={(e) => setEditingUser((prev) => ({ ...prev, middle_name: e.target.value }))}
                />
              </Field>
            </div>
            <Field label="Last Name">
              <input
                style={s.input}
                type="text"
                value={editingUser.last_name}
                onChange={(e) => setEditingUser((prev) => ({ ...prev, last_name: e.target.value }))}
                required
              />
            </Field>
            <Field label="Email">
              <input
                style={s.input}
                type="email"
                value={editingUser.email}
                onChange={(e) => setEditingUser((prev) => ({ ...prev, email: e.target.value }))}
                required
              />
            </Field>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" style={s.submitBtn(editSaving)} disabled={editSaving}>
                {editSaving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                style={{ ...s.submitBtn(false), borderColor: 'var(--app-border)', color: 'var(--app-muted)' }}
                onClick={() => setEditingUser(null)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div style={s.comingSoon}>Loading users...</div>
      ) : (
        <div style={{ ...s.panel, padding: 0, overflow: 'hidden' }}>
          <div style={s.tabNav}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                style={s.tabButton(userAccountTab === 'faculty')}
                onClick={() => setUserAccountTab('faculty')}
              >
                Faculty Accounts
              </button>
              <button
                style={s.tabButton(userAccountTab === 'student')}
                onClick={() => setUserAccountTab('student')}
              >
                Student Accounts
              </button>
            </div>
            <div style={{ marginLeft: 'auto', minWidth: 240 }}>
              <input
                style={{ ...s.input, maxWidth: 280 }}
                placeholder="Search by name, email, or ID"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {userAccountTab === 'faculty' && (
            <div style={s.tabPanel}>
              {teachers.filter(matches).length === 0 ? (
                <div style={{ color: c.muted }}>No teachers found.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: 'var(--app-panel)' }}>
                      {['Name', 'Email', 'Employee ID', 'Department', 'Status', 'Action'].map((h) => (
                        <th
                          key={h}
                          style={h === 'Action' ? { ...(s.th || {}), paddingLeft: 24 } : s.th}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {teachers.filter(matches).map((t) => (
                      <tr key={t.id}>
                        <td style={s.td}>{t.full_name}</td>
                        <td style={s.td}>{t.email}</td>
                        <td style={s.td}>{t.employee_id}</td>
                        <td style={s.td}>{t.department || '--'}</td>
                        <td style={s.td}>{t.is_active ? 'Active' : 'Inactive'}</td>
                        <td style={{ ...(s.td || {}), paddingLeft: 24 }}>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <button
                              style={s.submitBtn(false)}
                              onClick={() => editUser(t)}
                            >
                              Edit
                            </button>
                            <button
                              style={s.submitBtn(false)}
                              onClick={() => toggleActive(t.user_id, t.is_active)}
                            >
                              {t.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              style={{ ...s.submitBtn(false), borderColor: c.danger, color: c.danger }}
                              onClick={() => deleteUser(t.user_id, `${t.full_name} (${t.email})`)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {userAccountTab === 'student' && (
            <div style={s.tabPanel}>
              {students.filter(matches).length === 0 ? (
                <div style={{ color: c.muted }}>No students found.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: 'var(--app-panel)' }}>
                      {['Name', 'Email', 'Student ID', 'Program', 'Status', 'Action'].map((h) => (
                        <th
                          key={h}
                          style={h === 'Action' ? { ...(s.th || {}), paddingLeft: 24 } : s.th}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {students.filter(matches).map((st) => (
                      <tr key={st.id}>
                        <td style={s.td}>{st.full_name}</td>
                        <td style={s.td}>{st.email}</td>
                        <td style={s.td}>{st.student_id}</td>
                        <td style={s.td}>{st.program_name || '--'}</td>
                        <td style={s.td}>{st.is_active ? 'Active' : 'Inactive'}</td>
                        <td style={{ ...(s.td || {}), paddingLeft: 24 }}>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <button
                              style={s.submitBtn(false)}
                              onClick={() => editUser(st)}
                            >
                              Edit
                            </button>
                            <button
                              style={s.submitBtn(false)}
                              onClick={() => toggleActive(st.user_id, st.is_active)}
                            >
                              {st.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              style={{ ...s.submitBtn(false), borderColor: c.danger, color: c.danger }}
                              onClick={() => deleteUser(st.user_id, `${st.full_name} (${st.email})`)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}


function GradeManagementTab() {
  const [filters, setFilters] = useState({ student: '', term: '', discipline: '', period: '' });
  const [disciplines, setDisciplines] = useState([]);
  const [termsList, setTermsList] = useState([]);
  const [grades, setGrades] = useState([]);
  const [lastParams, setLastParams] = useState(null);
  const [lastRespCount, setLastRespCount] = useState(null);
  const [lastRespFirst, setLastRespFirst] = useState(null);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [studentsList, setStudentsList] = useState([]);
  const [showStudentSuggestions, setShowStudentSuggestions] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState(null);

  useEffect(() => {
    fetchDiscipline().then(({ data }) => setDisciplines(data || [])).catch(console.error);
    fetchStudents().then(({ data }) => setStudentsList(data || [])).catch(console.error);
    fetchTerms().then(({ data }) => setTermsList(data || [])).catch(console.error);
  }, []);

  async function loadGrades() {
    setLoading(true);
    try {
      // Prefer selectedProfileId (from picker). Otherwise try to resolve typed student value.
      let studentParam = selectedProfileId ?? (filters.student || undefined);
      if (!selectedProfileId && filters.student) {
        try {
          const matched = (studentsList || []).find(s => String(s.student_id_no) === String(filters.student) || String(s.student_id) === String(filters.student) || String(s.id) === String(filters.student));
          if (matched) studentParam = matched.id;
        } catch (e) {
          console.error('Failed to resolve student id:', e);
        }
      }

      // Normalize term and discipline to numeric IDs when possible
      let termParam = undefined;
      if (filters.term) {
        const n = Number(filters.term);
        if (!isNaN(n)) termParam = n;
        else {
          const matched = (termsList || []).find(t => String(t.id) === String(filters.term) || String(t.label) === String(filters.term) || String(t.name) === String(filters.term));
          if (matched) termParam = matched.id;
        }
      }

      const paramsForRequest = {
        student: studentParam || undefined,
        term: termParam || undefined,
        discipline: filters.discipline ? parseInt(filters.discipline) : undefined,
        period: filters.period || undefined,
      };
      console.log('loadGrades - params:', paramsForRequest);
      setLastParams(paramsForRequest);
      const { data } = await fetchGrades(paramsForRequest);
      const mapped = (data || []).map((g) => ({
        ...g,
        prelim: fmtGrade(g.prelim ?? ''),
        midterm: fmtGrade(g.midterm ?? ''),
        finals: fmtGrade(g.finals ?? ''),
        remarks: g.remarks ?? '',
      }));
      setGrades(mapped);
      setLastRespCount(mapped.length);
      setLastRespFirst(mapped.length ? mapped[0] : null);
    } catch (err) {
      console.error('Failed to load grades', err);
      const status = err.response?.status;
      const body = err.response?.data;
      alert('Failed to load grades.' + (status ? ` Status ${status}.` : '') + (body ? ` Response: ${JSON.stringify(body)}` : ''));
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(row) {
    try {
      setSavingId(row.id);
      await updateGrade(row.id, {
        prelim: row.prelim === '' ? null : Number(row.prelim),
        midterm: row.midterm === '' ? null : Number(row.midterm),
        finals: row.finals === '' ? null : Number(row.finals),
        remarks: row.remarks,
      });
      await loadGrades();
    } catch (err) {
      const body = err.response?.data ? JSON.stringify(err.response.data) : err.message;
      alert('Failed to update grade. ' + body);
    } finally {
      setSavingId(null);
    }
  }

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewRow, setPreviewRow] = useState(null);

  function handlePreview(row) {
    const payload = {
      prelim: row.prelim === '' ? null : row.prelim,
      midterm: row.midterm === '' ? null : row.midterm,
      finals: row.finals === '' ? null : row.finals,
      remarks: row.remarks,
    };
    const updated = [];
    if (payload.prelim !== null) updated.push('Prelim');
    if (payload.midterm !== null) updated.push('Midterm');
    if (payload.finals !== null) updated.push('Finals');
    setPreviewRow({ row, payload, updated });
    setPreviewOpen(true);
  }

  async function confirmPreviewSave() {
    if (!previewRow) return;
    setPreviewOpen(false);
    // ensure numeric values when saving previewed payload
    const r = { ...previewRow.row };
    r.prelim = r.prelim === '' ? null : Number(r.prelim);
    r.midterm = r.midterm === '' ? null : Number(r.midterm);
    r.finals = r.finals === '' ? null : Number(r.finals);
    await handleSave(r);
    setPreviewRow(null);
  }
  async function handleDelete(row) {
    if (!confirm('Delete this grade entry?')) return;
    try {
      await deleteGrade(row.id);
      await loadGrades();
    } catch (err) {
      alert('Failed to delete grade.');
    }
  }

  return (
    <>
      <div>
        <div style={s.pageTitle}>Grade Overrides</div>
        <div style={s.pageSub}>Search and adjust grade entries as an administrator.</div>
      </div>

      <div style={{ ...s.panel, maxWidth: 520 }}>
        <PanelTitle>Search Filters</PanelTitle>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 100%' }}>
            <input
              style={s.input}
              placeholder="Student ID (school number)"
              value={filters.student}
              onChange={(e) => {
                setFilters({ ...filters, student: e.target.value });
                setSelectedProfileId(null);
                setShowStudentSuggestions(true);
              }}
              onFocus={() => setShowStudentSuggestions(true)}
              onBlur={() => setTimeout(() => setShowStudentSuggestions(false), 150)}
            />
            {showStudentSuggestions && filters.student && (
              <div style={{ position: 'absolute', left: 0, right: 0, zIndex: 50, background: 'var(--app-card)', border: '1px solid var(--app-border)', borderRadius: 6, maxHeight: 220, overflow: 'auto' }}>
                {(studentsList || []).filter(s => {
                  const q = (filters.student || '').toString().toLowerCase();
                  return q && (
                    (s.student_id_no && s.student_id_no.toString().toLowerCase().includes(q)) ||
                    (s.student_id && s.student_id.toString().toLowerCase().includes(q)) ||
                    ((s.first_name || s.last_name || s.full_name) && ((s.first_name || s.last_name || s.full_name).toString().toLowerCase().includes(q)))
                  );
                }).slice(0, 15).map((s) => (
                  <div
                    key={s.id}
                    onMouseDown={(ev) => { ev.preventDefault(); /* prevent blur */ }}
                    onClick={() => {
                      setFilters({ ...filters, student: s.student_id_no || s.student_id || String(s.id) });
                      setSelectedProfileId(s.id);
                      setShowStudentSuggestions(false);
                    }}
                    style={{ padding: '8px 10px', borderBottom: '1px solid var(--app-border)', cursor: 'pointer', display: 'flex', gap: 8, alignItems: 'center' }}
                  >
                    <div style={{ fontFamily: 'monospace', color: '#0f766e', minWidth: 110 }}>{s.student_id_no || s.student_id || s.id}</div>
                    <div style={{ color: 'var(--app-text)' }}>{s.full_name || `${s.first_name || ''} ${s.last_name || ''}`.trim()}</div>
                  </div>
                ))}
                {(studentsList || []).filter(s => {
                  const q = (filters.student || '').toString().toLowerCase();
                  return q && (
                    (s.student_id_no && s.student_id_no.toString().toLowerCase().includes(q)) ||
                    (s.student_id && s.student_id.toString().toLowerCase().includes(q)) ||
                    ((s.first_name || s.last_name || s.full_name) && ((s.first_name || s.last_name || s.full_name).toString().toLowerCase().includes(q)))
                  );
                }).length === 0 && (
                  <div style={{ padding: 10, color: 'var(--app-muted)' }}>No students found</div>
                )}
              </div>
            )}
          </div>
          <select
            style={s.input}
            value={filters.term}
            onChange={(e) => setFilters({ ...filters, term: e.target.value })}
          >
            <option value="">All Terms</option>
            {(termsList || []).map((t) => {
              const display = t.label || (t.year_start && t.year_end && t.semester ? `${t.year_start}-${t.year_end} - Sem ${t.semester}` : (t.name || t.id));
              return <option key={t.id} value={t.id}>{display}</option>;
            })}
          </select>

          <select
            style={s.input}
            value={filters.period}
            onChange={(e) => setFilters({ ...filters, period: e.target.value })}
          >
            <option value="">All Periods</option>
            <option value="prelim">Prelim</option>
            <option value="midterm">Midterm</option>
            <option value="finals">Finals</option>
          </select>
          <select
            style={s.input}
            value={filters.discipline}
            onChange={(e) => setFilters({ ...filters, discipline: e.target.value })}
          >
            <option value="">All Subjects</option>
            {disciplines.map((d) => (
              <option key={d.id} value={d.id}>{d.code} - {d.name}</option>
            ))}
          </select>
        </div>
        <div style={{ marginTop: 10 }}>
          <button style={{ ...s.submitBtn(false), width: '100%' }} onClick={loadGrades}>Search</button>
        </div>
      </div>

      {/* Removed debug text per user request */}

      {loading ? (
        <div style={s.comingSoon}>Loading grades...</div>
      ) : grades.length === 0 ? (
        <div style={s.comingSoon}>No grade records found.</div>
      ) : (
        <div style={{ ...s.panel, padding: 0, overflow: 'hidden' }}>
          <SectionHeader title="Grade Entries" />
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: 'var(--app-panel)' }}>
                {['Student', 'Subject', 'Term', 'Prelim', 'Midterm', 'Finals', 'Remarks', 'Action'].map((h) => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grades.map((row, idx) => (
                <tr key={row.id} style={{ background: idx % 2 === 0 ? 'transparent' : c.rowAlt }}>
                  <td style={s.td}>{row.student_name} ({row.student_id_no})</td>
                  <td style={s.td}>{row.discipline_code} - {row.discipline_name}</td>
                  <td style={s.td}>{row.term_label || row.term || '--'}</td>
                  <td style={s.td}>
                    <input
                      style={{ ...s.input, maxWidth: 96 }}
                      value={row.prelim ?? ''}
                      onChange={(e) => {
                        const copy = [...grades];
                        copy[idx].prelim = e.target.value;
                        setGrades(copy);
                      }}
                    />
                  </td>
                  <td style={s.td}>
                    <input
                      style={{ ...s.input, maxWidth: 96 }}
                      value={row.midterm ?? ''}
                      onChange={(e) => {
                        const copy = [...grades];
                        copy[idx].midterm = e.target.value;
                        setGrades(copy);
                      }}
                    />
                  </td>
                  <td style={s.td}>
                    <input
                      style={{ ...s.input, maxWidth: 96 }}
                      value={row.finals ?? ''}
                      onChange={(e) => {
                        const copy = [...grades];
                        copy[idx].finals = e.target.value;
                        setGrades(copy);
                      }}
                    />
                  </td>
                  <td style={s.td}>
                    <input
                      style={s.input}
                      value={row.remarks ?? ''}
                      onChange={(e) => {
                        const copy = [...grades];
                        copy[idx].remarks = e.target.value;
                        setGrades(copy);
                      }}
                    />
                  </td>
                  <td style={s.td}>
                    <button
                      style={s.submitBtn(savingId === row.id)}
                      disabled={savingId === row.id}
                      onClick={() => handleSave(row)}
                    >
                      {savingId === row.id ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      style={{ ...s.submitBtn(false), marginLeft: 8, background: 'transparent', borderColor: 'var(--app-border)', color: c.muted }}
                      onClick={() => handlePreview(row)}
                    >
                      Preview
                    </button>
                    <button
                      style={{ ...s.submitBtn(false), marginLeft: 8, borderColor: c.danger, color: c.danger }}
                      onClick={() => handleDelete(row)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {previewOpen && previewRow && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60 }}>
          <div style={{ width: 'min(800px, 96%)', maxHeight: '80vh', overflow: 'auto', background: 'var(--app-card)', border: '1px solid var(--app-border)', borderRadius: 12, padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--app-accent)' }}>Preview Grade Payload</div>
              {filters.period && (
                <div style={{ marginLeft: 12, fontSize: 12, color: 'var(--app-muted)' }}>
                  Period: {filters.period.charAt(0).toUpperCase() + filters.period.slice(1)}
                </div>
              )}
              {previewRow.updated && previewRow.updated.length > 0 && (
                <div style={{ marginLeft: 12, fontSize: 12, color: 'var(--app-muted)' }}>
                  Updating: {previewRow.updated.join(', ')}
                </div>
              )}
              <div style={{ marginLeft: 'auto' }}>
                <button onClick={() => setPreviewOpen(false)} style={{ ...s.submitBtn(false), background: 'transparent', borderColor: 'var(--app-border)', color: 'var(--app-muted)' }}>Close</button>
              </div>
            </div>
            <pre style={{ marginTop: 12, background: 'var(--app-panel)', border: '1px solid var(--app-border)', padding: 12, borderRadius: 6, fontSize: 12, overflowX: 'auto' }}>{JSON.stringify(previewRow.payload, null, 2)}</pre>
            <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
              <button onClick={confirmPreviewSave} style={{ ...s.submitBtn(false) }}>Confirm Save</button>
              <button onClick={() => setPreviewOpen(false)} style={{ ...s.submitBtn(false), background: 'transparent', borderColor: 'var(--app-border)', color: 'var(--app-muted)' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


function NotificationsTab() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  async function loadNotifications() {
    setLoading(true);
    try {
      const { data } = await fetchNotifications(showUnreadOnly ? { unread: '1' } : undefined);
      setNotifications(data || []);
    } catch (err) {
      alert('Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNotifications().catch(console.error);
  }, [showUnreadOnly]);

  return (
    <>
      <div>
        <div style={s.pageTitle}>Notifications</div>
        <div style={s.pageSub}>Recent system updates for admin actions, offerings, enrollment, and grades.</div>
      </div>

      <div style={{ ...s.panel, padding: 0, overflow: 'hidden' }}>
        <SectionHeader
          title="Recent Notifications"
          right={(
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <select
                style={{
                  ...s.input,
                  width: 'auto',
                  fontSize: 12,
                  padding: '6px 10px',
                }}
                value={showUnreadOnly ? 'unread' : 'all'}
                onChange={(e) => setShowUnreadOnly(e.target.value === 'unread')}
              >
                <option value="all">All</option>
                <option value="unread">Unread only</option>
              </select>
              <button
                style={{
                  ...s.submitBtn(false),
                  marginTop: 0,
                  padding: '6px 12px',
                  fontSize: 12,
                }}
                onClick={loadNotifications}
              >
                Refresh
              </button>
              <span style={{ color: 'var(--app-muted)', fontSize: 11 }}>
                {notifications.length} items
              </span>
            </div>
          )}
        />
        {loading ? (
          <div style={{ padding: 16, color: 'var(--app-muted)' }}>Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div style={{ padding: 16, color: 'var(--app-muted)' }}>No notifications found.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: 'var(--app-panel)' }}>
                {['Status', 'Recipient', 'Category', 'Title', 'Message', 'When'].map((h) => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {notifications.map((item) => (
                <tr key={item.id}>
                  <td style={s.td}>{item.is_read ? 'Read' : 'Unread'}</td>
                  <td style={s.td}>{item.recipient_email || '--'}</td>
                  <td style={s.td}>{item.category}</td>
                  <td style={s.td}>{item.title}</td>
                  <td style={s.td}>{item.message}</td>
                  <td style={s.td}>{new Date(item.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}


function ReportsTab() {
  const [filters, setFilters] = useState({ term: '', program: '', year_level: '', student: '', discipline: '' });
  const [report, setReport] = useState(null);
  const [programs, setPrograms] = useState([]);

  useEffect(() => {
    fetchProgram().then(({ data }) => setPrograms(data)).catch(console.error);
  }, []);

  async function loadReport() {
    const { data } = await fetchGradeReport(filters);
    setReport(data);
  }

  function handlePrint() {
    if (!report) return;

    const win = window.open('', '_blank', 'width=1100,height=800');
    if (!win) {
      alert('Popup blocked. Please allow popups to print the report.');
      return;
    }

    const rows = (report.results || []).map((row) => `
      <tr>
        <td>${row.student_id_no || row.student || '--'}</td>
        <td>${row.student_name || '--'}</td>
        <td>${row.discipline_code || '--'}</td>
        <td>${row.discipline_name || '--'}</td>
        <td>${row.term_label || row.term || '--'}</td>
        <td>${row.prelim ?? '--'}</td>
        <td>${row.midterm ?? '--'}</td>
        <td>${row.finals ?? '--'}</td>
        <td>${row.remarks || '--'}</td>
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

  async function handleExportExcel() {
    const res = await exportGradeReportExcel(filters);
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'grade_report.xlsx';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }

  function handleExportPdf() {
    if (!report) {
      alert('Generate a report first.');
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
        row.discipline_code || '--',
        row.discipline_name || '--',
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
      <div>
        <div style={s.pageTitle}>Reports</div>
        <div style={s.pageSub}>Generate grade summary reports and export files.</div>
      </div>

      <div style={{ ...s.panel, maxWidth: 520, flex: '0 0 auto' }}>
        <PanelTitle>Filters</PanelTitle>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            style={s.input}
            placeholder="Term ID"
            value={filters.term}
            onChange={(e) => setFilters({ ...filters, term: e.target.value })}
          />
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
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button style={s.submitBtn(false)} onClick={loadReport}>Generate</button>
          <button style={s.submitBtn(!report)} onClick={handleExportPdf} disabled={!report}>Export PDF</button>
          <button style={s.submitBtn(false)} onClick={handleExportCsv}>Export CSV</button>
          <button style={s.submitBtn(false)} onClick={handleExportExcel}>Export Excel</button>
          <button style={s.submitBtn(false)} onClick={handlePrint} disabled={!report}>Print Report</button>
        </div>
        <div style={{ marginTop: 8 }}>
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
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}>
              <span>More Filters</span>
              <span style={{ fontSize: 12, color: 'var(--app-border)' }}>▾</span>
            </summary>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
              <input
                style={s.input}
                placeholder="Student ID"
                value={filters.student}
                onChange={(e) => setFilters({ ...filters, student: e.target.value })}
              />
              <input
                style={s.input}
                placeholder="Discipline ID"
                value={filters.discipline}
                onChange={(e) => setFilters({ ...filters, discipline: e.target.value })}
              />
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
                      <td style={s.td}>{row.discipline_code} - {row.discipline_name}</td>
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


function AuditLogTab() {
  const [filters, setFilters] = useState({ action: '', email: '' });
  const [logs, setLogs] = useState([]);

  async function loadLogs() {
    const { data } = await fetchAuditLogs(filters);
    setLogs(data || []);
  }

  useEffect(() => {
    loadLogs().catch(console.error);
  }, []);

  return (
    <>
      <div>
        <div style={s.pageTitle}>Audit Logs</div>
        <div style={s.pageSub}>Track administrative actions and grade changes.</div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-start' }}>
        <div style={{ ...s.panel, flex: '0 0 320px', maxWidth: 320 }}>
          <PanelTitle>Search Logs</PanelTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input
              style={s.input}
              placeholder="Action"
              value={filters.action}
              onChange={(e) => setFilters({ ...filters, action: e.target.value })}
            />
            <input
              style={s.input}
              placeholder="User email"
              value={filters.email}
              onChange={(e) => setFilters({ ...filters, email: e.target.value })}
            />
          </div>
          <button style={{ ...s.submitBtn(false), marginTop: 10 }} onClick={loadLogs}>Search</button>
        </div>

  <div style={{ ...s.panel, flex: '1 1 520px', padding: 0, overflow: 'hidden', minWidth: 0 }}>
          <SectionHeader title="Recent Activity" />
          {logs.length === 0 ? (
            <div style={{ padding: 16, color: c.muted }}>No logs found.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: 'var(--app-panel)' }}>
                  {['Action', 'User', 'IP', 'When'].map((h) => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.slice(0, 200).map((log) => (
                  <tr key={log.id}>
                    <td style={s.td}>{log.action}</td>
                    <td style={s.td}>{log.user_email || '--'}</td>
                    <td style={s.td}>{log.ip_address || '--'}</td>
                    <td style={s.td}>{new Date(log.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}

//  Main component
const TABS = [
  { key: 'school',    label: 'School Setup',       icon: '🏫' },
  { key: 'teacher',   label: 'Add Teacher',        icon: '👨‍🏫' },
  { key: 'student',   label: 'Add Student',        icon: '🎓' },
  { key: 'offerings', label: 'Subject Offerings',  icon: '📅' },
  { key: 'users',     label: 'User Management',    icon: '🧑' },
  { key: 'grades',    label: 'Grade Overrides',    icon: '🧾' },
  { key: 'reports',   label: 'Reports',            icon: '📈' },
  { key: 'notifications', label: 'Notifications',  icon: '🔔' },
  { key: 'audit',     label: 'Audit Logs',         icon: '🕵️' },
];


export default function AdminHome() {
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('school');

  async function handleLogout() {
    try {
      await signOut();
    } catch (err) {
      console.warn('logout request failed, clearing local session anyway', err);
    } finally {
      navigate('/');
    }
  }

  return (
    <div style={s.root}>
      <div className={`dashboard-sidebar${sidebarCollapsed ? ' collapsed' : ''}`} style={{ ...s.sidebar, width: sidebarCollapsed ? 72 : 220 }}>
        <button type="button" aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} onClick={() => setSidebarCollapsed((value) => !value)} style={{ ...s.logo, justifyContent: sidebarCollapsed ? 'center' : 'flex-start', padding: sidebarCollapsed ? '10px 0' : '10px 14px', width: '100%', border: 0, background: 'transparent', cursor: 'pointer' }}>
          <img src={Logo} alt="Alliance Team Titans logo" style={s.logoImg} />
          {!sidebarCollapsed && <span>ADMIN PANEL</span>}
        </button>
        {!sidebarCollapsed && <div style={s.navLabel}>Management</div>}
        {TABS.map((tab) => (
          <button className="sidebar-nav-action" key={tab.key} title={tab.label} aria-label={tab.label} style={{ ...s.pillBtn(activeTab === tab.key), justifyContent: sidebarCollapsed ? 'center' : 'flex-start', padding: sidebarCollapsed ? '10px 0' : '10px 14px' }} onClick={() => setActiveTab(tab.key)}>
            <span style={{ fontSize: 15, width: 18, textAlign: 'center', flexShrink: 0 }}>{tab.icon}</span>
            {!sidebarCollapsed && tab.label}
          </button>
        ))}
        <div style={s.sidebarFooter}>
          <button className="sidebar-logout" title="Log out" aria-label="Log out" onClick={handleLogout} style={{ ...s.pillBtn(false), color: c.danger, border: `1px solid ${c.dangerBorder}`, justifyContent: sidebarCollapsed ? 'center' : 'flex-start', padding: sidebarCollapsed ? '10px 0' : '10px 14px' }}>
            <span style={{ fontSize: 14, width: 18, textAlign: 'center' }}>⏻</span>
            {!sidebarCollapsed && 'Log Out'}
          </button>
        </div>
      </div>
      <div style={s.main}>
        {activeTab === 'school'    && <SchoolTab />}
        {activeTab === 'teacher'   && <TeacherTab />}
        {activeTab === 'student'   && <StudentTab />}
        {activeTab === 'offerings' && <OfferingsTab />}
        {activeTab === 'users'     && <UserManagementTab />}
        {activeTab === 'grades'    && <GradeManagementTab />}
        {activeTab === 'reports'   && <ReportsTab />}
        {activeTab === 'notifications' && <NotificationsTab />}
        {activeTab === 'audit'     && <AuditLogTab />}
      </div>
    </div>
  );
}
