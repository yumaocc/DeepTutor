import {tokens as base} from './tokens';
import {paperTheme} from './paperTheme';
// Hallmark: studied reference — Keitoto Conversation & Response Flow.
// Native adaptation: centered welcome, compact prompt cards, open transcript.
export const chatTokens = {
  ...base,
  chat: {
    ...base.chat,
    headerHeight: 56,
    indicatorWidth: 4,
    indicatorHeight: 4,
    brandSize: 17,
    brandTracking: -0.3,
    emptyTitle: 27,
    emptyLine: 37,
    gutter: 20,
    messageGap: 24,
    composerElevation: 2,
    composerShadowOpacity: 0.06,
    welcomeMark: 64,
    welcomeMaxWidth: 360,
    welcomeBottomSpace: 64,
    cardHeight: 86,
    title1: 23,
    title2: 20,
    title3: 18,
    bodyLine: 26,
  },
} as const;
export const chatTheme = {
  ...paperTheme,
  colors: {
    ...paperTheme.colors,
    primary: chatTokens.color.primary,
    primaryContainer: chatTokens.color.primaryMuted,
    onPrimaryContainer: chatTokens.color.primaryPressed,
    background: chatTokens.color.canvas,
    surface: chatTokens.color.surface,
    surfaceVariant: chatTokens.color.surfaceMuted,
    onSurface: chatTokens.color.ink,
    onSurfaceVariant: chatTokens.color.body,
    outline: chatTokens.color.border,
    outlineVariant: chatTokens.color.border,
  },
};
