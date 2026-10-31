import { ROLES } from "./roles";

const demoAccounts = Object.freeze([
  {
    email: "student@example.com",
    password: "Student123!",
    user: { id: "demo-student", email: "student@example.com", role: ROLES.STUDENT },
  },
  {
    email: "professor@example.com",
    password: "Professor123!",
    user: { id: "demo-professor", email: "professor@example.com", role: ROLES.PROFESSOR },
  },
  {
    email: "admin@example.com",
    password: "Admin123!",
    user: { id: "demo-admin", email: "admin@example.com", role: ROLES.ADMIN },
  },
]);

export function findDemoAccount(email, password) {
  if (!import.meta.env.DEV) return null;

  const account = demoAccounts.find(
    (candidate) =>
      candidate.email.toLowerCase() === email.trim().toLowerCase() &&
      candidate.password === password,
  );

  if (!account) return null;

  return {
    token: `demo-token-${account.user.id}`,
    user: account.user,
  };
}

export const DEMO_ACCOUNT_HINTS = demoAccounts.map(({ email, password, user }) => ({
  email,
  password,
  role: user.role,
}));
