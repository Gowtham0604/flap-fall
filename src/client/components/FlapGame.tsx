import { useCallback, useEffect, useRef, useState } from 'react';
import { GAME_CONFIG, PIXEL_PALETTE } from '../../shared/game-config';
import {
  createInitialEngineState,
  flapBird,
  stepEngine,
  type GameEngineState,
} from '../../shared/game-engine';
import type { AudioManager } from '../lib/audio';

export type GamePhase = 'ready' | 'playing' | 'dead';

type FlapGameProps = {
  onGameOver: (score: number, durationMs: number) => void;
  onStart?: () => void;
  audioManager?: AudioManager | null;
};

// ─── Pixel helpers ────────────────────────────────────────────────────────────

/** Draw a solid pixel-art rectangle (no anti-aliasing). */
const px = (
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

// ─── Explosion particle type ──────────────────────────────────────────────────
type ExplosionParticle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  maxLife: number;
  size: number;
};

// ─── Static star positions (seeded so they don't move between frames) ─────────
const STARS: { x: number; y: number; size: number }[] = Array.from(
  { length: 28 },
  (_, i) => ({
    x: ((i * 137 + 41) % GAME_CONFIG.canvasWidth),
    y: ((i * 97 + 13) % (GAME_CONFIG.canvasHeight * 0.45)),
    size: i % 3 === 0 ? 2 : 1,
  })
);

// ─── Cloud definitions (static, scroll via offset) ───────────────────────────
type Cloud = { x: number; y: number; w: number; layer: number };
const BASE_CLOUDS: Cloud[] = [
  { x: 40, y: 60, w: 48, layer: 0 },
  { x: 160, y: 90, w: 64, layer: 0 },
  { x: 280, y: 50, w: 40, layer: 0 },
  { x: 80, y: 130, w: 56, layer: 1 },
  { x: 220, y: 115, w: 72, layer: 1 },
];

const drawCloud = (ctx: CanvasRenderingContext2D, cx: number, cy: number, cw: number): void => {
  const h = 12;
  px(ctx, PIXEL_PALETTE.cloudLight, cx, cy + 4, cw, h - 4);
  px(ctx, PIXEL_PALETTE.cloudLight, cx + 4, cy, 12, 8);
  px(ctx, PIXEL_PALETTE.cloudLight, cx + cw / 2 - 8, cy - 4, 16, 10);
  px(ctx, PIXEL_PALETTE.cloudLight, cx + cw - 18, cy, 12, 8);
  px(ctx, PIXEL_PALETTE.cloudDark, cx, cy + h, cw, 2);
};

const drawSky = (ctx: CanvasRenderingContext2D, cloudOffsets: [number, number]): void => {
  const { canvasWidth, canvasHeight, groundHeight } = GAME_CONFIG;
  const skyH = canvasHeight - groundHeight;
  const bands = PIXEL_PALETTE.skyBands;
  const bandH = Math.ceil(skyH / bands.length);
  for (let i = 0; i < bands.length; i++) {
    px(ctx, bands[i]!, 0, i * bandH, canvasWidth, bandH);
  }
  for (const star of STARS) {
    px(ctx, PIXEL_PALETTE.star, star.x, star.y, star.size, star.size);
  }
  for (const cloud of BASE_CLOUDS) {
    const offset = cloudOffsets[cloud.layer as 0 | 1];
    const x = ((cloud.x - offset) % (canvasWidth + 80) + canvasWidth + 80) % (canvasWidth + 80) - 80;
    drawCloud(ctx, x, cloud.y, cloud.w);
  }
};

// ─── Draw ground ──────────────────────────────────────────────────────────────
const drawGround = (ctx: CanvasRenderingContext2D): void => {
  const { canvasWidth, canvasHeight, groundHeight } = GAME_CONFIG;
  const groundY = canvasHeight - groundHeight;
  px(ctx, PIXEL_PALETTE.groundBase, 0, groundY + 12, canvasWidth, groundHeight - 12);
  px(ctx, PIXEL_PALETTE.groundTop, 0, groundY, canvasWidth, 12);
  px(ctx, PIXEL_PALETTE.groundHighlight, 0, groundY, canvasWidth, 4);
  for (let tx = 0; tx < canvasWidth; tx += 18) {
    px(ctx, '#3d2010', tx, groundY + 20, 2, 6);
  }
};

