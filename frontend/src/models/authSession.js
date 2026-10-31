const TOKEN_KEY = "token";
const USER_KEY = "user";

export function getSession() {
  const token = localStorage.getItem(TOKEN_KEY);
  const rawUser = localStorage.getItem(USER_KEY);

  if (!token || !rawUser) return null;

  try {
    return { token, user: JSON.parse(rawUser) };
  } catch {
    clearSession();
    return null;
  }
}

export function saveSession({ token, user }) {
  if (!token || !user) {
    throw new Error("The authentication response did not include a token and user.");
  }

  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  return { token, user };
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function hasRole(roles) {
  const session = getSession();
  return Boolean(session && roles.includes(session.user?.role));
}
