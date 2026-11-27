import { useState, useEffect } from 'react';
import { notify } from '../../components/toastBus';
import { PageHeader } from '../../components/ui';
import { s, c, apiErrorText } from './adminHelpers';
import { useUrlState } from '../../hooks/useUrlState';
import {
  fetchProgram, fetchSubjects, fetchTerms, fetchOfferings, createOffering,
  fetchTeachers as fetchAllTeachers,
} from '../../controllers/adminController';
import { CreateTermModal } from './CreateTermModal';
import { ApprovalQueue } from './ApprovalQueue';

const emptyOfferingForm = () => ({
  teacher: '', schedule: '', room: '', max_slots: '40',
});




export function OfferingsTab() {
  const [terms,     setTerms]     = useState([]);
  const [programs,  setPrograms]  = useState([]);
  const [teachers,  setTeachers]  = useState([]);

  // Filters and the open sub-tab live in the URL so a refresh keeps the same view.
  const [selTerm,      setSelTerm]      = useUrlState('term', '');
  const [selProgram,   setSelProgram]   = useUrlState('oprogram', '');
  const [selYearLevel, setSelYearLevel] = useUrlState('year', '');
  const [selSemester,  setSelSemester]  = useUrlState('sem', '');

  const [subjects, setSubjects] = useState([]);
  const [offerings,   setOfferings]   = useState([]);
  const [expandedSubject, setExpandedSubject] = useState(null);
  const [activeOfferingTab, setActiveOfferingTab] = useUrlState('offer', 'offerings', ['offerings', 'requests']);
  const [forms,       setForms]       = useState({});
  const [submitting,  setSubmitting]  = useState({});
  const [showTermModal, setShowTermModal] = useState(false);

 useEffect(() => {
  Promise.all([
    loadTerms(),
    fetchProgram().then(({ data }) => setPrograms(data)).catch(console.error),
    fetchAllTeachers().then(({ data }) => setTeachers(data)).catch(console.error),
  ]);
  // Runs once when the tab opens; loadTerms is also called after a new term is created.
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

  function loadTerms() {
    return fetchTerms().then(({ data }) => {
      setTerms(data);
      // Default to the active term unless the URL already picked one.
      const active = data.find((t) => t.is_active);
      if (active && !new URLSearchParams(window.location.search).get('term')) setSelTerm(String(active.id));
    }).catch(console.error);
  }

  useEffect(() => {
    if (!selProgram || !selYearLevel || !selSemester) {
      queueMicrotask(() => {
        setSubjects([]);
        setOfferings([]);
      });
      return;
    }
    fetchSubjects(selProgram).then(({ data }) => {
      const filtered = data.filter(
        (d) =>
          String(d.year_level) === selYearLevel &&
          String(d.semester)   === selSemester,
      );
      setSubjects(filtered);
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
      queueMicrotask(() => setOfferings([]));
      return;
    }
    fetchOfferings({
      term:       selTerm,
      program:    selProgram,
      year_level: selYearLevel,
      semester:   selSemester,
    }).then(({ data }) => setOfferings(data)).catch(console.error);
  }, [selTerm, selProgram, selYearLevel, selSemester]);

  const offeringsForSubject = (subjectId) =>
    offerings.filter((o) => o.subject === subjectId);

  const setForm = (subjectId, field, value) =>
    setForms((prev) => ({
      ...prev,
      [subjectId]: { ...prev[subjectId], [field]: value },
    }));

  async function handleAddOffering(e, subjectId) {
    e.preventDefault();
    const form = forms[subjectId];
    if (!selTerm) { notify('Select a term first.'); return; }

    setSubmitting((prev) => ({ ...prev, [subjectId]: true }));
    try {
      await createOffering({
        term:       parseInt(selTerm),
        subject: subjectId,
        teacher:    form.teacher ? parseInt(form.teacher) : null,
        schedule:   form.schedule,
        room:       form.room,
        max_slots:  parseInt(form.max_slots),
      });
      setForms((prev) => ({ ...prev, [subjectId]: emptyOfferingForm() }));
      setExpandedSubject(null);
      const { data } = await fetchOfferings({
        term: selTerm, program: selProgram,
        year_level: selYearLevel, semester: selSemester,
      });
      setOfferings(data);
    } catch (err) {
      notify('Error: ' + apiErrorText(err));
    } finally {
      setSubmitting((prev) => ({ ...prev, [subjectId]: false }));
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

      <PageHeader title="Subject Offerings" subtitle="
          Set the academic context, then manage offerings by subject.
        " />

      <div style={{ ...s.panel, padding: 0, overflow: 'hidden' }}>
        <div style={s.tabNav}>
          {[
            { key: 'offerings', label: 'Subject Offerings' },
            { key: 'requests', label: 'Enrollment Requests' },
          ].map((tab) => (
            <button key={tab.key} type="button" onClick={() => setActiveOfferingTab(tab.key)} style={s.tabButton(activeOfferingTab === tab.key)}>
              {tab.label}
            </button>
          ))}
        </div>

        {activeOfferingTab === 'offerings' && (
          <div style={{ ...s.tabPanel, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{
        ...s.panel,
        flex: '0 0 auto',
        flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end', padding: '16px 20px',
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
            onChange={(e) => { setSelProgram(e.target.value); setSelYearLevel(''); setSelSemester(''); setExpandedSubject(null); }}>
            <option value="">-- Select Program --</option>
            {programs.map((p) => (
              <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
            ))}
          </select>
        </div>

        <div style={{ minWidth: 120 }}>
          <label style={s.label}>Year Level</label>
          <select style={s.input} value={selYearLevel}
            onChange={(e) => { setSelYearLevel(e.target.value); setExpandedSubject(null); }}
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
            onChange={(e) => { setSelSemester(e.target.value); setExpandedSubject(null); }}
            disabled={!selYearLevel}>
            <option value="">--</option>
            <option value="1">1st Sem</option>
            <option value="2">2nd Sem</option>
          </select>
        </div>
      </div>

      {!filtersReady && (
        <div style={{ ...s.comingSoon, minHeight: 120 }}>
          <div style={{ fontSize: 32, opacity: 0.25 }}>*</div>
          <div style={{ fontSize: 13, color: 'var(--app-muted)' }}>
            Choose a program, year level, and semester to continue.
          </div>
        </div>
      )}

      {filtersReady && subjects.length === 0 && (
        <div style={{ ...s.comingSoon, minHeight: 120 }}>
          <div style={{ fontSize: 36, opacity: 0.25 }}>*</div>
          <div style={{ fontSize: 13, color: 'var(--app-muted)' }}>
            No subjects found for this program / year / semester combination.
          </div>
        </div>
      )}

      {filtersReady && subjects.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {subjects.map((subject) => {
            const subjectOfferings = offeringsForSubject(subject.id);
            const isExpanded    = expandedSubject === subject.id;
            const form          = forms[subject.id] || emptyOfferingForm();
            const isSubmitting  = submitting[subject.id] || false;
            const canSubmit     = !!selTerm && !!form.schedule && !isSubmitting;

            return (
              <div key={subject.id} style={{ ...s.panel, gap: 0, padding: 0, overflow: 'visible' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '14px 20px',
                  background: isExpanded ? 'var(--app-panel)' : 'transparent',
                  borderBottom: isExpanded ? '1px solid var(--app-border)' : 'none',
                  cursor: 'pointer', transition: 'background 0.15s',
                }}
                  onClick={() => setExpandedSubject(isExpanded ? null : subject.id)}
                >
                  <span style={{
                    background: 'var(--app-panel)', border: '1px solid var(--app-border)',
                    color: 'var(--app-muted)', borderRadius: 5, width: 96, textAlign: 'center', boxSizing: 'border-box',
                    padding: '3px 8px', fontSize: 11, fontFamily: 'monospace', flexShrink: 0,
                  }}>{subject.code}</span>

                  <span style={{ fontWeight: 500, fontSize: 14, color: 'var(--app-text)', flex: 1 }}>
                    {subject.name}
                  </span>

                  <span style={{ fontSize: 12, color: 'var(--app-muted)', flexShrink: 0, width: 56, textAlign: 'right' }}>
                    {subject.units} {subject.units === 1 ? 'unit' : 'units'}
                  </span>

                  <span style={{
                    background: subjectOfferings.length > 0 ? 'var(--app-accent-bg)' : 'var(--app-panel)',
                    border: `1px solid ${subjectOfferings.length > 0 ? 'var(--app-accent)' : 'var(--app-border)'}`,
                    color: subjectOfferings.length > 0 ? 'var(--app-accent)' : 'var(--app-muted)',
                    borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600, flexShrink: 0,
                    width: 92, textAlign: 'center', boxSizing: 'border-box',
                  }}>
                    {subjectOfferings.length} {subjectOfferings.length === 1 ? 'offering' : 'offerings'}
                  </span>

                  <span style={{ color: 'var(--app-muted)', fontSize: 12, flexShrink: 0 }}>
                    {isExpanded ? 'v' : '>'}
                  </span>
                </div>

                {isExpanded && (
                  <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {subjectOfferings.length > 0 && (
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ ...s.table, tableLayout: 'fixed', fontSize: 12.5 }}>
                          <colgroup>
                            <col style={{ width: 150 }} /><col style={{ width: '22%' }} /><col /><col style={{ width: 110 }} /><col style={{ width: 140 }} />
                          </colgroup>
                          <thead>
                            <tr>
                              {['Offer Code', 'Teacher', 'Schedule', 'Room', 'Slots'].map((h) => <th key={h} style={s.th}>{h}</th>)}
                            </tr>
                          </thead>
                          <tbody>
                            {subjectOfferings.map((o) => (
                              <tr key={o.id}>
                                <td style={{ ...s.td, fontFamily: 'monospace', color: 'var(--app-accent)', whiteSpace: 'nowrap' }}>{o.offer_code}</td>
                                <td style={s.td}>{o.teacher_name || <span style={{ color: c.muted }}>Unassigned</span>}</td>
                                <td style={{ ...s.td, color: c.muted }}>{o.schedule}</td>
                                <td style={{ ...s.td, color: c.muted }}>{o.room || '-'}</td>
                                <td style={{ ...s.td, whiteSpace: 'nowrap' }}>
                                  <span style={{ color: o.available_slots > 0 ? 'var(--app-accent)' : c.danger, fontWeight: 600 }}>
                                    {o.current_slots}/{o.max_slots}
                                  </span>
                                  <span style={{ color: c.muted, fontSize: 11, marginLeft: 4 }}>({o.available_slots} open)</span>
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
                        onSubmit={(e) => handleAddOffering(e, subject.id)}
                        style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}
                      >
                        <div style={{ minWidth: 180, flex: 1 }}>
                          <label style={s.label}>Existing Teacher</label>
                          <select style={s.input} value={form.teacher}
                            onChange={(e) => setForm(subject.id, 'teacher', e.target.value)}>
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
                            onChange={(e) => setForm(subject.id, 'schedule', e.target.value)}
                            required
                          />
                        </div>

                        <div style={{ minWidth: 120, flex: 1 }}>
                          <label style={s.label}>Room</label>
                          <input
                            style={s.input} type="text"
                            placeholder="e.g. SL-201"
                            value={form.room}
                            onChange={(e) => setForm(subject.id, 'room', e.target.value)}
                          />
                        </div>

                        <div style={{ minWidth: 90 }}>
                          <label style={s.label}>Max Slots</label>
                          <select style={s.input} value={form.max_slots}
                            onChange={(e) => setForm(subject.id, 'max_slots', e.target.value)}>
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

          </div>
        )}

        {activeOfferingTab === 'requests' && (
          <div style={s.tabPanel}>
            <ApprovalQueue />
          </div>
        )}
      </div>
    </>
  );
}


