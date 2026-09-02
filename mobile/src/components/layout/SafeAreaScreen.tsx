import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {SafeAreaView, type Edge} from 'react-native-safe-area-context';

interface SafeAreaScreenProps extends React.PropsWithChildren {
  edges?: Edge[];
  keyboardAvoiding?: boolean;
  keyboardVerticalOffset?: number;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  testID?: string;
}

export function SafeAreaScreen({
  children,
  edges = ['top', 'right', 'bottom', 'left'],
  keyboardAvoiding = true,
  keyboardVerticalOffset = 0,
  style,
  contentStyle,
  testID,
}: SafeAreaScreenProps): JSX.Element {
  return (
    <SafeAreaView
      edges={edges}
      style={[styles.safeArea, style]}
      testID={testID}>
      <KeyboardAvoidingView
        behavior={
          keyboardAvoiding && Platform.OS === 'ios' ? 'padding' : undefined
        }
        enabled={keyboardAvoiding}
        keyboardVerticalOffset={keyboardVerticalOffset}
        style={[styles.content, contentStyle]}>
        {children}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {flex: 1},
  content: {flex: 1},
});
