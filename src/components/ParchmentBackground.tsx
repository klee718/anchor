import { useEffect, useRef } from "react";

const PAPER_TOP = "#F6F2E9";
const PAPER_MID = "#EDE8E0";
const PAPER_DEEP = "#E3DCCE";
const GOLD_RGB = "200,162,97";
const CREAM_RGB = "245,232,201";

interface Particle {
  x: number;
  y: number;
  r: number;
  baseOpacity: number;
  speed: number;
  driftPhase: number;
  driftSpeed: number;
}

/**
 * Warm, low-key companion to DivineBackground for content-heavy screens
 * (Dashboard): a parchment gradient with one slow-drifting sunbeam glow and
 * a light scattering of gold dust motes. No god-rays or ripples — this runs
 * behind scrollable reading content, so subtlety matters more than spectacle.
 */
export default function ParchmentBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isSmallScreen = window.innerWidth < 768;
    const particleCount = reducedMotion ? 0 : isSmallScreen ? 32 : 75;

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

    const particles: Particle[] = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 2 + 0.6,
      baseOpacity: Math.random() * 0.35 + 0.2,
      speed: Math.random() * 0.4 + 0.15,
      driftPhase: Math.random() * Math.PI * 2,
      driftSpeed: Math.random() * 0.4 + 0.15,
    }));

    let time = 0;
    let rafId = 0;
    let lastTime = performance.now();
    let running = !document.hidden;

    function drawFrame(dt: number) {
      time += dt;

      const base = ctx!.createLinearGradient(0, 0, width * 0.3, height);
      base.addColorStop(0, PAPER_TOP);
      base.addColorStop(0.55, PAPER_MID);
      base.addColorStop(1, PAPER_DEEP);
      ctx!.fillStyle = base;
      ctx!.fillRect(0, 0, width, height);

      const glowX = width * (0.78 + Math.sin(time * 0.00035) * 0.09);
      const glowY = height * (0.16 + Math.cos(time * 0.00028) * 0.06);
      const glowRadius = Math.max(width, height) * (0.55 + Math.sin(time * 0.0004) * 0.05);
      const glow = ctx!.createRadialGradient(glowX, glowY, 0, glowX, glowY, glowRadius);
      glow.addColorStop(0, `rgba(${CREAM_RGB},0.3)`);
      glow.addColorStop(0.4, `rgba(${GOLD_RGB},0.15)`);
      glow.addColorStop(1, "rgba(227,220,206,0)");
      ctx!.fillStyle = glow;
      ctx!.fillRect(0, 0, width, height);

      if (!reducedMotion) {
        ctx!.save();
        for (const p of particles) {
          p.y -= p.speed * (dt * 0.09);
          p.driftPhase += p.driftSpeed * dt * 0.0018;
          p.x += Math.sin(p.driftPhase) * 0.4;

          if (p.y < -10) {
            p.y = height + 10;
            p.x = Math.random() * width;
          }
          if (p.x < -10) p.x = width + 10;
          if (p.x > width + 10) p.x = -10;

          const twinkle = 0.65 + 0.35 * Math.sin(time * 0.0025 + p.driftPhase);
          ctx!.beginPath();
          ctx!.fillStyle = `rgba(${GOLD_RGB},${p.baseOpacity * twinkle})`;
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
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" />;
}