// ─── Draw a single pipe pair ──────────────────────────────────────────────────
const drawPipe = (ctx: CanvasRenderingContext2D, x: number, gapY: number): void => {
  const { pipeWidth, pipeGap, canvasHeight, groundHeight } = GAME_CONFIG;
  const CAP_H = 14;
  const CAP_OVERHANG = 4;
  const bodyW = pipeWidth;
  const capW = bodyW + CAP_OVERHANG * 2;
  const capX = x - CAP_OVERHANG;
  const topPipeH = gapY - CAP_H;
  if (topPipeH > 0) {
    px(ctx, PIXEL_PALETTE.pipeBody, x, 0, bodyW, topPipeH);
    px(ctx, PIXEL_PALETTE.pipeHighlight, x, 0, 6, topPipeH);
    px(ctx, PIXEL_PALETTE.pipeShadow, x + bodyW - 6, 0, 6, topPipeH);
  }
  px(ctx, PIXEL_PALETTE.pipeCap, capX, gapY - CAP_H, capW, CAP_H);
  px(ctx, PIXEL_PALETTE.pipeCapHighlight, capX, gapY - CAP_H, capW, 4);
  px(ctx, PIXEL_PALETTE.pipeShadow, capX, gapY - 4, capW, 4);
  const bottomY = gapY + pipeGap;
  const bottomH = canvasHeight - groundHeight - bottomY;
  px(ctx, PIXEL_PALETTE.pipeCap, capX, bottomY, capW, CAP_H);
  px(ctx, PIXEL_PALETTE.pipeCapHighlight, capX, bottomY, capW, 4);
  px(ctx, PIXEL_PALETTE.pipeShadow, capX, bottomY + CAP_H - 4, capW, 4);
  if (bottomH > 0) {
    px(ctx, PIXEL_PALETTE.pipeBody, x, bottomY + CAP_H, bodyW, bottomH);
    px(ctx, PIXEL_PALETTE.pipeHighlight, x, bottomY + CAP_H, 6, bottomH);
    px(ctx, PIXEL_PALETTE.pipeShadow, x + bodyW - 6, bottomY + CAP_H, 6, bottomH);
  }
};

