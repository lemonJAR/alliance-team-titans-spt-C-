import { login as loginRequest, logout as logoutRequest } from "../services/api";
import { clearSession, getSession, saveSession } from "../models/authSession";
import { findDemoAccount } from "../models/demoAccounts";

export async function signIn(credentials) {
  const demoAccount = findDemoAccount(credentials.email, credentials.password);
  if (demoAccount) {
    return saveSession(demoAccount);
  }

  return loginRequest(credentials);
}

export async function signOut() {
  try {
    await logoutRequest();
  } finally {
    clearSession();
  }
}

export function currentUser() {
  return getSession()?.user ?? null;
}
