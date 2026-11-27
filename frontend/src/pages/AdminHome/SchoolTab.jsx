import { useState, useEffect } from 'react';
import { notify } from '../../components/toastBus';
import { PageHeader, PanelTitle, Field } from '../../components/ui';
import { s, c, apiErrorText } from './adminHelpers';
import { MultiSelect, GroupPager } from './AdminShared';
import { useUrlState } from '../../hooks/useUrlState';
import {
  addCollege, addDegreeProgram, addSubject,
  fetchCollege, fetchProgram, fetchSubjects,
  fetchSemesterLoads, addSemesterLoad,
} from '../../controllers/adminController';

const SETUP_SECTIONS = ['colleges', 'programs', 'subjects', 'loads'];

export function SchoolTab() {
  const [colleges,      setColleges]      = useState([]);
  const [programs,      setPrograms]      = useState([]);
  const [semLoads,      setSemLoads]      = useState([]);
  const [prereqOptions, setPrereqOptions] = useState([]);

  const [col,     setCol]     = useState({ name: '', code: '' });
  const [prog,    setProg]    = useState({ college: '', name: '', code: '' });
  const [subject, setSubject] = useState({ program: '', name: '', code: '', year_level: '1', semester: '1', units: '3', prerequisites: [] });
  const [semload, setSemload] = useState({ program: '', year_level: '1', semester: '1', max_units: '27' });
  const [setLoadOpen, setSetLoadOpen] = useState(false);
  // Both live in the URL so a refresh stays on the same section and college.
  const [setupSection, setSetupSection] = useUrlState('setup', 'colleges', SETUP_SECTIONS);
  const [loadCollege, setLoadCollege] = useUrlState('college', '');

useEffect(() => {
  Promise.all([loadColleges(), loadPrograms(), loadSemLoads()]);
}, []);

  useEffect(() => {
    if (!subject.program) { queueMicrotask(() => setPrereqOptions([])); return; }
    fetchSubjects(subject.program)
      .then(({ data }) => setPrereqOptions(data))
      .catch(console.error);
  }, [subject.program]);

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
      notify(`OK: College "${col.name} (${col.code})" added.`);
      setCol({ name: '', code: '' }); loadColleges();
    } catch (err) { notify('Error: ' + apiErrorText(err)); }
  }

  async function handleAddProgram(e) {
    e.preventDefault();
    try {
      await addDegreeProgram({ college: parseInt(prog.college), name: prog.name, code: prog.code.toUpperCase() });
      notify(`OK: Program "${prog.name} (${prog.code})" added.`);
      setProg({ college: '', name: '', code: '' }); loadPrograms();
    } catch (err) { notify('Error: ' + apiErrorText(err)); }
  }

  async function handleAddSubject(e) {
    e.preventDefault();
    try {
      await addSubject({
        program:  parseInt(subject.program),
        name:     subject.name,
        code:     subject.code,
        year_level:    parseInt(subject.year_level),
        semester:      parseInt(subject.semester),
        units:         parseInt(subject.units),
        prerequisites: subject.prerequisites,
      });
      notify(`OK: Subject "${subject.name}" added.`);
      setSubject({ program: subject.program, name: '', code: '', year_level: '1', semester: '1', units: '3', prerequisites: [] });
      fetchSubjects(subject.program).then(({ data }) => setPrereqOptions(data)).catch(console.error);
    } catch (err) { notify('Error: ' + apiErrorText(err)); }
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
      notify('OK: Semester load set.');
      setSemload({ program: '', year_level: '1', semester: '1', max_units: '27' });
      loadSemLoads();
    } catch (err) { notify('Error: ' + apiErrorText(err)); }
  }

  // Semester loads grouped college -> program. Only ONE college is shown at a time.
  const loadsByCollege = semLoads.reduce((acc, sl) => {
    const college = sl.college_name ? `${sl.college_name} (${sl.college_code})` : 'Unassigned';
    const program = `${sl.program_name} (${sl.program_code})`;
    acc[college] ??= {};
    (acc[college][program] ??= []).push(sl);
    return acc;
  }, {});
  const collegeKeys = Object.keys(loadsByCollege).sort();
  const currentCollege = collegeKeys.includes(loadCollege) ? loadCollege : collegeKeys[0];
  const programsInCollege = currentCollege ? loadsByCollege[currentCollege] : {};

  return (
    <>
      <PageHeader title="School Setup" subtitle="Build your academic structure one step at a time." />

      <div style={{ ...s.panel, padding: 0, overflow: 'hidden' }}>
        <div style={s.tabNav}>
          {[
            { key: 'colleges', label: `Colleges (${colleges.length})` },
            { key: 'programs', label: `Degree Programs (${programs.length})` },
            { key: 'subjects', label: 'Subjects' },
            { key: 'loads', label: `Semester Loads (${semLoads.length})` },
          ].map((tab) => (
            <button key={tab.key} type="button" onClick={() => setSetupSection(tab.key)} style={s.tabButton(setupSection === tab.key)}>
              {tab.label}
            </button>
          ))}
        </div>

        {['colleges', 'programs', 'subjects'].includes(setupSection) && (
      <div style={s.tabPanel}>
      <div style={s.panels}>
        {setupSection === 'colleges' && <div style={s.panel}>
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
        </div>}

        {setupSection === 'programs' && <div style={s.panel}>
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
        </div>}

        {setupSection === 'subjects' && <div style={s.panel}>
          <PanelTitle>Add Subject</PanelTitle>
          <p style={s.hint}>Set program, year, semester, units, and optional prerequisites.</p>
          <form onSubmit={handleAddSubject} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Field label="Degree Program">
              <select style={s.input} value={subject.program}
                onChange={(e) => setSubject({ ...subject, program: e.target.value, prerequisites: [] })} required>
                <option value="">-- Select Program --</option>
                {programs.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
              </select>
            </Field>
            <Field label="Subject Name">
              <input style={s.input} type="text" placeholder="e.g. Web Development"
                value={subject.name} onChange={(e) => setSubject({ ...subject, name: e.target.value })} required />
            </Field>
            <Field label="Code">
              <input style={s.input} type="text" placeholder="e.g. CS101" maxLength={20}
                value={subject.code} onChange={(e) => setSubject({ ...subject, code: e.target.value.toUpperCase() })} required />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
              <Field label="Year Level">
                <select style={s.input} value={subject.year_level}
                  onChange={(e) => setSubject({ ...subject, year_level: e.target.value })} required>
                  <option value="1">Year 1</option>
                  <option value="2">Year 2</option>
                  <option value="3">Year 3</option>
                  <option value="4">Year 4</option>
                </select>
              </Field>
              <Field label="Semester">
                <select style={s.input} value={subject.semester}
                  onChange={(e) => setSubject({ ...subject, semester: e.target.value })} required>
                  <option value="1">1st Sem</option>
                  <option value="2">2nd Sem</option>
                </select>
              </Field>
              <Field label="Units">
                <select style={s.input} value={subject.units}
                  onChange={(e) => setSubject({ ...subject, units: e.target.value })} required>
                  <option value="1">1 - Guidance/PE</option>
                  <option value="2">2 - Minor</option>
                  <option value="3">3 - Major</option>
                </select>
              </Field>
            </div>
            <Field label={`Prerequisites ${subject.prerequisites.length ? `(${subject.prerequisites.length} selected)` : '- optional'}`}>
              <MultiSelect
                options={prereqOptions}
                selected={subject.prerequisites}
                onChange={(val) => setSubject({ ...subject, prerequisites: val })}
                placeholder={subject.program ? 'No existing subjects yet - add some first.' : 'Select a program first.'}
              />
            </Field>
            <button type="submit" style={s.submitBtn(!subject.program || !subject.name)} disabled={!subject.program || !subject.name}>
              Add Subject
            </button>
          </form>
        </div>}
      </div>
      </div>
        )}

        {setupSection === 'loads' && (
        <div style={s.tabPanel}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'stretch' }}>
        <div style={{ ...s.panel, minWidth: 0 }}>
          <button
            type="button"
            onClick={() => setSetLoadOpen((open) => !open)}
            aria-expanded={setLoadOpen}
            style={{
              width: '100%',
              border: 'none',
              background: 'transparent',
              padding: 0,
              color: c.accent,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontFamily: 'inherit',
              textAlign: 'left',
            }}
          >
            <PanelTitle>Set Semester Load</PanelTitle>
            <span style={{ color: c.muted, fontSize: 16 }}>{setLoadOpen ? '⌃' : '⌄'}</span>
          </button>
          {setLoadOpen && (
            <>
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
            </>
          )}
        </div>

        <div style={{ ...s.panel, minWidth: 0, padding: 0, gap: 0, overflow: 'hidden' }}>
          <div style={{ padding: '10px 18px', background: 'var(--app-accent-bg)', borderBottom: '1px solid var(--app-border)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <PanelTitle>Semester Loads by College</PanelTitle>
            <div style={{ marginLeft: 'auto' }}>
              <GroupPager groups={collegeKeys} value={currentCollege} onChange={setLoadCollege} label="College" />
            </div>
          </div>

          {collegeKeys.length === 0 ? (
            <div style={{ ...s.comingSoon, minHeight: 240, padding: 24, boxSizing: 'border-box' }}>
              <div style={{ fontSize: 13, color: c.muted }}>No semester loads configured yet.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 16 }}>
              {Object.keys(programsInCollege).sort().map((progName) => (
                <div key={progName} style={{ border: '1px solid var(--app-border)', borderRadius: 10, overflow: 'hidden' }}>
                  <div style={{
                    padding: '10px 16px', borderBottom: '1px solid var(--app-border)',
                    fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                    color: c.accent, display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    {progName}
                    <span style={{ marginLeft: 'auto', fontWeight: 500, color: c.muted, textTransform: 'none', letterSpacing: 0 }}>
                      {programsInCollege[progName].length} semester {programsInCollege[progName].length === 1 ? 'load' : 'loads'}
                    </span>
                  </div>
                  <table style={s.table}>
                    <colgroup>
                      <col style={{ width: 110 }} /><col style={{ width: 150 }} /><col style={{ width: 100 }} /><col />
                    </colgroup>
                    <thead>
                      <tr>{['Year', 'Semester', 'Max Units', 'Subjects'].map((h) => <th key={h} style={s.th}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {[...programsInCollege[progName]]
                        .sort((a, b) => a.year_level - b.year_level || a.semester - b.semester)
                        .map((sl) => (
                          <tr key={sl.id}>
                            <td style={s.td}>Year {sl.year_level}</td>
                            <td style={{ ...s.td, color: c.muted }}>{sl.semester === 1 ? '1st Semester' : '2nd Semester'}</td>
                            <td style={s.td}>
                              <span style={{
                                background: 'var(--app-accent-bg)', border: '1px solid var(--app-accent)', color: 'var(--app-accent)',
                                borderRadius: 4, padding: '2px 10px', fontSize: 12, fontWeight: 600,
                              }}>{sl.max_units}</span>
                            </td>
                            <td style={s.td}>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                {sl.subjects?.length > 0
                                  ? sl.subjects.map((sub) => (
                                      <span key={sub.id} style={{
                                        background: 'var(--app-panel)', border: '1px solid var(--app-border)',
                                        color: 'var(--app-muted)', borderRadius: 4, padding: '2px 8px', fontSize: 11,
                                      }}>
                                        {sub.code} - {sub.name} <span style={{ color: 'var(--app-accent)' }}>({sub.units}u)</span>
                                      </span>
                                    ))
                                  : <span style={{ color: 'var(--app-muted)', fontSize: 12 }}>No subjects yet</span>}
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </div>
          </div>
        </div>
        )}
      </div>
    </>
  );
}
