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
  // Android's public-internet probe can fail while a private or self-hosted
  // DeepTutor server remains reachable. Treat an active transport as online
  // and let the real API request determine server reachability.
  const offline = state.isConnected === false;
  const online = state.isConnected === true;
  return {
    status: offline ? 'offline' : online ? 'online' : 'unknown',
    type: state.type,
    expensive: Boolean(state.details?.isConnectionExpensive),
  };
}
