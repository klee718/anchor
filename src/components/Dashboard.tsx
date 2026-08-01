import { useRef, useState } from "react";
import type { AnchorProgress } from "../store";
import { xpInCurrentLevel } from "../store";
import { CURRICULUM, isUnitUnlocked, isLessonUnlocked, isLessonPremium, type Lesson } from "../curriculum";
import { useSound } from "../useSound";
import ParchmentBackground from "./ParchmentBackground";
import TiltCard from "./TiltCard";
import LessonPath, { type LessonPathItem } from "./LessonPath";
import SparkleBurst from "./SparkleBurst";

const DAILY_VERSES = [
  { ref: "Psalms 46:10", label: "Be still, and know that I am God" },
  { ref: "Isaiah 40:31", label: "Those who wait upon the Lord shall renew their strength" },
  { ref: "Romans 8:28", label: "All things work together for good" },
  { ref: "John 14:1", label: "Let not your hearts be troubled" },
  { ref: "Philippians 4:7", label: "The peace that passes all understanding" },
  { ref: "Matthew 11:28", label: "Come to me, all who are weary" },
  { ref: "2 Corinthians 12:9", label: "My grace is sufficient for you" },
];

function getDailyVerse() {
  const dayIndex = Math.floor(Date.now() / 86400000) % DAILY_VERSES.length;
  return DAILY_VERSES[dayIndex];
}

interface Props {
  progress: AnchorProgress;
  onStartLesson: (lesson: Lesson) => void;
  onOpenFreeChat: () => void;
  onDailyChallenge: () => void;
  onPremiumLocked: () => void;
  onLogout: () => void;
  showLogout: boolean;
  justUnlockedLessonId?: string | null;
  streakJustIncreased?: boolean;
}

