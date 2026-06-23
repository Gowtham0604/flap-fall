import { GAME_CONFIG } from './game-config';

export type Pipe = {
  id: number;
  x: number;
  gapY: number;
  passed: boolean;
};

export type BirdState = {
  y: number;
  velocity: number;
};

export type GameEngineState = {
  bird: BirdState;
  pipes: Pipe[];
  score: number;
  elapsedMs: number;
  nextPipeId: number;
  nextPipeSpawnMs: number;
};

export const createInitialEngineState = (): GameEngineState => {
  const playableHeight =
    GAME_CONFIG.canvasHeight -
    GAME_CONFIG.groundHeight -
    GAME_CONFIG.birdSize;
  return {
    bird: {
      y: playableHeight / 2,
      velocity: 0,
    },
    pipes: [],
    score: 0,
    elapsedMs: 0,
    nextPipeId: 1,
    nextPipeSpawnMs: GAME_CONFIG.pipeSpawnIntervalMs,
  };
};

const randomGapY = (): number => {
  const minGap = 80;
  const maxGap =
    GAME_CONFIG.canvasHeight -
    GAME_CONFIG.groundHeight -
    GAME_CONFIG.pipeGap -
    80;
  return minGap + Math.random() * (maxGap - minGap);
};

const spawnPipe = (state: GameEngineState): Pipe => {
  const pipe: Pipe = {
    id: state.nextPipeId,
    x: GAME_CONFIG.canvasWidth + GAME_CONFIG.pipeWidth,
    gapY: randomGapY(),
    passed: false,
  };
  state.nextPipeId += 1;
  return pipe;
};

export const flapBird = (state: GameEngineState): GameEngineState => {
  return {
    ...state,
    bird: {
      ...state.bird,
      velocity: GAME_CONFIG.flapVelocity,
    },
  };
};

const birdX = (): number => GAME_CONFIG.canvasWidth * 0.25;

const collidesWithPipe = (birdY: number, pipe: Pipe): boolean => {
  const left = pipe.x;
  const right = pipe.x + GAME_CONFIG.pipeWidth;
  const birdLeft = birdX();
  const birdRight = birdLeft + GAME_CONFIG.birdSize;
  const birdTop = birdY;
  const birdBottom = birdY + GAME_CONFIG.birdSize;

  if (birdRight < left || birdLeft > right) {
    return false;
  }

  const gapTop = pipe.gapY;
  const gapBottom = pipe.gapY + GAME_CONFIG.pipeGap;
  return birdTop < gapTop || birdBottom > gapBottom;
};

const collidesWithBounds = (birdY: number): boolean => {
  if (birdY < 0) {
    return true;
  }
  const groundY =
    GAME_CONFIG.canvasHeight - GAME_CONFIG.groundHeight - GAME_CONFIG.birdSize;
  return birdY > groundY;
};

export type StepResult = {
  state: GameEngineState;
  collided: boolean;
};

export const stepEngine = (
  state: GameEngineState,
  deltaMs: number
): StepResult => {
  const elapsedMs = state.elapsedMs + deltaMs;
  let pipes = state.pipes.map((pipe) => ({
    ...pipe,
    x: pipe.x - GAME_CONFIG.pipeSpeed * (deltaMs / 16),
  }));

  let nextPipeSpawnMs = state.nextPipeSpawnMs - deltaMs;
  if (nextPipeSpawnMs <= 0) {
    pipes = [...pipes, spawnPipe(state)];
    nextPipeSpawnMs = GAME_CONFIG.pipeSpawnIntervalMs;
  }

  pipes = pipes.filter(
    (pipe) => pipe.x + GAME_CONFIG.pipeWidth > -GAME_CONFIG.pipeWidth
  );

  const velocity =
    state.bird.velocity + GAME_CONFIG.gravity * (deltaMs / 16);
  const y = state.bird.y + velocity * (deltaMs / 16);

  let score = state.score;
  pipes = pipes.map((pipe) => {
    if (!pipe.passed && pipe.x + GAME_CONFIG.pipeWidth < birdX()) {
      score += 1;
      return { ...pipe, passed: true };
    }
    return pipe;
  });

  const nextState: GameEngineState = {
    bird: { y, velocity },
    pipes,
    score,
    elapsedMs,
    nextPipeId: state.nextPipeId,
    nextPipeSpawnMs,
  };

  const hitPipe = pipes.some((pipe) => collidesWithPipe(y, pipe));
  const hitBounds = collidesWithBounds(y);

  return {
    state: nextState,
    collided: hitPipe || hitBounds,
  };
};

export const isScorePlausible = (
  score: number,
  durationMs: number
): boolean => {
  if (score < 0 || score > GAME_CONFIG.maxScore) {
    return false;
  }
  if (durationMs < 0 || durationMs > GAME_CONFIG.maxGameDurationMs) {
    return false;
  }
  const maxByTime = Math.ceil(
    (durationMs / 1000) * GAME_CONFIG.maxPlausibleScorePerSecond
  );
  return score <= maxByTime + 2;
};
