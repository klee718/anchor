import type { AnchorProgress } from "../store";
import { xpInCurrentLevel } from "../store";
import { CURRICULUM, isUnitUnlocked, isLessonUnlocked, isLessonPremium, type Lesson } from "../curriculum";
import LessonNode from "./LessonNode";

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
}

export default function Dashboard({
  progress,
  onStartLesson,
  onOpenFreeChat,
  onDailyChallenge,
  onPremiumLocked,
  onLogout,
  showLogout = true,
}: Props) {
  const currentXP = xpInCurrentLevel(progress);
  const percent = Math.min(100, Math.floor((currentXP / 100) * 100));

  const dayIdx = Math.floor(Date.now() / 86400000) % DAILY_VERSES.length;
  const dailyRef = DAILY_VERSES[dayIdx];
  const daily = {
    ref: dailyRef.ref,
    label: dailyRef.label,
  };

  return (
    <div className="flex h-screen flex-col bg-[#EDE8E0] font-sans text-[#1C1209]">
      {/* Top Bar */}
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-[#D9D0C4] bg-[#EDE8E0]/95 px-4 py-3 backdrop-blur">
        <h1 className="font-serif text-2xl font-semibold text-[#1C1209] tracking-tight">Anchor</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm font-semibold text-[#C8A261]" title="Streak">
            🔥 {progress.streak}
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
          <section className="mb-8">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-[#C8A261]">Daily Challenge</h2>
            <button
              onClick={onDailyChallenge}
              className="w-full rounded-2xl border border-[#D9D0C4] border-l-4 border-l-[#C8A261] bg-[#FAF7F2] p-4 text-left shadow-sm transition hover:bg-[#F2EDE5] active:scale-[0.99]"
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="text-xl">⭐</span>
                <span className="text-sm font-semibold text-[#C8A261]">Today's Verse</span>
                <span className="ml-auto rounded-full bg-[#C8A26118] px-2 py-0.5 text-xs font-bold text-[#C8A261]">+10 XP</span>
              </div>
              <p className="text-sm font-semibold text-[#1C1209]">{daily.ref}</p>
              <p className="mt-1 text-xs italic text-[#4A3728]">"{daily.label}"</p>
            </button>
          </section>

          {/* Free Chat */}
          <section className="mb-8">
            <button
              onClick={onOpenFreeChat}
              className="w-full rounded-2xl border border-[#D9D0C4] bg-[#FAF7F2] p-4 text-left shadow-sm transition hover:bg-[#F2EDE5] active:scale-[0.99]"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EDE8E0] text-xl">💬</span>
                <div>
                  <p className="font-semibold text-[#1C1209]">Free Conversation</p>
                  <p className="text-xs text-[#8C7B6B]">
                    {progress.isPremium ? "Ask anything — unlimited" : "Ask anything — 3 messages/day on the free tier"}
                  </p>
                </div>
              </div>
            </button>
          </section>

          {/* Course Map */}
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-[#C8A261]">Course</h2>
          <div className="flex flex-col gap-8">
            {CURRICULUM.map((unit) => {
              const progressionUnlocked = isUnitUnlocked(unit.id, progress.completedLessons);
              const allDone = unit.lessons.every((l) => progress.completedLessons.includes(l.id));
              
              // Unit is premium-gated only if ALL lessons in it are premium.
              // This keeps Unit 2 unlocked for the first 2 free lessons.
              const isEntireUnitPremium = unit.lessons.every((l) => isLessonPremium(l.id));
              const premiumGated = isEntireUnitPremium && !progress.isPremium;
              const unlocked = progressionUnlocked && !premiumGated;

              return (
                <div key={unit.id} className={`rounded-2xl border border-[#D9D0C4] overflow-hidden shadow-sm animate-card-pop ${!unlocked ? "opacity-55" : ""}`}>
                  {/* Unit Header */}
                  <button
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
                  </button>

                  {/* Lesson Nodes list */}
                  <div className="bg-[#F2EDE5] px-4 py-6">
                    <div className="flex flex-col items-center gap-6">
                      {unit.lessons.map((lesson, idx) => {
                        const done = progress.completedLessons.includes(lesson.id);
                        const isPremiumLesson = isLessonPremium(lesson.id) && !progress.isPremium;
                        const progressionAvailable = isLessonUnlocked(lesson, unit.id, progress.completedLessons);
                        
                        // Available only if progression allows it AND it isn't premium-gated
                        const avail = !done && !isPremiumLesson && progressionAvailable;
                        const status = done ? "completed" : avail ? "available" : "locked";
                        const isEven = idx % 2 === 0;

                        return (
                          <div key={lesson.id} className={`flex w-full items-center gap-4 ${isEven ? "justify-start pl-8" : "justify-end pr-8"}`}>
                            <div className={`flex flex-col ${isEven ? "items-start" : "items-end"} gap-1.5`}>
                              <LessonNode
                                lesson={lesson}
                                status={status}
                                // If locked because of premium, keep disabled=false so user can click to trigger the paywall modal
                                disabled={status === "locked" && !isPremiumLesson}
                                onClick={() => {
                                  if (isPremiumLesson) {
                                    onPremiumLocked();
                                    return;
                                  }
                                  if (status !== "locked") onStartLesson(lesson);
                                }}
                              />
                              <div className={`flex flex-col ${isEven ? "items-start" : "items-end"}`}>
                                <div className="flex items-center gap-1">
                                  <p className="max-w-[150px] text-xs font-medium text-[#8C7B6B] leading-tight text-center md:text-left">
                                    {lesson.title}
                                  </p>
                                  {isPremiumLesson && (
                                    <span className="text-[9px] font-bold text-[#C8A261] px-1 bg-[#C8A261]/10 rounded" title="Premium">
                                      ✦
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] font-bold text-[#C8A261] mt-0.5">{lesson.xpReward} XP</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
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
  );
}