export default function Dashboard({
  progress,
  onStartLesson,
  onOpenFreeChat,
  onDailyChallenge,
  onPremiumLocked,
  onLogout,
  showLogout = true,
  justUnlockedLessonId,
  streakJustIncreased,
}: Props) {
  const currentXP = xpInCurrentLevel(progress);
  const percent = Math.min(100, Math.floor((currentXP / 100) * 100));
  const { enabled: soundEnabled, toggle: toggleSound } = useSound();
  const [sparkling, setSparkling] = useState(false);
  const sparkleTimeoutRef = useRef<number | null>(null);

  function triggerSparkle() {
    setSparkling(true);
    if (sparkleTimeoutRef.current) window.clearTimeout(sparkleTimeoutRef.current);
    sparkleTimeoutRef.current = window.setTimeout(() => setSparkling(false), 750);
  }

  const dayIdx = Math.floor(Date.now() / 86400000) % DAILY_VERSES.length;
  const dailyRef = DAILY_VERSES[dayIdx];
  const daily = {
    ref: dailyRef.ref,
    label: dailyRef.label,
  };

  return (
    <div className="relative h-screen overflow-hidden bg-[#EDE8E0] font-sans text-[#1C1209]">
      <ParchmentBackground />
      <div className="relative z-10 flex h-full flex-col">
      {/* Top Bar */}
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-[#D9D0C4] bg-[#EDE8E0]/80 px-4 py-3 backdrop-blur">
        <h1 className="font-serif text-2xl font-semibold text-[#1C1209] tracking-tight">Anchor</h1>
        <div className="flex items-center gap-4">
          <span
            className={`flex items-center gap-1 text-sm font-semibold text-[#C8A261] transition-transform hover:scale-105 ${streakJustIncreased ? "animate-streak-pulse" : ""}`}
            title={`Daily Walk Streak: ${progress.streak} Days`}
          >
            <svg
              className="h-[18px] w-[18px]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              role="img"
              aria-label={`Daily Walk Streak: ${progress.streak} Days`}
            >
              <path d="M3 20c0-4 6-4 6-8s6-4 6-8" />
              <circle cx="15" cy="4" r="1.6" fill="currentColor" stroke="none" />
            </svg>
            {progress.streak}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#8C7B6B]">Lv {progress.level}</span>
            <div className="h-2 w-20 overflow-hidden rounded-full bg-[#E4DDD5] shadow-inner">
              <div
                style={{ width: `${percent}%` }}
                className="h-full bg-gradient-to-r from-[#C8A261] to-[#D9B780] shadow-[0_0_8px_#C8A261] transition-all duration-300"
              />
            </div>
          </div>
          <button
            onClick={toggleSound}
            title={soundEnabled ? "Mute sound" : "Enable sound"}
            className="rounded-lg border border-[#D9D0C4] bg-[#FAF7F2] px-2.5 py-1 text-xs font-medium text-[#8C7B6B] transition hover:bg-[#F2EDE5] hover:text-[#1C1209]"
          >
            {soundEnabled ? "🔊" : "🔇"}
          </button>
          {showLogout && (
            <button
              onClick={onLogout}
              className="rounded-lg border border-[#D9D0C4] bg-[#FAF7F2] px-2.5 py-1 text-xs font-medium text-[#8C7B6B] transition hover:bg-[#F2EDE5] hover:text-[#1C1209]"
            >
              Log out
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-2xl">
          {/* Daily Challenge */}
          <section className="mb-8 animate-card-pop" style={{ animationDelay: "0ms" }}>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-[#C8A261]">Daily Challenge</h2>
            <div className="relative" onMouseEnter={triggerSparkle}>
              <TiltCard
                onClick={() => {
                  triggerSparkle();
                  onDailyChallenge();
                }}
                className="w-full rounded-2xl border border-[#D9D0C4]/70 border-l-4 border-l-[#C8A261] bg-white/70 p-4 text-left shadow-lg shadow-[#8a6d1a]/5 backdrop-blur-md hover:bg-white/85 active:scale-[0.99]"
              >
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-xl">⭐</span>
                  <span className="text-sm font-semibold text-[#C8A261]">Today's Verse</span>
                  <span className="ml-auto rounded-full bg-[#C8A26118] px-2 py-0.5 text-xs font-bold text-[#C8A261]">+10 XP</span>
                </div>
                <p className="text-sm font-semibold text-[#1C1209]">{daily.ref}</p>
                <p className="mt-1 text-xs italic text-[#4A3728]">"{daily.label}"</p>
              </TiltCard>
              <SparkleBurst active={sparkling} />
            </div>
          </section>

          {/* Free Chat */}
          <section className="mb-8 animate-card-pop" style={{ animationDelay: "60ms" }}>
            <TiltCard
              onClick={onOpenFreeChat}
              className="w-full rounded-2xl border border-[#D9D0C4]/70 bg-white/70 p-4 text-left shadow-lg shadow-[#8a6d1a]/5 backdrop-blur-md hover:bg-white/85 active:scale-[0.99]"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EDE8E0] text-xl">💬</span>
                <div>
                  <p className="font-semibold text-[#1C1209]">Free Conversation</p>
                  <p className="text-xs text-[#8C7B6B]">
                    {progress.isPremium ? "Ask anything — unlimited" : "Ask anything — 5 messages/day on the free tier"}
                  </p>
                </div>
              </div>
            </TiltCard>
          </section>

          {/* Course Map */}
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-[#C8A261]">Course</h2>
          <div className="flex flex-col gap-8">
            {CURRICULUM.map((unit, unitIdx) => {
              const progressionUnlocked = isUnitUnlocked(unit.id, progress.completedLessons);
              const allDone = unit.lessons.every((l) => progress.completedLessons.includes(l.id));

              // Unit is premium-gated only if ALL lessons in it are premium.
              // This keeps Unit 2 unlocked for the first 2 free lessons.
              const isEntireUnitPremium = unit.lessons.every((l) => isLessonPremium(l.id));
              const premiumGated = isEntireUnitPremium && !progress.isPremium;
              const unlocked = progressionUnlocked && !premiumGated;

              const pathItems: LessonPathItem[] = unit.lessons.map((lesson) => {
                const done = progress.completedLessons.includes(lesson.id);
                const isPremiumLesson = isLessonPremium(lesson.id) && !progress.isPremium;
                const progressionAvailable = isLessonUnlocked(lesson, unit.id, progress.completedLessons);
                const avail = !done && !isPremiumLesson && progressionAvailable;
                return { lesson, isPremiumLesson, status: done ? "completed" : avail ? "available" : "locked" };
              });

              return (
                <div
                  key={unit.id}
                  className={`rounded-2xl border border-[#D9D0C4]/80 overflow-hidden shadow-lg shadow-[#8a6d1a]/5 animate-card-pop ${!unlocked ? "opacity-55" : ""}`}
                  style={{ animationDelay: `${120 + unitIdx * 70}ms` }}
                >
                  {/* Unit Header */}
                  <TiltCard
                    maxTilt={3}
                    onClick={() => premiumGated && onPremiumLocked()}
                    className={`${unit.color} px-4 py-4 flex w-full items-center justify-between text-white text-left ${premiumGated ? "cursor-pointer" : "cursor-default"}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-xl">
                        {unit.icon}
                      </span>
                      <div>
                        <p className="font-serif font-bold text-lg leading-tight text-white">{unit.title}</p>
                        <p className="text-xs text-white/80 mt-0.5">{unit.description}</p>
                      </div>
                    </div>
                    {allDone && <span className="text-white text-lg font-bold">✓</span>}
                    {premiumGated && (
                      <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs font-bold text-white">✦ Premium</span>
                    )}
                    {!unlocked && !premiumGated && <span className="text-white/60 text-lg">🔒</span>}
                  </TiltCard>

                  {/* Lesson Path */}
                  <div className="bg-[#F2EDE5]/85 backdrop-blur-sm px-4 py-6">
                    <LessonPath
                      items={pathItems}
                      justUnlockedLessonId={justUnlockedLessonId}
                      onSelect={(item) => {
                        if (item.isPremiumLesson) {
                          onPremiumLocked();
                          return;
                        }
                        if (item.status !== "locked") onStartLesson(item.lesson);
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <footer className="mt-12 flex justify-center gap-4 text-[11px] text-[#8C7B6B]">
            <a href="/terms.html" target="_blank" rel="noopener" className="hover:text-[#1C1209]">Terms</a>
            <a href="/privacy.html" target="_blank" rel="noopener" className="hover:text-[#1C1209]">Privacy</a>
          </footer>
        </div>
      </main>
      </div>
    </div>
  );
}
