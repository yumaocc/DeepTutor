import React from 'react';
import {afterEach, beforeEach, describe, expect, it, jest} from '@jest/globals';
import renderer, {act} from 'react-test-renderer';
import {AccessibilityInfo, View} from 'react-native';
import {LaunchExperience} from '../src/app/startup/LaunchExperience';

let mockPhase = 'booting';
jest.mock('../src/app/startup/StartupProvider', () => ({
  useStartup: () => ({state: {phase: mockPhase}}),
}));
beforeEach(() => {
  jest.useFakeTimers();
  mockPhase = 'booting';
  jest
    .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
    .mockResolvedValue(true);
});
afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

describe('launch handoff', () => {
  it.each(['ready', 'needs_auth', 'offline', 'fatal'])(
    'reveals %s without hiding the destination',
    async phase => {
      let tree!: renderer.ReactTestRenderer;
      await act(async () => {
        tree = renderer.create(
          <LaunchExperience>
            <View testID="destination" />
          </LaunchExperience>,
        );
      });
      await act(async () => {
        await jest.advanceTimersByTimeAsync(1500);
      });
      expect(
        tree.root.findAllByProps({accessibilityLabel: 'DeepTutor 正在启动'})
          .length,
      ).toBeGreaterThan(0);
      mockPhase = phase;
      await act(async () => {
        tree.update(
          <LaunchExperience>
            <View testID="destination" />
          </LaunchExperience>,
        );
      });
      await act(async () => {
        await jest.advanceTimersByTimeAsync(500);
      });
      expect(
        tree.root.findAllByProps({accessibilityLabel: 'DeepTutor 正在启动'}),
      ).toHaveLength(0);
      expect(
        tree.root.findAllByProps({testID: 'destination'}).length,
      ).toBeGreaterThan(0);
      act(() => tree.unmount());
    },
  );
});
