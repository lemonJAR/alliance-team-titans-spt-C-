export const ROLES = Object.freeze({
  ADMIN: "ADMIN",
  PROFESSOR: "PROFESSOR",
  STUDENT: "STUDENT",
});

export const DASHBOARD_ROUTES = Object.freeze({
  [ROLES.ADMIN]: "/adminhome",
  [ROLES.PROFESSOR]: "/teacherhome",
  [ROLES.STUDENT]: "/studenthome",
});
