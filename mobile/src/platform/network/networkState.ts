export type NetworkStatus = 'unknown' | 'online' | 'offline';

export interface NetworkSnapshot {
  status: NetworkStatus;
  type: string;
  expensive: boolean;
}

export interface NetworkStateLike {
  type: string;
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
  details: {isConnectionExpensive?: boolean} | null;
}

export const UNKNOWN_NETWORK: NetworkSnapshot = {
  status: 'unknown',
  type: 'unknown',
  expensive: false,
};

export function networkStatusFromState(
  state: NetworkStateLike,
): NetworkSnapshot {
  const offline =
    state.isConnected === false || state.isInternetReachable === false;
  const online =
    state.isConnected === true && state.isInternetReachable !== false;
  return {
    status: offline ? 'offline' : online ? 'online' : 'unknown',
    type: state.type,
    expensive: Boolean(state.details?.isConnectionExpensive),
  };
}
