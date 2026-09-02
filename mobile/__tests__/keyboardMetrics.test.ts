import {describe, expect, it} from '@jest/globals';
import type {KeyboardEvent} from 'react-native';

import {keyboardMetricsFromEvent} from '../src/platform/keyboard/KeyboardMetricsProvider';

describe('keyboard metrics', () => {
  it('uses the visible viewport overlap and preserves animation timing', () => {
    const event = {
      duration: 280,
      easing: 'keyboard',
      endCoordinates: {height: 300, screenX: 0, screenY: 500, width: 390},
      startCoordinates: {height: 0, screenX: 0, screenY: 800, width: 390},
      isEventFromThisApp: true,
    } as KeyboardEvent;

    expect(keyboardMetricsFromEvent(event, 800)).toEqual({
      visible: true,
      height: 300,
      screenY: 500,
      duration: 280,
      easing: 'keyboard',
    });
  });
});
