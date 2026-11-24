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

export function UserManagementTab() {
  const USERS_PER_PAGE = 10;
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [userAccountTab, setUserAccountTab] = useState('faculty');
  const [userPage, setUserPage] = useState(1);

  async function reloadUsers() {
    const [tRes, sRes] = await Promise.all([fetchTeachers(), fetchStudents()]);
    setTeachers(tRes.data || []);
    setStudents(sRes.data || []);
  }

  useEffect(() => {
    queueMicrotask(() => {
      reloadUsers()
        .catch(console.error)
        .finally(() => setLoading(false));
    });
  }, []);

  const normalize = (val) => (val || '').toString().toLowerCase();
  const matches = (row) => {
    const key = normalize(search);
    if (!key) return true;
    return [row.full_name, row.email, row.employee_id, row.student_id].some((v) => normalize(v).includes(key));
  };
  const filteredTeachers = teachers.filter(matches);
  const filteredStudents = students.filter(matches);
  const activeUsers = userAccountTab === 'faculty' ? filteredTeachers : filteredStudents;
  const totalUserPages = Math.max(1, Math.ceil(activeUsers.length / USERS_PER_PAGE));
  const visibleUsers = activeUsers.slice((userPage - 1) * USERS_PER_PAGE, userPage * USERS_PER_PAGE);

  useEffect(() => {
    queueMicrotask(() => setUserPage(1));
  }, [userAccountTab, search]);

  useEffect(() => {
    queueMicrotask(() => setUserPage((page) => Math.min(page, totalUserPages)));
  }, [totalUserPages]);

  async function toggleActive(userId, isActive) {
    try {
      await adminUpdateUser(userId, { is_active: !isActive });
      await reloadUsers();
    } catch (err) {
      notify('Failed to update user: ' + (err.response?.data ? JSON.stringify(err.response.data) : err.message));
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
      notify('First name, last name, and email are required.');
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
      notify('Failed to update user: ' + (err.response?.data ? JSON.stringify(err.response.data) : err.message));
    } finally {
      setEditSaving(false);
    }
  }

  async function deleteUser(userId, label) {
    if (!await confirmDialog(`Delete ${label}? This will permanently remove the account and related profile data.`)) return;
    try {
      await adminDeleteUser(userId);
      await reloadUsers();
    } catch (err) {
      notify('Failed to delete user: ' + (err.response?.data ? JSON.stringify(err.response.data) : err.message));
    }
  }

  async function removeStudentId(row) {
    if (!await confirmDialog(`Remove the unregistered student ID ${row.student_id}? Nobody can sign up with it afterwards.`)) return;
    try {
      await adminDeleteStudentRecord(row.id);
      await reloadUsers();
    } catch (err) {
      notify('Failed to remove student ID: ' + (err.response?.data?.detail || err.message));
    }
  }

  return (
    <>
      {editingUser && (
        <div style={{ ...s.panel, maxWidth: 420 }}>
          <PanelTitle>Edit User Account</PanelTitle>
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
              {filteredTeachers.length === 0 ? (
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
                    {visibleUsers.map((t) => (
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
              {filteredTeachers.length > 0 && (
                <UserPagination
                  page={userPage}
                  totalPages={totalUserPages}
                  totalItems={filteredTeachers.length}
                  pageSize={USERS_PER_PAGE}
                  onPageChange={setUserPage}
                />
              )}
            </div>
          )}

          {userAccountTab === 'student' && (
            <div style={s.tabPanel}>
              {filteredStudents.length === 0 ? (
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
                    {visibleUsers.map((st) => (
                      <tr key={st.id}>
                        <td style={s.td}>{st.registered ? st.full_name : <em style={{ color: c.muted }}>Not registered yet</em>}</td>
                        <td style={s.td}>{st.registered ? st.email : '--'}</td>
                        <td style={s.td}>{st.student_id}</td>
                        <td style={s.td}>{st.program_name || '--'}</td>
                        <td style={s.td}>{!st.registered ? 'Not registered' : st.is_active ? 'Active' : 'Inactive'}</td>
                        <td style={{ ...(s.td || {}), paddingLeft: 24 }}>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {st.registered ? (
                              <>
                                <button style={s.submitBtn(false)} onClick={() => editUser(st)}>Edit</button>
                                <button style={s.submitBtn(false)} onClick={() => toggleActive(st.user_id, st.is_active)}>
                                  {st.is_active ? 'Deactivate' : 'Activate'}
                                </button>
                                <button
                                  style={{ ...s.submitBtn(false), borderColor: c.danger, color: c.danger }}
                                  onClick={() => deleteUser(st.user_id, `${st.full_name} (${st.email})`)}
                                >
                                  Delete account
                                </button>
                              </>
                            ) : (
                              <button
                                style={{ ...s.submitBtn(false), borderColor: c.danger, color: c.danger }}
                                onClick={() => removeStudentId(st)}
                              >
                                Remove ID
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {filteredStudents.length > 0 && (
                <UserPagination
                  page={userPage}
                  totalPages={totalUserPages}
                  totalItems={filteredStudents.length}
                  pageSize={USERS_PER_PAGE}
                  onPageChange={setUserPage}
                />
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}


