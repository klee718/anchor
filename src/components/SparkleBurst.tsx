interface Props {
  active: boolean;
}

const SPARKLE_SPOTS = [
  { top: "-8%", left: "6%" },
  { top: "-10%", left: "38%" },
  { top: "-6%", left: "72%" },
  { top: "40%", left: "-3%" },
  { top: "40%", left: "101%" },
  { top: "94%", left: "14%" },
  { top: "98%", left: "48%" },
  { top: "90%", left: "82%" },
];

/** Brief sparkle emitter around a card's border — hover/claim feedback for the Daily Challenge. */
export default function SparkleBurst({ active }: Props) {
  if (!active) return null;
  return (
    <div className="pointer-events-none absolute inset-0 motion-reduce:hidden" aria-hidden="true">
      {SPARKLE_SPOTS.map((spot, i) => (
        <span
          key={i}
          className="absolute text-[13px] text-[#E8C97A] animate-sparkle-pop"
          style={{ top: spot.top, left: spot.left, animationDelay: `${i * 45}ms` }}
        >
          ✦
        </span>
      ))}
    </div>
  );
}
