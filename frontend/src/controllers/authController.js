import { login as loginRequest, logout as logoutRequest } from "../services/api";
import { clearSession, getSession } from "../models/authSession";

export async function signIn(credentials) {
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