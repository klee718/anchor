import { useCallback, useEffect, useState } from "react";
import { fetchProgress, completeLessonRemote, type AnchorProgress } from "./store";
import type { Lesson } from "./curriculum";
import { onAuthStateChanged, signOut, type User } from "./firebase";
import Dashboard from "./components/Dashboard";
import LessonChat from "./components/LessonChat";
import XPToast from "./components/XPToast";
import AuthScreen from "./components/AuthScreen";
import PaywallModal from "./components/PaywallModal";
import PreviewAuthModal from "./components/PreviewAuthModal";

// Free-chat view reuses LessonChat but with no lesson context.
const FREE_CHAT_PSEUDO_LESSON: Lesson = {
  id: "free",
  title: "Free Conversation",
  subtitle: "Ask anything",
  verseRef: "",
  translation: "web",
  openingPrompt:
    "I'm open to talking about anything — a verse, a doubt, a question about faith, or why any of this should matter. What's on your mind?",
  xpReward: 0,
};

const DAILY_CHALLENGE_VERSES = [
  "Psalms 46:10",
  "Isaiah 40:31",
  "Romans 8:28",
  "John 14:1",
  "Philippians 4:7",
  "Matthew 11:28",
  "2 Corinthians 12:9",
];

type View = { screen: "dashboard" } | { screen: "lesson"; lesson: Lesson } | { screen: "freeChat" };

