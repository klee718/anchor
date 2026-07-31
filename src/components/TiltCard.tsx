import { useRef, type MouseEvent, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  maxTilt?: number;
}

/**
 * Subtle 3D hover tilt (rotateX/rotateY follows cursor position) for premium
 * "course card" affordance. Mutates the DOM node directly via ref instead of
 * React state so mousemove doesn't trigger re-renders — keeps it at 60fps.
 */
export default function TiltCard({ children, className = "", onClick, maxTilt = 6 }: Props) {
  const ref = useRef<HTMLButtonElement>(null);
  const reducedMotionRef = useRef(
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  function handleMouseMove(e: MouseEvent<HTMLButtonElement>) {
    if (reducedMotionRef.current || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    ref.current.style.transform = `perspective(800px) rotateX(${(-py * maxTilt).toFixed(2)}deg) rotateY(${(px * maxTilt).toFixed(2)}deg) translateY(-2px)`;
  }

  function handleMouseLeave() {
    if (ref.current) ref.current.style.transform = "";
  }

  return (
    <button
      ref={ref}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`transition-transform duration-200 ease-out will-change-transform motion-reduce:transition-none ${className}`}
      style={{ transformStyle: "preserve-3d" }}
    >
      {children}
    </button>
  );
}
