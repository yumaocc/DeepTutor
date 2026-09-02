import React, {useCallback, useEffect} from 'react';
import {Platform} from 'react-native';
import {
  createNavigationContainerRef,
  NavigationContainer,
  type LinkingOptions,
} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';

import {ChatScreen} from '../../chat/ChatScreen';
import {LoginScreen} from '../../screens/auth/LoginScreen';
import {
  BootstrapScreen,
  FatalScreen,
  OfflineScreen,
  ServerSetupScreen,
  UpgradeRequiredScreen,
} from '../../screens/system/StartupScreens';
import {useStartup} from '../startup/StartupProvider';
import type {StartupState} from '../startup/types';
import type {RootStackParamList} from './types';

const Stack = createStackNavigator<RootStackParamList>();
const navigationRef = createNavigationContainerRef<RootStackParamList>();

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['deeptutor://'],
  config: {
    screens: {
      Login: 'login',
      Main: 'chat/:sessionId?',
      ServerSetup: 'server',
    },
  },
};

function routeForState(state: StartupState): keyof RootStackParamList {
  switch (state.phase) {
    case 'needs_server':
      return 'ServerSetup';
    case 'needs_auth':
      return 'Login';
    case 'ready':
      return 'Main';
    case 'offline':
      return 'Offline';
    case 'upgrade_required':
      return 'UpgradeRequired';
    case 'fatal':
      return 'Fatal';
    default:
      return 'Bootstrap';
  }
}

export function RootNavigator(): JSX.Element {
  const {state} = useStartup();
  const synchronizeRoute = useCallback(() => {
    if (!navigationRef.isReady()) {
      return;
    }
    const route = routeForState(state);
    if (navigationRef.getCurrentRoute()?.name === route) {
      return;
    }
    navigationRef.reset({index: 0, routes: [{name: route}]});
  }, [state]);

  useEffect(synchronizeRoute, [synchronizeRoute]);

  return (
    <NavigationContainer
      ref={navigationRef}
      linking={linking}
      onReady={synchronizeRoute}>
      <Stack.Navigator
        detachInactiveScreens={(Platform.OS as string) !== 'harmony'}
        initialRouteName="Bootstrap"
        screenOptions={{headerShown: false, gestureEnabled: true}}>
        <Stack.Screen name="Bootstrap" component={BootstrapScreen} />
        <Stack.Screen name="ServerSetup" component={ServerSetupScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Main" component={ChatScreen} />
        <Stack.Screen name="Offline" component={OfflineScreen} />
        <Stack.Screen
          name="UpgradeRequired"
          component={UpgradeRequiredScreen}
        />
        <Stack.Screen name="Fatal" component={FatalScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