// ─── Draw Unicorn Horse (pixel-art alicorn facing right) ─────────────────────
const drawUnicorn = (
  ctx: CanvasRenderingContext2D,
  birdX: number,
  birdY: number,
  velocity: number,
  tick: number
): void => {
  const S = GAME_CONFIG.birdSize; // 28px collision box

  const legSwing = Math.sin(tick * 0.28) * 3;
  const tailWave = Math.sin(tick * 0.18) * 2;
  const wingFlap = Math.sin(tick * 0.22) * 3;
  const rotation = Math.min(Math.max(velocity * 2.5, -25), 65);

  ctx.save();
  ctx.translate(Math.round(birdX + S / 2), Math.round(birdY + S / 2));
  ctx.rotate((rotation * Math.PI) / 180);

  const BODY  = '#f7eedc';
  const SHADE = '#d8c4a8';
  const MANE1 = '#cc44ff';
  const MANE2 = '#ff44aa';
  const MANE3 = '#44aaff';
  const MANE4 = '#ffcc44';
  const HORN1 = '#ffd700';
  const HORN2 = '#fff8a0';
  const EYE1  = '#2a1060';
  const EYE2  = '#7c50d0';
  const HOOF  = '#3a2010';
  const NOSE  = '#c89080';
  const WING1 = '#e0f2ff';
  const WING2 = '#a8d8f0';
  const WING3 = '#70b4e0';
  const LEG   = '#ead4b8';

  // ── Wing (drawn behind body) ──────────────────────────────────────────────
  const wy = -10 + wingFlap;
  px(ctx, WING1, -6, wy - 6, 14, 5);
  px(ctx, WING2, -10, wy - 4, 8, 6);
  px(ctx, WING3, -13, wy - 2, 6, 5);
  px(ctx, WING1, -15, wy, 4, 3);
  px(ctx, WING2, -16, wy + 2, 3, 3);

  // ── Tail (flows left, animated) ───────────────────────────────────────────
  const tw = tailWave;
  px(ctx, MANE1, -14, -3 + tw, 5, 4);
  px(ctx, MANE2, -15, 0 + tw, 4, 4);
  px(ctx, MANE3, -14, 3 + tw, 4, 4);
  px(ctx, MANE4, -15, 6 + tw, 3, 3);
  px(ctx, MANE1, -13, 8 + tw, 3, 3);

  // ── Body ─────────────────────────────────────────────────────────────────
  px(ctx, BODY,  -12, -5, 22, 11);
  px(ctx, BODY,  -10, -7, 18, 15);
  px(ctx, SHADE, -12,  5, 22,  2);

  // ── Neck ─────────────────────────────────────────────────────────────────
  px(ctx, BODY,   7, -11,  6,  8);
  px(ctx, SHADE, 11, -10,  2,  7);

  // ── Head ─────────────────────────────────────────────────────────────────
  px(ctx, BODY,   9, -15, 12, 11);
  px(ctx, SHADE,  9,  -5, 12,  2);

  // ── Muzzle / snout ────────────────────────────────────────────────────────
  px(ctx, BODY,  18,  -9,  5,  6);
  px(ctx, SHADE, 18,  -4,  5,  1);
  px(ctx, NOSE,  20,  -8,  2,  2);

  // ── Horn (gold spike) ─────────────────────────────────────────────────────
  px(ctx, HORN1, 13, -23,  3, 10);
  px(ctx, HORN1, 14, -26,  2,  4);
  px(ctx, HORN1, 15, -28,  1,  3);
  px(ctx, HORN2, 13, -23,  1, 10);
  px(ctx, HORN2, 14, -26,  1,  4);

  // ── Ear ──────────────────────────────────────────────────────────────────
  px(ctx, BODY,  12, -19,  4,  5);
  px(ctx, MANE2, 13, -18,  2,  3);

  // ── Eye ──────────────────────────────────────────────────────────────────
  px(ctx, EYE1,  14, -13,  4,  3);
  px(ctx, EYE2,  14, -13,  3,  2);
  px(ctx, '#000000', 15, -12,  2,  1);
  px(ctx, '#ffffff', 16, -13,  1,  1);

  // ── Rainbow mane (neck + flowing back) ───────────────────────────────────
  px(ctx, MANE1,  5, -15,  5,  4);
  px(ctx, MANE2,  3, -14,  5,  4);
  px(ctx, MANE3,  1, -13,  5,  3);
  px(ctx, MANE4, -1, -12,  5,  3);
  px(ctx, MANE1, -3, -11,  4,  3);
  // Forelock (between horn and ear)
  px(ctx, MANE2, 11, -16,  3,  3);
  px(ctx, MANE3, 12, -17,  2,  2);

  // ── Legs (animated running) ───────────────────────────────────────────────
  const ls = Math.round(legSwing);
  px(ctx, LEG,  5, 6, 3, 5 + ls);
  px(ctx, HOOF, 5, 10 + ls, 3, 2);
  px(ctx, LEG,  1, 6, 3, 5 - ls);
  px(ctx, HOOF, 1, 10 - ls, 3, 2);
  px(ctx, LEG, -4, 6, 3, 5 - ls);
  px(ctx, HOOF, -4, 10 - ls, 3, 2);
  px(ctx, LEG, -9, 6, 3, 5 + ls);
  px(ctx, HOOF, -9, 10 + ls, 3, 2);

  ctx.restore();
};

// ─── Create rainbow explosion particles ───────────────────────────────────────
const createExplosion = (cx: number, cy: number): ExplosionParticle[] => {
  const colors = [
    '#cc44ff', '#ff44aa', '#44aaff', '#ffcc44',
    '#ff4444', '#44ff88', '#ffd700', '#ffffff',
    '#ff8800', '#00ffcc',
  ];
  const particles: ExplosionParticle[] = [];

  // Main burst — 36 particles in a circle
  for (let i = 0; i < 36; i++) {
    const angle = (i / 36) * Math.PI * 2;
    const speed = 2.5 + Math.random() * 5;
    const life = 35 + Math.floor(Math.random() * 25);
    particles.push({
      x: cx, y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1.5,
      color: colors[i % colors.length]!,
      life, maxLife: life,
      size: 2 + Math.floor(Math.random() * 3),
    });
  }

  // Sparkle stars — 12 slower bigger pieces
  for (let i = 0; i < 12; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.5 + Math.random() * 3;
    const life = 45 + Math.floor(Math.random() * 20);
    particles.push({
      x: cx, y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 0.5,
      color: i % 2 === 0 ? '#ffd700' : '#ffffff',
      life, maxLife: life,
      size: 4,
    });
  }

  return particles;
};

