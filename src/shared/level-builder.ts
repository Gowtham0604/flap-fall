// ─── Grid constants ─────────────────────────────────────────────────────────
export const GRID_COLS = 20;
export const GRID_ROWS = 14;
export const CELL_SIZE = 18; // pixels per cell in the builder canvas

// ─── Cell types ─────────────────────────────────────────────────────────────
export type CellType = 'empty' | 'block' | 'spike' | 'coin' | 'start' | 'end';

export const CELL_COLORS: Record<CellType, string> = {
  empty: 'transparent',
  block: '#3a5e2b',   // dark green pixel block
  spike: '#c0392b',   // red spike
  coin: '#f1c40f',    // gold coin
  start: '#2980b9',   // blue start marker
  end: '#8e44ad',     // purple end marker
};

// ─── Cell ────────────────────────────────────────────────────────────────────
export type LevelCell = {
  col: number; // 0-indexed, 0 = left
  row: number; // 0-indexed, 0 = top
  type: CellType;
};

// ─── Metadata ────────────────────────────────────────────────────────────────
export type LevelMetadata = {
  id: string;               // UUID v4
  authorId: string;
  authorUsername: string;
  title: string;
  description: string;
  createdAt: number;        // Unix ms
  updatedAt: number;        // Unix ms
  publishedAt: number | null;
  plays: number;
  rating: number;           // weighted average 1–5
  ratingCount: number;
};

// ─── Full level ───────────────────────────────────────────────────────────────
export type Level = {
  meta: LevelMetadata;
  grid: LevelCell[]; // sparse — only non-empty cells stored
};

// ─── Request / response types ─────────────────────────────────────────────────
export type LevelSaveRequest = {
  levelId: string | null;   // null = new level
  title: string;
  description: string;
  grid: LevelCell[];
};

export type LevelSaveResponse = {
  type: 'level-save';
  levelId: string;
};

export type LevelPublishRequest = {
  levelId: string;
};

export type LevelPublishResponse = {
  type: 'level-publish';
  levelId: string;
};

export type LevelListEntry = LevelMetadata;

export type LevelListResponse = {
  type: 'level-list';
  levels: LevelListEntry[];
  cursor: string | null; // opaque pagination cursor (stringified zrank offset)
};

export type LevelGetResponse = {
  type: 'level-get';
  level: Level;
};

export type LevelRateRequest = {
  levelId: string;
  rating: number; // 1–5 integer
};

export type LevelRateResponse = {
  type: 'level-rate';
  newAverage: number;
  ratingCount: number;
};

// ─── Validation helpers ───────────────────────────────────────────────────────

export const MAX_LEVEL_TITLE_LENGTH = 60;
export const MAX_LEVEL_DESCRIPTION_LENGTH = 200;
export const MAX_CELLS = GRID_COLS * GRID_ROWS; // 280

export const isValidGrid = (grid: LevelCell[]): boolean => {
  if (grid.length > MAX_CELLS) return false;
  const seen = new Set<string>();
  for (const cell of grid) {
    if (
      !Number.isInteger(cell.col) ||
      !Number.isInteger(cell.row) ||
      cell.col < 0 ||
      cell.col >= GRID_COLS ||
      cell.row < 0 ||
      cell.row >= GRID_ROWS
    ) {
      return false;
    }
    const key = `${cell.col}:${cell.row}`;
    if (seen.has(key)) return false;
    seen.add(key);
  }
  return true;
};
