import {describe, expect, it} from '@jest/globals';

import {networkStatusFromState} from '../src/platform/network/networkState';

describe('network status', () => {
  it('does not report online when internet reachability is false', () => {
    expect(
      networkStatusFromState({
        type: 'wifi',
        isConnected: true,
        isInternetReachable: false,
        details: {isConnectionExpensive: false},
      }),
    ).toMatchObject({status: 'offline', type: 'wifi'});
  });

  it('preserves unknown while native reachability is unresolved', () => {
    expect(
      networkStatusFromState({
        type: 'unknown',
        isConnected: null,
        isInternetReachable: null,
        details: null,
      }),
    ).toMatchObject({status: 'unknown'});
  });
});
