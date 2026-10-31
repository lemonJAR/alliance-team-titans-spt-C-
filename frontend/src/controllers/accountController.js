import {
  register as registerRequest,
  verifyEmail as verifyEmailRequest,
  resendVerification as resendVerificationRequest,
  verifyStudent as verifyStudentRequest,
  requestPasswordReset as requestPasswordResetRequest,
  confirmPasswordReset as confirmPasswordResetRequest,
} from "../services/api";

export const register = (payload) => registerRequest(payload);
export const verifyEmail = (token) => verifyEmailRequest(token);
export const resendVerification = (email) => resendVerificationRequest(email);
export const verifyStudent = (studentId) => verifyStudentRequest(studentId);
export const requestPasswordReset = (email) => requestPasswordResetRequest(email);
export const confirmPasswordReset = (token, password) =>
  confirmPasswordResetRequest(token, password);
