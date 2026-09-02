import {MD3LightTheme, type MD3Theme} from 'react-native-paper';

import {tokens} from './tokens';

export const paperTheme: MD3Theme = {
  ...MD3LightTheme,
  roundness: tokens.radius.md,
  colors: {
    ...MD3LightTheme.colors,
    primary: tokens.color.primary,
    primaryContainer: tokens.color.primaryMuted,
    onPrimary: tokens.color.onPrimary,
    onPrimaryContainer: tokens.color.primaryPressed,
    background: tokens.color.canvas,
    surface: tokens.color.surface,
    surfaceVariant: tokens.color.surfaceMuted,
    onSurface: tokens.color.ink,
    onSurfaceVariant: tokens.color.body,
    outline: tokens.color.border,
    error: tokens.color.error,
    errorContainer: tokens.color.errorSoft,
    onErrorContainer: tokens.color.error,
  },
};
