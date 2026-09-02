import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import NetInfo, {type NetInfoState} from '@react-native-community/netinfo';
import {onlineManager} from '@tanstack/react-query';

import {appLogger} from '../../observability/logger';
import {
  networkStatusFromState,
  UNKNOWN_NETWORK,
  type NetworkSnapshot,
} from './networkState';

const NetworkStatusContext = createContext<NetworkSnapshot | null>(null);

export function NetworkStatusProvider({
  children,
}: React.PropsWithChildren): JSX.Element {
  const [snapshot, setSnapshot] = useState<NetworkSnapshot>(UNKNOWN_NETWORK);

  useEffect(() => {
    const update = (state: NetInfoState) => {
      const next = networkStatusFromState(state);
      setSnapshot(next);
      onlineManager.setOnline(next.status !== 'offline');
    };
    NetInfo.fetch()
      .then(update)
      .catch(error =>
        appLogger.child('network').warn('Initial network query failed', error),
      );
    const unsubscribe = NetInfo.addEventListener(update);
    return () => {
      unsubscribe();
      onlineManager.setOnline(true);
    };
  }, []);

  const value = useMemo(() => snapshot, [snapshot]);
  return (
    <NetworkStatusContext.Provider value={value}>
      {children}
    </NetworkStatusContext.Provider>
  );
}

export function useNetworkStatus(): NetworkSnapshot {
  const value = useContext(NetworkStatusContext);
  if (!value) {
    throw new Error(
      'useNetworkStatus must be used inside NetworkStatusProvider',
    );
  }
  return value;
}
