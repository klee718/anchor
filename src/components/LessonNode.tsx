import type { Lesson } from "../curriculum";

interface Props {
  lesson: Lesson;
  status: "completed" | "available" | "locked";
  onClick: () => void;
  // Defaults to (status === "locked"). Pass false to keep a visually-locked
  // node clickable — e.g. a premium-gated lesson, where clicking should open
  // the paywall rather than do nothing.
  disabled?: boolean;
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

export default function LessonNode({ lesson, status, onClick, disabled }: Props) {
  const isDisabled = disabled ?? status === "locked";
  return (
    <button
      disabled={isDisabled}
      onClick={onClick}
      title={lesson.title}
      className={`relative flex h-16 w-16 items-center justify-center rounded-full border-b-4 text-2xl transition-all duration-150 active:translate-y-1 active:shadow-none animate-card-pop ${statusStyles[status]}`}
    >
      {statusIcon[status]}
      {status === "available" && (
        <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-[#C8A261] animate-pulse" />
      )}
    </button>
  );
}
