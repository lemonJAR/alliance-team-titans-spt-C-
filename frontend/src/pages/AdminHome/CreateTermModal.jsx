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
  fetchGradeReport, exportGradeReportCsv, exportGradeReportExcel,
  fetchAuditLogs, adminUpdateUser, adminDeleteUser, adminDeleteStudentRecord,
  fetchNotifications,
} from '../../controllers/adminController';

export function CreateTermModal({ onClose, onCreated }) {
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
      notify('Error: ' + (err.response?.data ? JSON.stringify(err.response.data) : err.message));
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

