import {afterEach, beforeEach, describe, expect, it, jest} from '@jest/globals';
import {withMinimumDuration} from '../src/chat/minimumDuration';

describe('minimum loading duration', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('keeps a fast success pending until the minimum expires', async () => {
    let finished = false;
    const task = withMinimumDuration(async () => 'ready', 450).then(value => {
      finished = true;
      return value;
    });
    await jest.advanceTimersByTimeAsync(449);
    expect(finished).toBe(false);
    await jest.advanceTimersByTimeAsync(1);
    await expect(task).resolves.toBe('ready');
  });

  it('preserves an error after the same minimum duration', async () => {
    const error = new Error('offline');
    let result: unknown;
    const task = withMinimumDuration(async () => {
      throw error;
    }, 450).catch(value => {
      result = value;
    });
    await jest.advanceTimersByTimeAsync(449);
    expect(result).toBeUndefined();
    await jest.advanceTimersByTimeAsync(1);
    await task;
    expect(result).toBe(error);
  });

  it('does not add another delay to an already slow request', async () => {
    const task = withMinimumDuration(
      () =>
        new Promise(resolve => {
          setTimeout(() => resolve('ready'), 800);
        }),
      450,
    );
    await jest.advanceTimersByTimeAsync(800);
    await expect(task).resolves.toBe('ready');
    expect(jest.getTimerCount()).toBe(0);
  });
});