// ─── Update + draw explosion particles each frame ─────────────────────────────
const tickExplosion = (
  ctx: CanvasRenderingContext2D,
  particles: ExplosionParticle[]
): ExplosionParticle[] => {
  const alive: ExplosionParticle[] = [];
  for (const p of particles) {
    p.life -= 1;
    if (p.life <= 0) continue;
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.18;   // gravity
    p.vx *= 0.97;   // air drag
    ctx.globalAlpha = p.life / p.maxLife;
    px(ctx, p.color, p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    alive.push(p);
  }
  ctx.globalAlpha = 1;
  return alive;
};

// ─── Score display ────────────────────────────────────────────────────────────
const drawScore = (ctx: CanvasRenderingContext2D, score: number): void => {
  const { canvasWidth } = GAME_CONFIG;
  const text = String(score);
  ctx.font = 'bold 38px "Courier New", Courier, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = PIXEL_PALETTE.scoreTextShadow;
  ctx.fillText(text, canvasWidth / 2 + 2, 14);
  ctx.fillStyle = PIXEL_PALETTE.scoreText;
  ctx.fillText(text, canvasWidth / 2, 12);
};

// ─── Ready prompt ─────────────────────────────────────────────────────────────
const drawReadyPrompt = (ctx: CanvasRenderingContext2D, tick: number): void => {
  const { canvasWidth, canvasHeight, groundHeight } = GAME_CONFIG;
  const pulse = 0.7 + 0.3 * Math.sin(tick * 0.07);

  const cx = canvasWidth / 2;
  // Position in the lower-center zone, well above ground, clear of the unicorn
  const cy = Math.round((canvasHeight - groundHeight) * 0.76);

  const boxW = 196;
  const boxH = 56;
  const bx = Math.round(cx - boxW / 2);
  const by = Math.round(cy - boxH / 2);

  // Background panel
  ctx.globalAlpha = pulse * 0.9;
  ctx.fillStyle = '#080f28';
  ctx.fillRect(bx, by, boxW, boxH);

  // Gold border (2 px, drawn as four thin rects)
  ctx.globalAlpha = pulse;
  ctx.fillStyle = '#ffd700';
  ctx.fillRect(bx, by, boxW, 2);
  ctx.fillRect(bx, by + boxH - 2, boxW, 2);
  ctx.fillRect(bx, by, 2, boxH);
  ctx.fillRect(bx + boxW - 2, by, 2, boxH);

  // Main label shadow then text
  ctx.font = 'bold 22px "Courier New", Courier, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#000';
  ctx.fillText('TAP  TO  FLAP', cx + 2, by + boxH * 0.38 + 2);
  ctx.fillStyle = PIXEL_PALETTE.promptText;
  ctx.fillText('TAP  TO  FLAP', cx, by + boxH * 0.38);

  // Sub-hint
  ctx.font = '11px "Courier New", Courier, monospace';
  ctx.fillStyle = '#5ba3d0';
  ctx.fillText('or press Space / Enter', cx, by + boxH * 0.77);

  ctx.globalAlpha = 1;
};

// ─── Full scene ───────────────────────────────────────────────────────────────
const drawScene = (
  ctx: CanvasRenderingContext2D,
  state: GameEngineState,
  phase: GamePhase,
  cloudOffsets: [number, number],
  tick: number,
  explosionParticles: ExplosionParticle[]
): void => {
  const birdX = GAME_CONFIG.canvasWidth * 0.25;

  drawSky(ctx, cloudOffsets);

  for (const pipe of state.pipes) {
    drawPipe(ctx, pipe.x, pipe.gapY);
  }

  drawGround(ctx);

  // Only draw the unicorn while alive; explosion takes over when dead
  if (phase !== 'dead' || explosionParticles.length === 0) {
    drawUnicorn(ctx, birdX, state.bird.y, state.bird.velocity, tick);
  }

  drawScore(ctx, state.score);

  if (phase === 'ready') {
    drawReadyPrompt(ctx, tick);
  }
};

// ─── Component ────────────────────────────────────────────────────────────────

export const FlapGame = ({ onGameOver, onStart, audioManager }: FlapGameProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngineState>(createInitialEngineState());
  const phaseRef = useRef<GamePhase>('ready');
  const startTimeRef = useRef<number>(0);
  const frameRef = useRef<number>(0);
  const lastFrameRef = useRef<number>(0);
  const tickRef = useRef<number>(0);
  const cloudOffsetsRef = useRef<[number, number]>([0, 0]);
  const lastScoreRef = useRef<number>(0);
  const explosionRef = useRef<ExplosionParticle[]>([]);

  const [, setPhase] = useState<GamePhase>('ready');

  const handleFlap = useCallback(() => {
    if (phaseRef.current === 'dead') return;

    if (phaseRef.current === 'ready') {
      phaseRef.current = 'playing';
      setPhase('playing');
      engineRef.current = createInitialEngineState();
      startTimeRef.current = performance.now();
      lastFrameRef.current = performance.now();
      lastScoreRef.current = 0;
      onStart?.();
    }

    engineRef.current = flapBird(engineRef.current);
    audioManager?.playFlap();
  }, [audioManager, onStart]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;

    const loop = (now: number): void => {
      const deltaMs = lastFrameRef.current ? now - lastFrameRef.current : 16;
      lastFrameRef.current = now;
      tickRef.current += 1;

      cloudOffsetsRef.current = [
        cloudOffsetsRef.current[0] + 0.3 * (deltaMs / 16),
        cloudOffsetsRef.current[1] + 0.55 * (deltaMs / 16),
      ];

      if (phaseRef.current === 'playing') {
        const result = stepEngine(engineRef.current, deltaMs);
        engineRef.current = result.state;

        if (result.state.score > lastScoreRef.current) {
          lastScoreRef.current = result.state.score;
          audioManager?.playScore();
        }

        if (result.collided) {
          phaseRef.current = 'dead';
          setPhase('dead');
          audioManager?.playDie();
          // Spawn explosion at unicorn center
          const birdX = GAME_CONFIG.canvasWidth * 0.25 + GAME_CONFIG.birdSize / 2;
          const birdY = result.state.bird.y + GAME_CONFIG.birdSize / 2;
          explosionRef.current = createExplosion(birdX, birdY);
          const durationMs = Math.round(now - startTimeRef.current);
          onGameOver(result.state.score, durationMs);
        }
      }

      drawScene(
        ctx,
        engineRef.current,
        phaseRef.current,
        cloudOffsetsRef.current,
        tickRef.current,
        explosionRef.current
      );

      // Tick explosion particles (mutates & trims the array)
      if (explosionRef.current.length > 0) {
        explosionRef.current = tickExplosion(ctx, explosionRef.current);
      }

      frameRef.current = requestAnimationFrame(loop);
    };

    frameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameRef.current);
  }, [onGameOver, audioManager]);

  return (
    <div className="relative w-full h-full flex items-start justify-center">
      <canvas
        ref={canvasRef}
        width={GAME_CONFIG.canvasWidth}
        height={GAME_CONFIG.canvasHeight}
        className="block cursor-pointer touch-none"
        style={{
          imageRendering: 'pixelated',
          width: 'auto',
          height: 'min(calc(100dvh - 210px), 560px)',
          maxWidth: '100%',
          aspectRatio: `${GAME_CONFIG.canvasWidth} / ${GAME_CONFIG.canvasHeight}`,
        }}
        onClick={handleFlap}
        onTouchStart={(e) => { e.preventDefault(); handleFlap(); }}
        role="button"
        tabIndex={0}
        aria-label="Flap game canvas — tap or press Space to flap"
        onKeyDown={(e) => {
          if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); handleFlap(); }
        }}
      />
    </div>
  );
};
