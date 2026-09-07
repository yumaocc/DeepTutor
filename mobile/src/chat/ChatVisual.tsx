import React from 'react';
import {Image, StyleSheet, View} from 'react-native';
import Svg, {Defs, RadialGradient, Stop, Path} from 'react-native-svg';
import {chatTokens as tokens} from '../theme/chatTheme';
export function ChatAtmosphere() {
  return (
    <View pointerEvents="none" style={styles.glow}>
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 400 340"
        preserveAspectRatio="none">
        <Defs>
          <RadialGradient id="wash" cx="0.12" cy="0" rx="1.1" ry="1">
            <Stop offset="0" stopColor={tokens.color.atmosphereTop} />
            <Stop
              offset=".5"
              stopColor={tokens.color.atmosphereMiddle}
              stopOpacity=".75"
            />
            <Stop offset="1" stopColor={tokens.color.canvas} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Path d="M0 0H400V340H0Z" fill="url(#wash)" />
      </Svg>
    </View>
  );
}
export function ChatOrb({size = 96}: {size?: number}) {
  return (
    <Image
      source={require('./assets/chat-orb.png')}
      resizeMode="contain"
      style={{width: size, height: size, borderRadius: size / 2}}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}
const styles = StyleSheet.create({
  glow: {position: 'absolute', top: 0, left: 0, right: 0, height: 440},
});
