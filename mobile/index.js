/**
 * @format
 */

import 'react-native-gesture-handler';
import {Platform} from 'react-native';
import {enableScreens} from 'react-native-screens';
import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';

// Harmony currently uses React Native views for navigation screens.
enableScreens(Platform.OS !== 'harmony');

AppRegistry.registerComponent(appName, () => App);
