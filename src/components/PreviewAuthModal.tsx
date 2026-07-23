import { useState, type FormEvent } from "react";

interface Props {
  onSuccess: () => void;
}

export default function PreviewAuthModal({ onSuccess }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Please enter both email and password.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/preview-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password: password.trim() }),
      });
      const data = await res.json();

      if (res.ok && data.ok) {
        onSuccess();
      } else {
        setError(data.error || "Access denied. Please check your credentials.");
      }
    } catch {
      setError("Failed to connect to authentication server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-xs">
      <div className="w-full max-w-sm rounded-2xl border border-[#D9D0C4] bg-[#FAF7F2] p-6 text-[#1C1209] shadow-2xl animate-card-pop">
        <div className="mb-4 text-center">
          <span className="inline-block rounded-full bg-[#EAE3D9] px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#6B5A4B]">
            Vercel Preview Access
          </span>
        </div>
        <h2 className="mb-2 text-center font-serif text-2xl font-semibold">Anchor Preview</h2>
        <p className="mb-6 text-center text-sm text-[#4A3728]">
          This preview environment is protected. Please sign in with your permissioned email and password.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#6B5A4B] mb-1">Permissioned Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full rounded-xl border border-[#D9D0C4] bg-white px-3.5 py-2 text-sm text-[#1C1209] placeholder-[#A09386] focus:border-[#1C1209] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#6B5A4B] mb-1">Preview Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full rounded-xl border border-[#D9D0C4] bg-white px-3.5 py-2 text-sm text-[#1C1209] placeholder-[#A09386] focus:border-[#1C1209] focus:outline-none"
            />
          </div>

          {error && <p className="text-center text-xs text-red-700 font-medium">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#1C1209] px-4 py-2.5 text-sm font-bold text-white shadow-[0_3px_0_#0a0704] transition active:translate-y-0.5 active:shadow-none disabled:opacity-50"
          >
            {loading ? "Verifying..." : "Access Preview"}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-[#8C7B6B]">
          Don't have access? Ask the site admin to add your email to the whitelist.
        </p>
      </div>
    </div>
  );
}
