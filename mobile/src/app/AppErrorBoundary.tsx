import React from 'react';
import {StyleSheet, View} from 'react-native';
import {Button, Text} from 'react-native-paper';

import {SafeAreaScreen} from '../components/layout/SafeAreaScreen';
import {appLogger} from '../observability/logger';
import {tokens} from '../theme/tokens';

interface AppErrorBoundaryState {
  error: Error | null;
}

export class AppErrorBoundary extends React.Component<
  React.PropsWithChildren,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = {error: null};

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return {error};
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    appLogger.error('Unhandled render error', {
      error,
      componentStack: info.componentStack,
    });
  }

  private retry = () => this.setState({error: null});

  render(): React.ReactNode {
    if (!this.state.error) {
      return this.props.children;
    }
    return (
      <SafeAreaScreen>
        <View style={styles.content}>
          <Text variant="headlineSmall" style={styles.title}>
            页面暂时无法显示
          </Text>
          <Text variant="bodyLarge" style={styles.body}>
            应用遇到了意外问题。你可以重试；如果问题持续出现，请重新启动应用。
          </Text>
          <Button mode="contained" onPress={this.retry}>
            重试
          </Button>
        </View>
      </SafeAreaScreen>
    );
  }
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: tokens.space.lg,
    gap: tokens.space.md,
    backgroundColor: tokens.color.canvas,
  },
  title: {color: tokens.color.ink, fontWeight: '700'},
  body: {color: tokens.color.body, lineHeight: 25},
});
