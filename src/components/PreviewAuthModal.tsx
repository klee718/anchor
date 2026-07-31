import { useEffect, useState, type FormEvent } from "react";
import DivineBackground from "./DivineBackground";

interface Props {
  onSuccess: () => void;
}

export default function PreviewAuthModal({ onSuccess }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

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
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#0a0e1f] px-4 text-[#F5EFE3]">
      <DivineBackground intensified={focused} />

      <div
        className={`relative z-10 w-full max-w-sm transition-all duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-opacity motion-reduce:duration-300 ${
          mounted ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
        }`}
      >
        <div className="mb-1 flex justify-center">
          <h1 className="text-center font-serif text-4xl font-semibold tracking-tight text-[#F8EFD9] drop-shadow-[0_0_18px_rgba(212,175,55,0.35)]">
            Anchor
          </h1>
        </div>
        <p className="mb-8 text-center text-sm text-[#C9BFA8]">Preview environment — restricted access.</p>

        <div className="animate-card-glow motion-reduce:animate-none rounded-3xl bg-gradient-to-br from-[#D4AF37]/60 via-white/15 to-[#D4AF37]/30 p-[1px]">
          <div className="rounded-[calc(1.5rem-1px)] bg-[#0d1226]/70 p-6 backdrop-blur-xl">
            <div className="mb-4 flex justify-center">
              <span className="inline-block rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#E8C97A]">
                Vercel Preview Access
              </span>
            </div>
            <p className="mb-6 text-center text-sm text-[#C9BFA8]">
              This preview environment is protected. Please sign in with your permissioned email and password.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="relative">
                <input
                  id="preview-email"
                  type="email"
                  placeholder=" "
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  disabled={loading}
                  required
                  className="peer w-full rounded-xl border border-white/15 bg-white/5 px-3.5 pb-2 pt-4 text-sm text-[#F5EFE3] placeholder-transparent outline-none transition focus:border-[#E8C97A]/70 focus:ring-2 focus:ring-amber-300/50 disabled:opacity-50"
                />
                <label
                  htmlFor="preview-email"
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-[#C9BFA8] transition-all peer-focus:top-2.5 peer-focus:translate-y-0 peer-focus:text-[10px] peer-focus:text-[#E8C97A] peer-[:not(:placeholder-shown)]:top-2.5 peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:text-[10px] peer-[:not(:placeholder-shown)]:text-[#E8C97A]/90"
                >
                  Permissioned Email
                </label>
              </div>

              <div className="relative">
                <input
                  id="preview-password"
                  type="password"
                  placeholder=" "
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  disabled={loading}
                  required
                  className="peer w-full rounded-xl border border-white/15 bg-white/5 px-3.5 pb-2 pt-4 text-sm text-[#F5EFE3] placeholder-transparent outline-none transition focus:border-[#E8C97A]/70 focus:ring-2 focus:ring-amber-300/50 disabled:opacity-50"
                />
                <label
                  htmlFor="preview-password"
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-[#C9BFA8] transition-all peer-focus:top-2.5 peer-focus:translate-y-0 peer-focus:text-[10px] peer-focus:text-[#E8C97A] peer-[:not(:placeholder-shown)]:top-2.5 peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:text-[10px] peer-[:not(:placeholder-shown)]:text-[#E8C97A]/90"
                >
                  Preview Password
                </label>
              </div>

              {error && <p className="text-center text-xs font-medium text-red-300">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="group relative mt-1 overflow-hidden rounded-xl bg-gradient-to-r from-[#C8A261] via-[#E8C97A] to-[#C8A261] bg-[length:200%_auto] px-4 py-3 text-sm font-bold text-[#1C1209] shadow-[0_4px_20px_-4px_rgba(212,175,55,0.6)] transition-all duration-300 hover:scale-[1.015] hover:bg-[position:100%_center] hover:shadow-[0_6px_28px_-4px_rgba(232,201,122,0.75)] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40"
              >
                <span className="relative z-10">{loading ? "Verifying…" : "Access Preview"}</span>
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 group-hover:translate-x-full motion-reduce:hidden" />
              </button>
            </form>

            <p className="mt-5 text-center text-[11px] text-[#8C8270]">
              Don't have access? Ask the site admin to add your email to the whitelist.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
