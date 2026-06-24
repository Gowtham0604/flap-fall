import './index.css';

import { navigateTo, context, requestExpandedMode } from '@devvit/web/client';
import { StrictMode, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { InitResponse } from '../shared/api';
import { PIXEL_PALETTE, GAME_CONFIG } from '../shared/game-config';

// ─── Preview canvas dimensions ────────────────────────────────────────────────
const PREVIEW_W = 320;
const PREVIEW_H = 160;

// ─── Background star field (percentage positions) ─────────────────────────────
const BG_STARS = [
  { x:  4, y:  7, s: 2, d: 0.0 },
  { x: 12, y:  2, s: 1, d: 0.5 },
  { x: 19, y: 15, s: 2, d: 1.1 },
  { x: 29, y:  4, s: 1, d: 0.3 },
  { x: 38, y: 19, s: 2, d: 0.8 },
  { x: 52, y:  6, s: 1, d: 1.4 },
  { x: 64, y: 13, s: 2, d: 0.6 },
  { x: 75, y:  3, s: 1, d: 1.0 },
  { x: 84, y: 11, s: 2, d: 0.2 },
  { x: 94, y:  6, s: 1, d: 1.7 },
  { x:  7, y: 88, s: 2, d: 0.9 },
  { x: 22, y: 93, s: 1, d: 0.4 },
  { x: 47, y: 91, s: 2, d: 1.2 },
  { x: 71, y: 94, s: 1, d: 0.7 },
  { x: 88, y: 87, s: 2, d: 1.5 },
  { x:  2, y: 52, s: 1, d: 0.6 },
  { x: 97, y: 47, s: 2, d: 1.0 },
  { x: 50, y: 97, s: 1, d: 0.3 },
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const r = (
  ctx: CanvasRenderingContext2D,
  color: string,
  x: number,
  y: number,
  w: number,
  h: number
): void => {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
};

// ─── Animated preview scene ───────────────────────────────────────────────────
const drawPreview = (canvas: HTMLCanvasElement, tick: number): void => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.imageSmoothingEnabled = false;

  const W = PREVIEW_W;
  const H = PREVIEW_H;
  const groundH = 22;
  const skyH = H - groundH;

  // ── Sky gradient bands ─────────────────────────────────────────────────────
  const bands = PIXEL_PALETTE.skyBands;
  const bandH = Math.ceil(skyH / bands.length);
  for (let i = 0; i < bands.length; i++) {
    r(ctx, bands[i]!, 0, i * bandH, W, bandH);
  }

  // ── Stars ──────────────────────────────────────────────────────────────────
  ctx.fillStyle = PIXEL_PALETTE.star;
  ([ [22, 8], [75, 20], [155, 6], [228, 16], [290, 10], [110, 28] ] as [number, number][])
    .forEach(([x, y]) => ctx.fillRect(x, y, 2, 2));

  // ── Scrolling cloud ────────────────────────────────────────────────────────
  const cloudX = ((W + 64) - (tick * 0.45) % (W + 64)) - 64;
  r(ctx, PIXEL_PALETTE.cloudLight, cloudX,      30, 52, 10);
  r(ctx, PIXEL_PALETTE.cloudLight, cloudX + 6,  22, 14, 10);
  r(ctx, PIXEL_PALETTE.cloudLight, cloudX + 24, 18, 18, 12);
  r(ctx, PIXEL_PALETTE.cloudLight, cloudX + 38, 24, 12,  8);
  r(ctx, PIXEL_PALETTE.cloudDark,  cloudX,      38, 52,  2);

  const cloudX2 = ((W + 64) - ((tick * 0.45 + (W / 2 + 32)) % (W + 64))) - 64;
  r(ctx, PIXEL_PALETTE.cloudLight, cloudX2,      44, 38, 8);
  r(ctx, PIXEL_PALETTE.cloudLight, cloudX2 + 4,  38, 10, 8);
  r(ctx, PIXEL_PALETTE.cloudLight, cloudX2 + 18, 34, 14, 10);
  r(ctx, PIXEL_PALETTE.cloudDark,  cloudX2,      50, 38, 2);

  // ── Ground ─────────────────────────────────────────────────────────────────
  r(ctx, PIXEL_PALETTE.groundBase,      0, H - groundH + 10, W, groundH - 10);
  r(ctx, PIXEL_PALETTE.groundTop,       0, H - groundH,      W, 10);
  r(ctx, PIXEL_PALETTE.groundHighlight, 0, H - groundH,      W,  3);
  for (let tx = 0; tx < W; tx += 18) {
    r(ctx, '#3d2010', tx, H - groundH + 18, 2, 4);
  }

  // ── Scrolling pipe pair ────────────────────────────────────────────────────
  const pipeX = ((W + GAME_CONFIG.pipeWidth) - (tick * 1.1) % (W + GAME_CONFIG.pipeWidth)) - GAME_CONFIG.pipeWidth;
  const gapY = 62;
  const gapH = 44;
  const capH = 10;
  const capOver = 4;
  const pW = GAME_CONFIG.pipeWidth;

  r(ctx, PIXEL_PALETTE.pipeBody,         pipeX,            0,         pW,        gapY - capH);
  r(ctx, PIXEL_PALETTE.pipeHighlight,    pipeX,            0,         5,         gapY - capH);
  r(ctx, PIXEL_PALETTE.pipeCap,          pipeX - capOver,  gapY - capH, pW + capOver * 2, capH);
  r(ctx, PIXEL_PALETTE.pipeCapHighlight, pipeX - capOver,  gapY - capH, pW + capOver * 2, 3);
  const botY = gapY + gapH;
  r(ctx, PIXEL_PALETTE.pipeCap,          pipeX - capOver,  botY,      pW + capOver * 2, capH);
  r(ctx, PIXEL_PALETTE.pipeCapHighlight, pipeX - capOver,  botY,      pW + capOver * 2, 3);
  const botBodyH = H - groundH - botY - capH;
  if (botBodyH > 0) {
    r(ctx, PIXEL_PALETTE.pipeBody,      pipeX,  botY + capH, pW, botBodyH);
    r(ctx, PIXEL_PALETTE.pipeHighlight, pipeX,  botY + capH, 5,  botBodyH);
  }

  // ── Unicorn character ─────────────────────────────────────────────────────
  const birdX = Math.round(W * 0.22);
  const birdY = Math.round(56 + Math.sin(tick * 0.07) * 10);

  const BODY  = '#f7eedc';
  const SHADE = '#d8c4a8';
  const MANE1 = '#cc44ff';
  const MANE2 = '#ff44aa';
  const MANE3 = '#44aaff';
  const HORN  = '#ffd700';
  const EYE   = '#2a1060';
  const WING  = '#a8d8f0';
  const LEG   = '#ead4b8';
  const HOOF  = '#3a2010';

  r(ctx, BODY,  birdX - 6,  birdY + 2,  18, 9);
  r(ctx, BODY,  birdX - 4,  birdY,      14, 13);
  r(ctx, SHADE, birdX - 6,  birdY + 10, 18, 2);
  r(ctx, WING,  birdX - 9,  birdY - 2,  8,  4);
  r(ctx, WING,  birdX - 12, birdY,      6,  4);
  r(ctx, BODY,  birdX + 9,  birdY - 3,  5,  6);
  r(ctx, BODY,  birdX + 11, birdY - 7,  8,  8);
  r(ctx, BODY,  birdX + 17, birdY - 3,  3,  4);
  r(ctx, HORN,  birdX + 12, birdY - 13, 2,  7);
  r(ctx, HORN,  birdX + 13, birdY - 15, 1,  3);
  r(ctx, EYE,   birdX + 13, birdY - 5,  3,  2);
  r(ctx, '#fff', birdX + 15, birdY - 5, 1,  1);
  r(ctx, MANE1, birdX + 7,  birdY - 7,  3,  3);
  r(ctx, MANE2, birdX + 5,  birdY - 5,  3,  3);
  r(ctx, MANE3, birdX + 3,  birdY - 3,  3,  3);
  r(ctx, MANE1, birdX - 10, birdY + 1,  4,  3);
  r(ctx, MANE2, birdX - 11, birdY + 4,  3,  3);
  const ls = Math.round(Math.sin(tick * 0.25) * 2);
  r(ctx, LEG,  birdX + 2,  birdY + 12, 2, 4 + ls);
  r(ctx, HOOF, birdX + 2,  birdY + 15 + ls, 2, 2);
  r(ctx, LEG,  birdX - 2,  birdY + 12, 2, 4 - ls);
  r(ctx, HOOF, birdX - 2,  birdY + 15 - ls, 2, 2);
  r(ctx, LEG,  birdX - 7,  birdY + 12, 2, 4 + ls);
  r(ctx, HOOF, birdX - 7,  birdY + 15 + ls, 2, 2);
};

// ─── Splash component ─────────────────────────────────────────────────────────
export const Splash = () => {
  const [preview, setPreview] = useState<InitResponse | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tickRef = useRef(0);
  const frameRef = useRef(0);

  useEffect(() => {
    void fetch('/api/init')
      .then((res) => res.json())
      .then((data: InitResponse) => setPreview(data))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const loop = (): void => {
      tickRef.current += 1;
      drawPreview(canvas, tickRef.current);
      frameRef.current = requestAnimationFrame(loop);
    };
    frameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameRef.current);
  }, []);

  const username = context.username ?? preview?.username ?? 'player';

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen gap-3 px-4 py-6 relative overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse at 50% 30%, #0f3460 0%, #1a1a2e 52%, #09090f 100%)',
        fontFamily: '"Courier New", Courier, monospace',
      }}
    >
      {/* ── Background star field ─────────────────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        {BG_STARS.map((s, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              left: `${s.x}%`,
              top: `${s.y}%`,
              width: s.s,
              height: s.s,
              background: '#e8f4f8',
              animation: `star-twinkle ${1.8 + s.d}s ease-in-out infinite`,
              animationDelay: `${s.d}s`,
            }}
          />
        ))}
      </div>

      {/* ── Title ────────────────────────────────────────────────────────── */}
      <div className="text-center z-10">
        <h1
          className="text-4xl font-bold uppercase"
          style={{
            letterSpacing: '0.22em',
            background:
              'linear-gradient(90deg, #bb8800 0%, #ffd700 28%, #fff7b0 50%, #ffd700 72%, #bb8800 100%)',
            backgroundSize: '200% auto',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            animation: 'title-shimmer 3.5s linear infinite',
            filter: 'drop-shadow(0 0 14px rgba(255,215,0,0.55))',
          }}
        >
          Flap&nbsp;&nbsp;Fall
        </h1>
        <p
          className="text-xs mt-1.5 tracking-widest uppercase"
          style={{ color: '#4a90c8', letterSpacing: '0.15em' }}
        >
          Hey {username}! Daily challenge awaits.
        </p>
      </div>

      {/* ── Animated preview canvas ───────────────────────────────────────── */}
      <div className="z-10 relative">
        {/* Outer ambient glow layer */}
        <div
          style={{
            padding: '4px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, rgba(255,215,0,0.18) 0%, rgba(15,52,96,0.6) 50%, rgba(255,215,0,0.12) 100%)',
            animation: 'canvas-glow 2.4s ease-in-out infinite',
          }}
        >
          {/* Inner gold border frame */}
          <div
            style={{
              border: '3px solid #ffd700',
              borderRadius: '4px',
              overflow: 'hidden',
              lineHeight: 0,
              boxShadow: 'inset 0 0 24px rgba(0,0,0,0.6)',
              position: 'relative',
            }}
          >
            <canvas
              ref={canvasRef}
              width={PREVIEW_W}
              height={PREVIEW_H}
              style={{ display: 'block', imageRendering: 'pixelated', maxWidth: '100%' }}
              aria-label="Flap Fall game preview"
            />
            {/* Scanline overlay for retro depth */}
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.08) 3px, rgba(0,0,0,0.08) 4px)',
                pointerEvents: 'none',
              }}
            />
          </div>
        </div>

        {/* Corner pixel decorations */}
        {(['top-0 left-0', 'top-0 right-0', 'bottom-0 left-0', 'bottom-0 right-0'] as const).map((pos) => (
          <div
            key={pos}
            className={`absolute ${pos} w-2 h-2`}
            aria-hidden="true"
            style={{ background: '#ffd700', opacity: 0.7 }}
          />
        ))}
      </div>

      {/* ── Stat pills ───────────────────────────────────────────────────── */}
      {preview && (
        <div className="flex flex-wrap gap-2 justify-center z-10">
          {/* Streak — warm orange */}
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs uppercase tracking-wider font-bold"
            style={{
              background: 'linear-gradient(135deg, #3a1a00, #1f0d00)',
              border: '1px solid #b84800',
              color: '#ff8040',
              boxShadow: '0 0 8px rgba(255,100,0,0.2)',
            }}
          >
            <span>🔥</span>
            <span>{preview.stats.streak.current}D STREAK</span>
          </div>

          {/* Best score — gold */}
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs uppercase tracking-wider font-bold"
            style={{
              background: 'linear-gradient(135deg, #2a2000, #131000)',
              border: '1px solid #8a6800',
              color: '#ffd700',
              boxShadow: '0 0 8px rgba(255,215,0,0.2)',
            }}
          >
            <span>🏆</span>
            <span>BEST: {preview.stats.personalBest}</span>
          </div>

          {/* Gems — cyan */}
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs uppercase tracking-wider font-bold"
            style={{
              background: 'linear-gradient(135deg, #001a2a, #000d14)',
              border: '1px solid #0076a8',
              color: '#40c8ff',
              boxShadow: '0 0 8px rgba(0,180,255,0.2)',
            }}
          >
            <span>💎</span>
            <span>{preview.stats.gems}</span>
          </div>

          {/* Players today — purple */}
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs uppercase tracking-wider font-bold"
            style={{
              background: 'linear-gradient(135deg, #16072a, #0a0314)',
              border: '1px solid #6030a0',
              color: '#b080ff',
              boxShadow: '0 0 8px rgba(150,80,255,0.2)',
            }}
          >
            <span>👥</span>
            <span>{preview.playersToday} TODAY</span>
          </div>
        </div>
      )}

      {/* ── Play button with pulse ring ───────────────────────────────────── */}
      <div className="relative z-10">
        {/* Animated pulse ring */}
        <div
          aria-hidden="true"
          className="absolute inset-0 rounded-lg pointer-events-none"
          style={{
            border: '3px solid rgba(255, 90, 26, 0.6)',
            animation: 'btn-pulse-ring 1.6s ease-out infinite',
          }}
        />
        <button
          type="button"
          className="relative font-bold text-lg uppercase tracking-widest px-12 py-4 rounded-lg cursor-pointer select-none active:translate-y-1 transition-transform"
          style={{
            background: 'linear-gradient(180deg, #ff6a2a 0%, #e84000 50%, #c43000 100%)',
            color: '#fff',
            border: '3px solid #ff8050',
            boxShadow: '0 6px 0 #7a1e00, 0 0 28px rgba(255,90,0,0.35)',
            letterSpacing: '0.18em',
            textShadow: '0 2px 4px rgba(0,0,0,0.4)',
          }}
          onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}
        >
          ▶&nbsp;&nbsp;Tap to Play
        </button>
      </div>

      {/* ── Description ──────────────────────────────────────────────────── */}
      <p className="text-xs text-center max-w-xs leading-relaxed z-10" style={{ color: '#2e6a9a' }}>
        Dodge the pipes · beat the daily leaderboard · earn gems
      </p>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="absolute bottom-4 flex gap-4 text-xs z-10" style={{ color: '#1e4060' }}>
        <button
          type="button"
          className="cursor-pointer hover:text-[#ffd700] transition-colors bg-transparent border-0"
          style={{ color: 'inherit' }}
          onClick={() => navigateTo('https://developers.reddit.com/docs')}
        >
          Docs
        </button>
        <span>|</span>
        <button
          type="button"
          className="cursor-pointer hover:text-[#ffd700] transition-colors bg-transparent border-0"
          style={{ color: 'inherit' }}
          onClick={() => navigateTo('https://www.reddit.com/r/Devvit')}
        >
          r/Devvit
        </button>
      </footer>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Splash />
  </StrictMode>
);
