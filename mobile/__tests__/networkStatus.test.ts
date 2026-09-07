import {describe, expect, it} from '@jest/globals';

import {networkStatusFromState} from '../src/platform/network/networkState';

describe('network status', () => {
  it('allows self-hosted servers when the public internet probe fails', () => {
    expect(
      networkStatusFromState({
        type: 'wifi',
        isConnected: true,
        isInternetReachable: false,
        details: {isConnectionExpensive: false},
      }),
    ).toMatchObject({status: 'online', type: 'wifi'});
  });

  it('reports offline when no network transport is connected', () => {
    expect(
      networkStatusFromState({
        type: 'none',
        isConnected: false,
        isInternetReachable: false,
        details: null,
      }),
    ).toMatchObject({status: 'offline', type: 'none'});
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