export default function App() {
  const [dryRun, setDryRun] = useState(false);
  const [healthChecked, setHealthChecked] = useState(false);
  const [previewAuthNeeded, setPreviewAuthNeeded] = useState(false);
  const [previewChecked, setPreviewChecked] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [progress, setProgress] = useState<AnchorProgress | null>(null);
  const [view, setView] = useState<View>({ screen: "dashboard" });
  const [xpToast, setXpToast] = useState<number | null>(null);
  const [paywallReason, setPaywallReason] = useState<"locked_unit" | "free_chat_limit" | null>(null);
  const [checkoutStatus, setCheckoutStatus] = useState<"success" | "cancelled" | null>(null);

  // Check preview whitelist auth status (for V_HOSTING mode)
  useEffect(() => {
    fetch("/api/auth/preview-status")
      .then((r) => r.json())
      .then((d) => {
        if (d.vercelHosting && !d.authenticated) {
          setPreviewAuthNeeded(true);
        } else {
          setPreviewAuthNeeded(false);
        }
      })
      .catch(() => {})
      .finally(() => setPreviewChecked(true));
  }, []);

  // Handle the redirect back from Stripe Checkout.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get("checkout");
    if (checkout !== "success" && checkout !== "cancelled") return;

    setCheckoutStatus(checkout);
    window.history.replaceState({}, "", window.location.pathname);

    if (checkout === "success") {
      let attempts = 0;
      const poll = () => {
        attempts++;
        fetchProgress()
          .then((p) => {
            setProgress(p);
            if (!p.isPremium && attempts < 5) setTimeout(poll, 1500);
          })
          .catch((err) => console.error("Failed to refresh progress after checkout:", err));
      };
      poll();
    }
  }, []);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((d) => setDryRun(Boolean(d.dryRun)))
      .catch(() => {})
      .finally(() => setHealthChecked(true));
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged((u) => {
      setUser(u);
      setAuthChecked(true);
    });
    return unsubscribe;
  }, []);

  const signedIn = dryRun || Boolean(user);

  useEffect(() => {
    if (!healthChecked || !authChecked || !signedIn || previewAuthNeeded) return;
    fetchProgress()
      .then(setProgress)
      .catch((err) => console.error("Failed to load progress:", err));
  }, [healthChecked, authChecked, signedIn, previewAuthNeeded]);

  const handleLessonComplete = useCallback(async (xpReward: number, lessonId: string) => {
    try {
      const updated = await completeLessonRemote(lessonId, xpReward);
      setProgress(updated);
      setXpToast(xpReward);
    } catch (err) {
      console.error("Failed to complete lesson:", err);
    }
  }, []);

  const handleDailyChallenge = useCallback(() => {
    const dateStr = new Date().toISOString().slice(0, 10);
    let seed = 0;
    for (let i = 0; i < dateStr.length; i++) {
      seed += dateStr.charCodeAt(i);
    }
    const verseRef = DAILY_CHALLENGE_VERSES[seed % DAILY_CHALLENGE_VERSES.length];

    const challengeLesson: Lesson = {
      id: `daily-${dateStr}`,
      title: "Daily Challenge",
      subtitle: verseRef,
      verseRef,
      translation: "web",
      openingPrompt: `Give me a fresh, reflective question about ${verseRef} that relates to modern everyday life.`,
      xpReward: 25,
    };

    setView({ screen: "lesson", lesson: challengeLesson });
  }, []);

  const handleLogout = useCallback(async () => {
    // Clear preview auth cookie (if in V_HOSTING mode)
    try {
      await fetch("/api/auth/preview-logout", { method: "POST" });
    } catch {}
    // Sign out of Firebase (if signed in)
    signOut().catch((err) => console.error("Failed to sign out:", err));
    // Reset preview auth state so the modal reappears
    setPreviewAuthNeeded(true);
  }, []);

  if (previewAuthNeeded) {
    return <PreviewAuthModal onSuccess={() => setPreviewAuthNeeded(false)} />;
  }

  // Gate: wait for health check and auth check to complete.
  if (!healthChecked || !authChecked || !previewChecked) {
    return <div className="flex min-h-screen items-center justify-center bg-[#EDE8E0] text-[#8C7B6B]">Connecting…</div>;
  }

  // Gate: in production (not dry-run), user must be signed in with Firebase.
  if (!signedIn) {
    return <AuthScreen onAuthed={() => {}} />;
  }

  // Gate: signed in but progress hasn't loaded yet.
  if (!progress) {
    return <div className="flex min-h-screen items-center justify-center bg-[#EDE8E0] text-[#8C7B6B]">Loading your progress…</div>;
  }

  if (view.screen === "lesson" || view.screen === "freeChat") {
    const lesson = view.screen === "lesson" ? view.lesson : FREE_CHAT_PSEUDO_LESSON;
    return (
      <>
        <LessonChat
          lesson={lesson}
          dryRun={dryRun}
          onComplete={(xp) => handleLessonComplete(xp, lesson.id)}
          onBack={() => setView({ screen: "dashboard" })}
          onPaywall={() => setPaywallReason("free_chat_limit")}
        />
        {xpToast !== null && <XPToast amount={xpToast} onDone={() => setXpToast(null)} />}
        {paywallReason && <PaywallModal reason={paywallReason} onClose={() => setPaywallReason(null)} />}
      </>
    );
  }

  return (
    <>
      {checkoutStatus === "success" && (
        <div className="border-b border-[#D9D0C4] bg-[#F2EDE5] px-4 py-2 text-center text-sm text-[#1C1209]">
          {progress.isPremium
            ? "You're on Anchor Premium — all units unlocked. Welcome."
            : "Payment received — activating your premium access…"}
          <button onClick={() => setCheckoutStatus(null)} className="ml-3 text-xs text-[#8C7B6B] hover:text-[#1C1209]">
            Dismiss
          </button>
        </div>
      )}
      {checkoutStatus === "cancelled" && (
        <div className="border-b border-[#D9D0C4] bg-[#F2EDE5] px-4 py-2 text-center text-sm text-[#8C7B6B]">
          Checkout cancelled — no charge was made.
          <button onClick={() => setCheckoutStatus(null)} className="ml-3 text-xs text-[#8C7B6B] hover:text-[#1C1209]">
            Dismiss
          </button>
        </div>
      )}
      <Dashboard
        progress={progress}
        onStartLesson={(lesson) => setView({ screen: "lesson", lesson })}
        onOpenFreeChat={() => setView({ screen: "freeChat" })}
        onDailyChallenge={handleDailyChallenge}
        onPremiumLocked={() => setPaywallReason("locked_unit")}
        onLogout={handleLogout}
        showLogout={true}
      />
      {xpToast !== null && <XPToast amount={xpToast} onDone={() => setXpToast(null)} />}
      {paywallReason && <PaywallModal reason={paywallReason} onClose={() => setPaywallReason(null)} />}
    </>
  );
}
