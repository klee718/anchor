import { useEffect, useRef } from "react";

interface Props {
  /** Intensifies the central aura — pass true while a form field is focused. */
  intensified: boolean;
}

interface Particle {
  x: number;
  y: number;
  r: number;
  baseOpacity: number;
  speed: number;
  driftPhase: number;
  driftSpeed: number;
}

interface Ripple {
  radius: number;
  opacity: number;
}

const NAVY_TOP = "#060812";
const NAVY_DEEP = "#0a0e1f";
const NAVY_MID = "#101833";
const GOLD_RGB = "212,175,55";
const CREAM_RGB = "250,235,200";

/**
 * Canvas 2D "divine light" backdrop: a twilight-navy field lit by a pulsing
 * central aura, drifting god-rays, expanding ripples, and upward-floating
 * light dust that reacts to the pointer. No WebGL/three.js dependency —
 * additive-blend 2D compositing gets the same look for a login screen.
 */
export default function DivineBackground({ intensified }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intensifiedRef = useRef(intensified);

  useEffect(() => {
    intensifiedRef.current = intensified;
  }, [intensified]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isSmallScreen = window.innerWidth < 768;
    const particleCount = reducedMotion ? 0 : isSmallScreen ? 55 : 150;

    let width = 0;
    let height = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas!.width = width * dpr;
      canvas!.height = height * dpr;
      canvas!.style.width = `${width}px`;
      canvas!.style.height = `${height}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    const mouse = { x: -1000, y: -1000 };
    function handlePointerMove(e: PointerEvent) {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    }
    window.addEventListener("pointermove", handlePointerMove);

    const particles: Particle[] = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 1.8 + 0.4,
      baseOpacity: Math.random() * 0.5 + 0.2,
      speed: Math.random() * 0.35 + 0.08,
      driftPhase: Math.random() * Math.PI * 2,
      driftSpeed: Math.random() * 0.6 + 0.2,
    }));

    const ripples: Ripple[] = [];
    let lastRippleTime = 0;
    let currentIntensity = 0;
    let time = 0;
    let rafId = 0;
    let lastTime = performance.now();
    let running = !document.hidden;

    function drawFrame(dt: number) {
      time += dt;

      const target = intensifiedRef.current ? 1 : 0;
      currentIntensity += (target - currentIntensity) * Math.min(dt * 0.003, 1);

      const cx = width / 2;
      const cy = height * 0.46;

      const base = ctx!.createLinearGradient(0, 0, 0, height);
      base.addColorStop(0, NAVY_TOP);
      base.addColorStop(0.5, NAVY_DEEP);
      base.addColorStop(1, NAVY_MID);
      ctx!.fillStyle = base;
      ctx!.fillRect(0, 0, width, height);

      const auraRadius =
        Math.max(width, height) * (0.32 + currentIntensity * 0.08) * (1 + Math.sin(time * 0.0006) * 0.04);
      const aura = ctx!.createRadialGradient(cx, cy, 0, cx, cy, auraRadius);
      aura.addColorStop(0, `rgba(${CREAM_RGB},${0.22 + currentIntensity * 0.16})`);
      aura.addColorStop(0.35, `rgba(${GOLD_RGB},${0.14 + currentIntensity * 0.1})`);
      aura.addColorStop(1, "rgba(10,14,31,0)");
      ctx!.fillStyle = aura;
      ctx!.fillRect(0, 0, width, height);

      if (!reducedMotion) {
        if (time - lastRippleTime > 2600) {
          ripples.push({ radius: auraRadius * 0.5, opacity: 0.16 + currentIntensity * 0.08 });
          lastRippleTime = time;
        }
        ctx!.save();
        ctx!.globalCompositeOperation = "lighter";
        for (let i = ripples.length - 1; i >= 0; i--) {
          const ring = ripples[i];
          ring.radius += dt * 0.03;
          ring.opacity -= dt * 0.00009;
          if (ring.opacity <= 0) {
            ripples.splice(i, 1);
            continue;
          }
          ctx!.beginPath();
          ctx!.strokeStyle = `rgba(${CREAM_RGB},${ring.opacity})`;
          ctx!.lineWidth = 1.4;
          ctx!.arc(cx, cy, ring.radius, 0, Math.PI * 2);
          ctx!.stroke();
        }
        ctx!.restore();

        ctx!.save();
        ctx!.globalCompositeOperation = "lighter";
        const rayCount = 4;
        for (let i = 0; i < rayCount; i++) {
          const angle = -0.5 + i * 0.32 + Math.sin(time * 0.00008 + i) * 0.05;
          ctx!.save();
          ctx!.translate(cx, cy - height * 0.15);
          ctx!.rotate(angle);
          const rayLength = height * 1.4;
          const rayWidth = width * 0.16;
          const grad = ctx!.createLinearGradient(0, -rayLength / 2, 0, rayLength / 2);
          grad.addColorStop(0, "rgba(212,175,55,0)");
          grad.addColorStop(0.5, `rgba(${GOLD_RGB},${0.05 + currentIntensity * 0.03})`);
          grad.addColorStop(1, "rgba(212,175,55,0)");
          ctx!.fillStyle = grad;
          ctx!.fillRect(-rayWidth / 2, -rayLength / 2, rayWidth, rayLength);
          ctx!.restore();
        }
        ctx!.restore();

        ctx!.save();
        ctx!.globalCompositeOperation = "lighter";
        for (const p of particles) {
          p.y -= p.speed * (dt * 0.06);
          p.driftPhase += p.driftSpeed * dt * 0.001;
          let dx = Math.sin(p.driftPhase) * 0.4;

          const mdx = p.x - mouse.x;
          const mdy = p.y - mouse.y;
          const dist = Math.sqrt(mdx * mdx + mdy * mdy);
          const repelRadius = 110;
          if (dist < repelRadius && dist > 0.01) {
            const force = (1 - dist / repelRadius) * 1.6;
            dx += (mdx / dist) * force;
            p.y += (mdy / dist) * force;
          }
          p.x += dx;

          if (p.y < -10) {
            p.y = height + 10;
            p.x = Math.random() * width;
          }
          if (p.x < -10) p.x = width + 10;
          if (p.x > width + 10) p.x = -10;

          const twinkle = 0.7 + 0.3 * Math.sin(time * 0.002 + p.driftPhase);
          ctx!.beginPath();
          ctx!.fillStyle = `rgba(${CREAM_RGB},${p.baseOpacity * twinkle})`;
          ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx!.fill();
        }
        ctx!.restore();
      }
    }

    function loop(now: number) {
      const dt = now - lastTime;
      lastTime = now;
      drawFrame(dt);
      if (running) rafId = requestAnimationFrame(loop);
    }

    function handleVisibility() {
      running = !document.hidden;
      if (running && !reducedMotion) {
        lastTime = performance.now();
        rafId = requestAnimationFrame(loop);
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);

    if (reducedMotion) {
      drawFrame(16);
    } else {
      rafId = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" />;
}
