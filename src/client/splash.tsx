import './index.css';

import { navigateTo, context, requestExpandedMode } from '@devvit/web/client';
import { StrictMode, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { InitResponse } from '../shared/api';
import { PIXEL_PALETTE, GAME_CONFIG } from '../shared/game-config';

// ─── Preview canvas dimensions ────────────────────────────────────────────────
const PREVIEW_W = 320;
const PREVIEW_H = 160;

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

  // Second cloud offset by half width
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

  // top body
  r(ctx, PIXEL_PALETTE.pipeBody,         pipeX,            0,         pW,        gapY - capH);
  r(ctx, PIXEL_PALETTE.pipeHighlight,    pipeX,            0,         5,         gapY - capH);
  // top cap
  r(ctx, PIXEL_PALETTE.pipeCap,          pipeX - capOver,  gapY - capH, pW + capOver * 2, capH);
  r(ctx, PIXEL_PALETTE.pipeCapHighlight, pipeX - capOver,  gapY - capH, pW + capOver * 2, 3);
  // bottom cap
  const botY = gapY + gapH;
  r(ctx, PIXEL_PALETTE.pipeCap,          pipeX - capOver,  botY,      pW + capOver * 2, capH);
  r(ctx, PIXEL_PALETTE.pipeCapHighlight, pipeX - capOver,  botY,      pW + capOver * 2, 3);
  // bottom body
  const botBodyH = H - groundH - botY - capH;
  if (botBodyH > 0) {
    r(ctx, PIXEL_PALETTE.pipeBody,      pipeX,  botY + capH, pW, botBodyH);
    r(ctx, PIXEL_PALETTE.pipeHighlight, pipeX,  botY + capH, 5,  botBodyH);
  }

  // ── Unicorn character (simplified but uses unicorn colours) ───────────────
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

  // Body
  r(ctx, BODY,  birdX - 6,  birdY + 2,  18, 9);
  r(ctx, BODY,  birdX - 4,  birdY,      14, 13);
  r(ctx, SHADE, birdX - 6,  birdY + 10, 18, 2);
  // Wing
  r(ctx, WING,  birdX - 9,  birdY - 2,  8,  4);
  r(ctx, WING,  birdX - 12, birdY,      6,  4);
  // Neck + head
  r(ctx, BODY,  birdX + 9,  birdY - 3,  5,  6);
  r(ctx, BODY,  birdX + 11, birdY - 7,  8,  8);
  // Snout
  r(ctx, BODY,  birdX + 17, birdY - 3,  3,  4);
  // Horn
  r(ctx, HORN,  birdX + 12, birdY - 13, 2,  7);
  r(ctx, HORN,  birdX + 13, birdY - 15, 1,  3);
  // Eye
  r(ctx, EYE,   birdX + 13, birdY - 5,  3,  2);
  r(ctx, '#fff', birdX + 15, birdY - 5, 1,  1);
  // Mane
  r(ctx, MANE1, birdX + 7,  birdY - 7,  3,  3);
  r(ctx, MANE2, birdX + 5,  birdY - 5,  3,  3);
  r(ctx, MANE3, birdX + 3,  birdY - 3,  3,  3);
  // Tail
  r(ctx, MANE1, birdX - 10, birdY + 1,  4,  3);
  r(ctx, MANE2, birdX - 11, birdY + 4,  3,  3);
  // Legs
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
      className="flex flex-col items-center justify-center min-h-screen gap-4 px-4 py-6 relative"
      style={{ background: '#1a1a2e', fontFamily: '"Courier New", Courier, monospace' }}
    >
      {/* ── Title ────────────────────────────────────────────────────────── */}
      <div className="text-center">
        <h1
          className="text-3xl font-bold uppercase tracking-widest"
          style={{ color: '#ffd700', textShadow: '3px 3px 0 #0f3460' }}
        >
          Flap  Fall
        </h1>
        <p className="text-xs mt-1 tracking-widest uppercase" style={{ color: '#5ba3d0' }}>
          Hey {username}! Daily challenge awaits.
        </p>
      </div>

      {/* ── Animated preview canvas ───────────────────────────────────────── */}
      <div
        style={{
          border: '3px solid #ffd700',
          boxShadow: '0 6px 0 #0f3460, 0 0 20px rgba(255, 215, 0, 0.15)',
          borderRadius: '4px',
          overflow: 'hidden',
          lineHeight: 0,
        }}
      >
        <canvas
          ref={canvasRef}
          width={PREVIEW_W}
          height={PREVIEW_H}
          style={{ display: 'block', imageRendering: 'pixelated', maxWidth: '100%' }}
          aria-label="Flap Fall game preview"
        />
      </div>

      {/* ── Stat pills ───────────────────────────────────────────────────── */}
      {preview && (
        <div className="flex flex-wrap gap-2 justify-center">
          <span className="px-2.5 py-1 rounded text-xs uppercase tracking-wider border bg-[#0f3460] border-[#3a80b8] text-[#ffd700]">
            🔥 {preview.stats.streak.current}d streak
          </span>
          <span className="px-2.5 py-1 rounded text-xs uppercase tracking-wider border bg-[#0f3460] border-[#3a80b8] text-[#ffd700]">
            🏆 Best: {preview.stats.personalBest}
          </span>
          <span className="px-2.5 py-1 rounded text-xs uppercase tracking-wider border bg-[#0f3460] border-[#3a80b8] text-[#ffd700]">
            💎 {preview.stats.gems}
          </span>
          <span className="px-2.5 py-1 rounded text-xs uppercase tracking-wider border bg-[#0f3460] border-[#3a80b8] text-[#5ba3d0]">
            👥 {preview.playersToday} today
          </span>
        </div>
      )}

      {/* ── Play button ───────────────────────────────────────────────────── */}
      <button
        type="button"
        className="font-bold text-lg uppercase tracking-widest px-12 py-4 rounded-lg cursor-pointer select-none active:translate-y-1 active:shadow-none transition-transform"
        style={{
          background: 'linear-gradient(180deg, #ff5c1a 0%, #d93900 100%)',
          color: '#fff',
          border: '3px solid #ff7a3d',
          boxShadow: '0 6px 0 #7a1e00',
          letterSpacing: '0.18em',
        }}
        onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}
      >
        ▶ &nbsp;Tap to Play
      </button>

      <p className="text-xs text-center max-w-xs leading-relaxed" style={{ color: '#3a80b8' }}>
        Dodge the pipes · beat the daily leaderboard · earn gems
      </p>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="absolute bottom-4 flex gap-4 text-xs" style={{ color: '#2a5070' }}>
        <button
          type="button"
          className="cursor-pointer hover:text-[#ffd700] transition-colors bg-transparent border-0"
          onClick={() => navigateTo('https://developers.reddit.com/docs')}
        >
          Docs
        </button>
        <span>|</span>
        <button
          type="button"
          className="cursor-pointer hover:text-[#ffd700] transition-colors bg-transparent border-0"
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
