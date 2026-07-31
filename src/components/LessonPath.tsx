import { useId, useLayoutEffect, useRef, useState } from "react";
import type { Lesson } from "../curriculum";
import LessonNode from "./LessonNode";

export interface LessonPathItem {
  lesson: Lesson;
  status: "completed" | "available" | "locked";
  isPremiumLesson: boolean;
}

interface Props {
  items: LessonPathItem[];
  onSelect: (item: LessonPathItem) => void;
  justUnlockedLessonId?: string | null;
}

interface Point {
  x: number;
  y: number;
}

function buildPathD(points: Point[]): string {
  if (points.length < 2) return "";
  return points.reduce((d, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = points[i - 1];
    const midY = (prev.y + p.y) / 2;
    return `${d} C ${prev.x} ${midY}, ${p.x} ${midY}, ${p.x} ${p.y}`;
  }, "");
}

/**
 * Duolingo-style zigzag skill path with a flowing connector line behind the
 * nodes. The gold overlay fills up through completed lessons via the classic
 * stroke-dasharray/dashoffset "progress ring" trick.
 */
export default function LessonPath({ items, onSelect, justUnlockedLessonId }: Props) {
  const gradientId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [points, setPoints] = useState<Point[]>([]);
  const reducedMotion =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useLayoutEffect(() => {
    function measure() {
      const container = containerRef.current;
      if (!container) return;
      const containerRect = container.getBoundingClientRect();
      const next = nodeRefs.current.map((el) => {
        if (!el) return { x: 0, y: 0 };
        const r = el.getBoundingClientRect();
        return {
          x: r.left - containerRect.left + r.width / 2,
          y: r.top - containerRect.top + r.height / 2,
        };
      });
      setPoints(next);
    }
    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener("orientationchange", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("orientationchange", measure);
    };
  }, [items.length]);

  const pathD = buildPathD(points);
  const completedCount = items.filter((i) => i.status === "completed").length;
  const progressFraction =
    items.length > 1 ? completedCount / (items.length - 1) : completedCount > 0 ? 1 : 0;

  return (
    <div ref={containerRef} className="relative flex flex-col items-center gap-6">
      {pathD && (
        <svg className="pointer-events-none absolute inset-0 -z-10 h-full w-full overflow-visible" aria-hidden="true">
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#E8C97A" />
              <stop offset="100%" stopColor="#C8A261" />
            </linearGradient>
          </defs>
          <path d={pathD} fill="none" stroke="#D9D0C4" strokeWidth={3} strokeLinecap="round" />
          <GoldProgressPath d={pathD} fraction={progressFraction} reducedMotion={reducedMotion} gradientId={gradientId} />
        </svg>
      )}

      {items.map((item, idx) => {
        const isEven = idx % 2 === 0;
        return (
          <div
            key={item.lesson.id}
            className={`flex w-full items-center gap-4 ${isEven ? "justify-start pl-8" : "justify-end pr-8"}`}
          >
            <div className={`flex flex-col ${isEven ? "items-start" : "items-end"} gap-1.5`}>
              <div
                ref={(el) => {
                  nodeRefs.current[idx] = el;
                }}
              >
                <LessonNode
                  lesson={item.lesson}
                  status={item.status}
                  disabled={item.status === "locked" && !item.isPremiumLesson}
                  onClick={() => onSelect(item)}
                  justUnlocked={item.lesson.id === justUnlockedLessonId && item.status !== "locked"}
                />
              </div>
              <div className={`flex flex-col ${isEven ? "items-start" : "items-end"}`}>
                <div className="flex items-center gap-1">
                  <p className="max-w-[150px] text-xs font-medium text-[#8C7B6B] leading-tight text-center md:text-left">
                    {item.lesson.title}
                  </p>
                  {item.isPremiumLesson && (
                    <span className="text-[9px] font-bold text-[#C8A261] px-1 bg-[#C8A261]/10 rounded" title="Premium">
                      ✦
                    </span>
                  )}
                </div>
                <p className="text-[10px] font-bold text-[#C8A261] mt-0.5">{item.lesson.xpReward} XP</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function GoldProgressPath({
  d,
  fraction,
  reducedMotion,
  gradientId,
}: {
  d: string;
  fraction: number;
  reducedMotion: boolean;
  gradientId: string;
}) {
  const pathRef = useRef<SVGPathElement>(null);
  const [dash, setDash] = useState<{ length: number; offset: number } | null>(null);

  useLayoutEffect(() => {
    const el = pathRef.current;
    if (!el) return;
    const length = el.getTotalLength();
    setDash({ length, offset: length * (1 - fraction) });
  }, [d, fraction]);

  return (
    <path
      ref={pathRef}
      d={d}
      fill="none"
      stroke={`url(#${gradientId})`}
      strokeWidth={3}
      strokeLinecap="round"
      style={
        dash
          ? {
              strokeDasharray: dash.length,
              strokeDashoffset: dash.offset,
              transition: reducedMotion ? "none" : "stroke-dashoffset 900ms cubic-bezier(0.22,1,0.36,1)",
            }
          : undefined
      }
    />
  );
}
