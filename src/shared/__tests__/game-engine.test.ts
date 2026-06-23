import { describe, expect, it } from 'vitest';
import {
  createInitialEngineState,
  flapBird,
  isScorePlausible,
  stepEngine,
} from '../game-engine';

describe('game-engine', () => {
  it('starts with zero score and no pipes', () => {
    const state = createInitialEngineState();
    expect(state.score).toBe(0);
    expect(state.pipes).toHaveLength(0);
  });

  it('applies flap velocity', () => {
    const flapped = flapBird(createInitialEngineState());
    expect(flapped.bird.velocity).toBeLessThan(0);
  });

  it('rejects implausible scores', () => {
    expect(isScorePlausible(100, 1000)).toBe(false);
    expect(isScorePlausible(2, 1000)).toBe(true);
  });

  it('eventually collides when stepping many frames', () => {
    let state = createInitialEngineState();
    let collided = false;
    for (let i = 0; i < 500 && !collided; i += 1) {
      const result = stepEngine(state, 16);
      state = result.state;
      collided = result.collided;
    }
    expect(collided).toBe(true);
  });
});
