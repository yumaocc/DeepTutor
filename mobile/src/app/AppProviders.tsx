import React, {useEffect, useState} from 'react';
import {AppState, StyleSheet} from 'react-native';
import {focusManager, QueryClientProvider} from '@tanstack/react-query';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {PaperProvider} from 'react-native-paper';
import {
  initialWindowMetrics,
  SafeAreaProvider,
} from 'react-native-safe-area-context';

import {SystemBars} from '../components/system/SystemBars';
import {createAppQueryClient} from '../data/query/createAppQueryClient';
import {NetworkStatusProvider} from '../platform/network/NetworkStatusProvider';
import {KeyboardMetricsProvider} from '../platform/keyboard/KeyboardMetricsProvider';
import {paperTheme} from '../theme/paperTheme';
import {AppErrorBoundary} from './AppErrorBoundary';

export function AppProviders({children}: React.PropsWithChildren): JSX.Element {
  const [queryClient] = useState(createAppQueryClient);

  useEffect(() => {
    focusManager.setFocused(AppState.currentState === 'active');
    const subscription = AppState.addEventListener('change', state => {
      focusManager.setFocused(state === 'active');
    });
    return () => {
      subscription.remove();
      focusManager.setFocused(undefined);
    };
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <NetworkStatusProvider>
          <KeyboardMetricsProvider>
            <QueryClientProvider client={queryClient}>
              <PaperProvider theme={paperTheme}>
                <SystemBars />
                <AppErrorBoundary>{children}</AppErrorBoundary>
              </PaperProvider>
            </QueryClientProvider>
          </KeyboardMetricsProvider>
        </NetworkStatusProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({root: {flex: 1}});
