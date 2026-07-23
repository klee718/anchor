import { useState, type FormEvent } from "react";
import { isFirebaseConfigured, signInWithGoogle, loginWithSessionToken } from "../firebase";

interface Props {
  onAuthed: () => void;
}

export default function AuthScreen({ onAuthed }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password.trim() || loading) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/custom-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Invalid credentials in users.txt');
      }

      await loginWithSessionToken(data.token);
      onAuthed();
    } catch (err: any) {
      setError(err?.message ?? "Failed to connect to backend authentication server.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
      onAuthed();
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#EDE8E0] px-4 text-[#1C1209]">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-center font-serif text-3xl font-semibold tracking-tight">Anchor</h1>
        <p className="mb-8 text-center text-sm text-[#8C7B6B]">Honest conversation about scripture and doubt.</p>

        {!isFirebaseConfigured && (
          <div className="mb-6 rounded-2xl border border-[#D9D0C4] bg-[#FAF7F2] p-4 text-sm text-[#4A3728]">
            Sign-in isn't configured yet. Add your Firebase project's config to <code>.env</code> (see{" "}
            <code>.env.example</code>) to enable this screen.
          </div>
        )}

        <form onSubmit={handleLogin} className="flex flex-col gap-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading || !isFirebaseConfigured}
            className="rounded-xl border border-[#D9D0C4] bg-[#FAF7F2] px-3 py-2.5 text-sm text-[#1C1209] placeholder:text-[#8C7B6B] focus:border-[#5B4FCF] focus:outline-none disabled:opacity-50"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading || !isFirebaseConfigured}
            className="rounded-xl border border-[#D9D0C4] bg-[#FAF7F2] px-3 py-2.5 text-sm text-[#1C1209] placeholder:text-[#8C7B6B] focus:border-[#5B4FCF] focus:outline-none disabled:opacity-50"
          />

          {error && <p className="text-xs text-red-700">{error}</p>}

          <button
            type="submit"
            disabled={loading || !isFirebaseConfigured}
            className="mt-1 rounded-xl bg-[#1C1209] px-4 py-2.5 text-sm font-bold text-white shadow-[0_3px_0_#0a0704] transition active:translate-y-0.5 active:shadow-none disabled:opacity-40"
          >
            Log in
          </button>
        </form>

        <button
          onClick={handleGoogle}
          disabled={loading || !isFirebaseConfigured}
          className="mt-3 w-full rounded-xl border border-[#D9D0C4] bg-[#FAF7F2] px-4 py-2.5 text-sm font-semibold text-[#1C1209] transition hover:bg-[#F2EDE5] disabled:opacity-40"
        >
          Continue with Google
        </button>

        <p className="mt-8 text-center text-[11px] leading-relaxed text-[#8C7B6B]">
          See our{" "}
          <a href="/terms.html" target="_blank" rel="noopener" className="underline hover:text-[#1C1209]">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="/privacy.html" target="_blank" rel="noopener" className="underline hover:text-[#1C1209]">
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </div>
  );
}
