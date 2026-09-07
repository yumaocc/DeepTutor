import React from 'react';
import {afterEach, describe, expect, it, jest} from '@jest/globals';
import renderer, {act} from 'react-test-renderer';
import {AccessibilityInfo, Animated, AppState} from 'react-native';
import {ThinkingIndicator} from '../src/chat/ThinkingIndicator';

afterEach(() => jest.restoreAllMocks());
describe('native thinking feedback', () => {
  it('uses a static accessible status when reduced motion is enabled', async () => {
    jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockResolvedValue(true);
    const loop = jest.spyOn(Animated, 'loop');
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<ThinkingIndicator />);
    });
    expect(loop).not.toHaveBeenCalled();
    expect(
      tree.root.findAllByProps({accessibilityRole: 'progressbar'})[0].props
        .accessibilityState,
    ).toEqual({busy: true});
    act(() => tree.unmount());
  });
  it('stops every native animation when the pending message disappears', async () => {
    let activate = () => {};
    jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((_event, listener) => {
        activate = () => listener('active');
        return {remove: jest.fn()};
      });
    jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockResolvedValue(false);
    const start = jest.fn();
    const stop = jest.fn();
    jest
      .spyOn(Animated, 'loop')
      .mockReturnValue({start, stop, reset: jest.fn()});
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<ThinkingIndicator />);
    });
    act(() => activate());
    expect(start).toHaveBeenCalledTimes(3);
    act(() => tree.unmount());
    expect(stop).toHaveBeenCalledTimes(3);
  });
});
