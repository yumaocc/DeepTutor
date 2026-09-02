import { RNPackage, RNPackageContext } from '@rnoh/react-native-openharmony/ts';
import { AsyncStoragePackage } from '@react-native-oh-tpl/async-storage/ts';
import { NetInfoPackage } from '@react-native-oh-tpl/netinfo/ts';
import { GestureHandlerPackage } from '@react-native-oh-tpl/react-native-gesture-handler/ts';
import { ReanimatedPackage } from '@react-native-oh-tpl/react-native-reanimated/ts';
import { SafeAreaViewPackage } from '@react-native-oh-tpl/react-native-safe-area-context/ts';

export function createRNPackages(ctx: RNPackageContext): RNPackage[] {
  return [
    new AsyncStoragePackage(ctx),
    new NetInfoPackage(ctx),
    new GestureHandlerPackage(ctx),
    new ReanimatedPackage(ctx),
    new SafeAreaViewPackage(ctx),
  ];
}
