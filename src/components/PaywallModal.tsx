import { useState } from "react";
import { getIdToken } from "../firebase";

interface Props {
  reason: "locked_unit" | "free_chat_limit";
  onClose: () => void;
}

export default function PaywallModal({ reason, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpgrade() {
    setLoading(true);
    setError(null);
    try {
      const token = await getIdToken();
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      const data = await res.json();
      if (!data.ok || !data.url) {
        setError(data.message ?? "Checkout isn't set up yet — the site owner needs to add Stripe credentials.");
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Couldn't start checkout right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-[#D9D0C4] bg-[#FAF7F2] p-6 text-[#1C1209] shadow-xl animate-card-pop">
        <p className="mb-2 text-center text-3xl">✦</p>
        <h2 className="mb-2 text-center font-serif text-2xl font-semibold">Anchor Premium</h2>
        <p className="mb-5 text-center text-sm text-[#4A3728]">
          {reason === "locked_unit"
            ? "Units 2–5 are part of Anchor Premium. Unit 1 and the Daily Challenge are free, always."
            : "You've used today's free conversation messages. Premium gives you unlimited Free Conversation, any time."}
        </p>

        <div className="mb-5 rounded-xl border border-[#D9D0C4] bg-white p-4">
          <p className="text-center font-serif text-xl font-semibold">$5.99<span className="text-sm font-normal text-[#8C7B6B]">/month</span></p>
          <ul className="mt-3 space-y-1.5 text-sm text-[#4A3728]">
            <li>✓ All 5 units, unlocked</li>
            <li>✓ Unlimited Free Conversation</li>
            <li>✓ Cancel anytime</li>
          </ul>
        </div>

        {error && <p className="mb-3 text-center text-xs text-red-700">{error}</p>}

        <button
          onClick={handleUpgrade}
          disabled={loading}
          className="w-full rounded-xl bg-[#1C1209] px-4 py-2.5 text-sm font-bold text-white shadow-[0_3px_0_#0a0704] transition active:translate-y-0.5 active:shadow-none disabled:opacity-50"
        >
          {loading ? "Redirecting…" : "Upgrade to Premium"}
        </button>
        <button onClick={onClose} className="mt-3 w-full text-center text-xs text-[#8C7B6B] hover:text-[#1C1209] transition">
          Not now
        </button>
      </div>
    </div>
  );
}
