import { useEffect, useState, type CSSProperties } from "react";
import type { Lesson } from "../curriculum";
import { playSound } from "../sound";

interface Props {
  lesson: Lesson;
  status: "completed" | "available" | "locked";
  onClick: () => void;
  // Defaults to (status === "locked"). Pass false to keep a visually-locked
  // node clickable — e.g. a premium-gated lesson, where clicking should open
  // the paywall rather than do nothing.
  disabled?: boolean;
  // True for one render pass right after this lesson becomes reachable —
  // triggers the lock-dissolve particle burst. Caller is responsible for
  // clearing it after the animation window.
  justUnlocked?: boolean;
}

const statusStyles = {
  completed: "bg-[#3A6B4A] border-[#2A5238] text-white shadow-[0_4px_0_#2A5238]",
  available: "bg-[#5B4FCF] border-[#3D33A0] text-white shadow-[0_4px_0_#3D33A0] lesson-node-glow hover:bg-[#6B5FDF] cursor-pointer",
  locked:    "bg-[#E4DDD5] border-[#D9D0C4] text-[#8C7B6B] cursor-not-allowed",
};

const statusIcon = {
  completed: "✓",
  available: "▶",
  locked:    "🔒",
};

const BURST_PARTICLES = Array.from({ length: 8 }, (_, i) => {
  const angle = (i / 8) * Math.PI * 2;
  return { dx: Math.cos(angle) * 32, dy: Math.sin(angle) * 32, delay: i * 25 };
});

export default function LessonNode({ lesson, status, onClick, disabled, justUnlocked }: Props) {
  const isDisabled = disabled ?? status === "locked";
  const [bursting, setBursting] = useState(false);

  useEffect(() => {
    if (!justUnlocked) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setBursting(true);
    const t = setTimeout(() => setBursting(false), 700);
    return () => clearTimeout(t);
  }, [justUnlocked]);

  return (
    <button
      disabled={isDisabled}
      onClick={() => {
        playSound("tap");
        onClick();
      }}
      title={lesson.title}
      className={`relative flex h-16 w-16 items-center justify-center rounded-full border-b-4 text-2xl transition-all duration-150 active:translate-y-1 active:shadow-none animate-card-pop ${statusStyles[status]}`}
    >
      <span className={bursting ? "inline-block animate-unlock-icon-pop" : undefined}>{statusIcon[status]}</span>
      {status === "available" && (
        <>
          <span className="pointer-events-none absolute inset-0 rounded-full ring-4 ring-amber-400/50 animate-ping motion-reduce:hidden" />
          <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-[#C8A261] animate-pulse motion-reduce:animate-none" />
        </>
      )}
      {bursting && (
        <span className="pointer-events-none absolute inset-0" aria-hidden="true">
          {BURST_PARTICLES.map((p, i) => (
            <span
              key={i}
              className="absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full bg-[#E8C97A] animate-unlock-particle"
              style={
                {
                  animationDelay: `${p.delay}ms`,
                  "--dx": `${p.dx}px`,
                  "--dy": `${p.dy}px`,
                } as CSSProperties
              }
            />
          ))}
        </span>
      )}
    </button>
  );
}
