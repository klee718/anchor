// Client-side Session Manager. Bypasses client-side Firebase Auth.
// This handles local whitelist session token storage in localStorage.

export const isFirebaseConfigured = true; // Always true so the Auth screen inputs/buttons are enabled

export interface User {
  email: string;
  uid: string;
}

let authCallback: ((user: User | null) => void) | null = null;

function getLocalUser(): User | null {
  const token = localStorage.getItem("anchor_session_token");
  if (!token) return null;
  try {
    const parts = token.split(".");
    // base64url decode
    const base64 = parts[0].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base64));
    return { email: payload.email, uid: payload.email };
  } catch {
    return null;
  }
}

export function onAuthStateChanged(callback: (user: User | null) => void): () => void {
  authCallback = callback;
  // Trigger initial check
  callback(getLocalUser());
  return () => {
    if (authCallback === callback) authCallback = null;
  };
}

export async function loginWithSessionToken(token: string): Promise<void> {
  localStorage.setItem("anchor_session_token", token);
  if (authCallback) {
    authCallback(getLocalUser());
  }
}

export async function signOut(): Promise<void> {
  localStorage.removeItem("anchor_session_token");
  if (authCallback) {
    authCallback(null);
  }
}

export async function getIdToken(): Promise<string | null> {
  return localStorage.getItem("anchor_session_token");
}

// Stub function to maintain compatibility if imports exist
export async function signInWithGoogle(): Promise<User> {
  throw new Error("Google Login is disabled. Please log in using your whitelist credentials.");
}
