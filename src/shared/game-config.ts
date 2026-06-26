export const GAME_CONFIG = {
  gravity: 0.38,
  flapVelocity: -7.0,
  pipeWidth: 52,
  pipeGap: 165,
  pipeSpeed: 2.3,
  pipeSpawnIntervalMs: 2000,
  birdSize: 28,
  canvasWidth: 360,
  canvasHeight: 560,
  groundHeight: 48,
  maxScore: 9999,
  maxPlausibleScorePerSecond: 2,
  maxGameDurationMs: 600_000,
} as const;

export type GameConfig = typeof GAME_CONFIG;

// ─── Retro 16-bit pixel-art palette ──────────────────────────────────────────
// All colours are used exclusively in FlapGame.tsx's drawScene.

export const PIXEL_PALETTE = {
  // Sky bands (top → bottom, 7 horizontal strips)
  skyBands: [
    '#1a1a2e', // deep navy
    '#16213e', // dark blue
    '#0f3460', // mid blue
    '#1a4a7a', // blue
    '#2666a0', // lighter blue
    '#3a80b8', // sky blue
    '#5ba3d0', // pale sky
  ],

  // Stars / pixel dots in the upper sky
  star: '#e8f4f8',

  // Pixel clouds (two shades for dithered look)
  cloudLight: '#c8e6f5',
  cloudDark: '#a0cce8',

  // Ground
  groundBase: '#5a3a1a',  // dark brown earth
  groundTop: '#2d7a1e',   // bright green surface strip
  groundHighlight: '#3d9a2e', // lighter green pixel row

  // Pipes
  pipeBody: '#1a5c12',    // dark green body
  pipeHighlight: '#2d8f22', // left-edge highlight strip
  pipeShadow: '#0f3a0a',  // right-edge shadow strip
  pipeCap: '#0f3a0a',     // cap block (darker)
  pipeCapHighlight: '#2d8f22',

  // Bird (Snoo-inspired pixel sprite)
  birdBody: '#ff4500',    // reddit orange torso
  birdEye: '#ffffff',     // white eye
  birdPupil: '#000000',   // black pupil
  birdBeak: '#ffa500',    // orange beak
  birdHelmet: '#c0c0c0',  // silver helmet top
  birdHelmetStripe: '#888888',

  // Score text
  scoreText: '#ffffff',
  scoreTextShadow: '#000000',

  // Ready prompt
  promptText: '#ffe066',
  promptShadow: '#000000',

  // Parallax horizon line
  horizon: '#0a2a4a',
} as const;
