import React from 'react';
import {StatusBar} from 'react-native';
import {useTheme} from 'react-native-paper';

export function SystemBars(): JSX.Element {
  const theme = useTheme();
  return (
    <StatusBar
      animated
      backgroundColor={theme.colors.background}
      barStyle={theme.dark ? 'light-content' : 'dark-content'}
    />
  );
}
