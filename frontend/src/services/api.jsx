import axios from "axios";
import { clearSession, getSession, saveSession } from "../models/authSession";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
});

api.interceptors.request.use((config) => {
  const token = getSession()?.token;
  if (token) config.headers.Authorization = `Bearer ${token}`;

  if (!(config.data instanceof FormData)) config.headers['Content-Type'] ??= 'application/json';
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      clearSession();
      if (window.location.pathname !== "/login") window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

// ── AUTH ──────────────────────────────────────────────────────────────────────
export const register            = (payload)       => api.post('/auth/register/', payload);
export const verifyEmail         = (token)         => api.get(`/auth/verify-email/${token}/`);
export const login               = async (payload) => {
  const { data } = await api.post('/auth/login/', payload);
  const session = saveSession({
    token: data.token || data.accessToken,
    user: data.user,
  });
  return { ...data, ...session };
};
export const logout              = async ()        => {
  await api.post('/auth/logout/');
  clearSession();
};
export const resendVerification  = (email)         => api.post('/auth/resend-verification/', { email });
export const verifyStudent       = (student_id)   => api.post('/auth/verify-student/', { student_id });
export const changePassword      = (payload)       => api.post('/auth/password/change/', payload);
export const requestPasswordReset = (email)        => api.post('/auth/password/forgot/', { email });
export const confirmPasswordReset = (token, new_password) => api.post('/auth/password/reset/', { token, new_password });

// ── USERS ─────────────────────────────────────────────────────────────────────
export const getMe               = ()              => api.get('/auth/me/');
export const updateMe            = (payload)       => api.patch('/auth/me/', payload);
export const updateFCMToken      = (fcmToken)      => api.patch('/auth/me/fcm-token/', { fcm_token: fcmToken });

// ── PROFILES ──────────────────────────────────────────────────────────────────
export const getStudentProfile    = ()        => api.get('/auth/profile/student/');
export const updateStudentProfile = (payload) => api.patch('/auth/profile/student/', payload);
export const getTeacherProfile    = ()        => api.get('/auth/profile/teacher/');
export const updateTeacherProfile = (payload) => api.patch('/auth/profile/teacher/', payload);
export const getAdminProfile      = ()        => api.get('/auth/profile/admin/');
export const updateAdminProfile   = (payload) => api.patch('/auth/profile/admin/', payload);

// ── SYSTEM: School setup ──────────────────────────────────────────────────────
export const addCollege               = (payload)   => api.post('/system/colleges/', payload);
export const fetchCollege             = ()          => api.get('/system/colleges/');
export const addDegreeProgram         = (payload)   => api.post('/system/programs/', payload);
export const fetchProgram             = (collegeId) => api.get(`/system/programs/?college=${collegeId || ''}`);
export const addDiscipline            = (payload)   => api.post('/system/disciplines/', payload);
export const fetchDiscipline          = (programId) => api.get(`/system/disciplines/?program=${programId || ''}`);
export const fetchDisciplineByCollege = (collegeId) => api.get(`/system/disciplines/?college=${collegeId || ''}`);
export const fetchSemesterLoads       = (programId) => api.get(`/system/semester-loads/?program=${programId || ''}`);
export const addSemesterLoad          = (payload)   => api.post('/system/semester-loads/', payload);

// ── SYSTEM: Academic Terms ────────────────────────────────────────────────────
export const fetchTerms   = ()            => api.get('/system/terms/');
export const createTerm   = (payload)     => api.post('/system/terms/', payload);
export const updateTerm   = (id, payload) => api.patch(`/system/terms/${id}/`, payload);

// ── SYSTEM: Offerings ─────────────────────────────────────────────────────────
export const fetchOfferings  = (params)  => api.get('/system/offerings/', { params });
export const createOffering  = (payload) => api.post('/system/offerings/', payload);

// Teacher endpoints
export const fetchTeacherOfferings = () => api.get('/system/teacher/offerings/');
export const fetchOfferingEnrollments = (offeringId) => api.get(`/system/teacher/offerings/${offeringId}/enrollments/`);

// ── SYSTEM: Enrollment (student) ─────────────────────────────────────────────
export const getMyProspectus         = ()               => api.get('/system/enrollment/request/');
export const submitDisciplineRequest = (discipline_ids) => api.post('/system/enrollment/request/', { discipline_ids });
export const getApprovedForSchedule  = ()               => api.get('/system/enrollment/schedule/');
export const selectSchedule          = (enrollment_id, offering_id) =>
  api.post('/system/enrollment/schedule/', { enrollment_id, offering_id });

// ── SYSTEM: Enrollment queue (admin) ─────────────────────────────────────────
export const getEnrollmentQueue       = (queueStatus)              => api.get('/system/enrollment/queue/', { params: { status: queueStatus } });
export const approveRejectEnrollments = (enrollment_ids, action)   => api.patch('/system/enrollment/queue/', { enrollment_ids, action });

// ── SYSTEM: Grades ────────────────────────────────────────────────────────────
export const getMyGrades   = ()              => api.get('/system/grades/mine/');
export const fetchGrades   = (params)        => api.get('/system/grades/', { params });
export const submitGrade   = (payload)       => api.post('/system/grades/', payload);
export const updateGrade   = (id, payload)   => api.patch(`/system/grades/${id}/`, payload);
export const deleteGrade   = (id)            => api.delete(`/system/grades/${id}/`);
export const exportMyGrades = () => api.get('/system/grades/export/', { responseType: 'blob' });
export const fetchGradeHistory = (gradeId) => api.get(`/system/grades/${gradeId}/history/`);
export const fetchGradeTimeline = (params) => api.get('/system/grades/timeline/', { params });

// ── SYSTEM: Reports (admin) ────────────────────────────────────────────────
export const fetchGradeReport = (params) => api.get('/system/reports/grades/', { params });
export const exportGradeReportCsv = (params) => api.get('/system/reports/grades/export/', { params, responseType: 'blob' });
export const exportGradeReportExcel = (params) => api.get('/system/reports/grades/export-xlsx/', { params, responseType: 'blob' });


// ── SYSTEM: Faculty & Students (admin) ───────────────────────────────────────
export const adminCreateTeacher       = (payload)     => api.post('/auth/admin/create-teacher/', payload);
export const fetchTeachers            = ()            => api.get('/auth/admin/teachers/');
export const updateTeacherDisciplines = (id, payload) => api.patch(`/auth/admin/teachers/${id}/`, payload);
export const adminCreateStudent       = (payload)     => api.post('/auth/admin/create-student/', payload);
export const fetchStudents            = ()            => api.get('/auth/admin/students/');
export const fetchAuditLogs           = (params)      => api.get('/auth/admin/audit-logs/', { params });
export const adminUpdateUser          = (userId, payload) => api.patch(`/auth/admin/users/${userId}/`, payload);
export const adminDeleteUser          = (userId)      => api.delete(`/auth/admin/users/${userId}/`);

// ── SYSTEM: Notifications ───────────────────────────────────────────────────
export const fetchNotifications       = (params)      => api.get('/auth/notifications/', { params });
export const markNotificationsRead    = (payload)     => api.patch('/auth/notifications/', payload);