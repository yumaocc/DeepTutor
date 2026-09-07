import React from 'react';
import {LaunchExperience} from './src/app/startup/LaunchExperience';
import {AppProviders} from './src/app/AppProviders';
import {RootNavigator} from './src/app/navigation/RootNavigator';
import {StartupProvider} from './src/app/startup/StartupProvider';

function App(): JSX.Element {
  return (
    <AppProviders>
      <StartupProvider>
        <LaunchExperience>
          <RootNavigator />
        </LaunchExperience>
      </StartupProvider>
    </AppProviders>
  );
}
export default App;
