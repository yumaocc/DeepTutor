import {
  AnyJSBundleProvider,
  ComponentBuilderContext,
  FileJSBundleProvider,
  MetroJSBundleProvider,
  ResourceJSBundleProvider,
  RNApp,
  RNOHCoreContext,
  RNOHErrorDialog,
  TraceJSBundleProviderDecorator,
} from '@rnoh/react-native-openharmony';
import { WebView } from '@react-native-oh-tpl/react-native-webview';
import { createRNPackages } from '../RNPackagesFactory';

@Builder
export function buildCustomRNComponent(ctx: ComponentBuilderContext) {
  if (ctx.componentName === 'RNCWebView') {
    WebView({ ctx: ctx.rnComponentContext, tag: ctx.tag });
  }
}

const wrappedCustomRNComponentBuilder = wrapBuilder(buildCustomRNComponent);

@Entry
@Component
struct Index {
  @StorageLink('RNOHCoreContext')
  private rnohCoreContext: RNOHCoreContext | undefined = undefined;

  @State
  private isReady: boolean = false;

  aboutToAppear() {
    this.isReady = true;
  }

  onBackPress(): boolean {
    this.rnohCoreContext?.dispatchBackPress();
    return true;
  }

  build() {
    Column() {
      if (this.rnohCoreContext && this.isReady) {
        if (this.rnohCoreContext.isDebugModeEnabled) {
          RNOHErrorDialog({ ctx: this.rnohCoreContext });
        }

        RNApp({
          rnInstanceConfig: {
            createRNPackages,
            enableNDKTextMeasuring: true,
            enableBackgroundExecutor: false,
            enableCAPIArchitecture: true,
            arkTsComponentNames: ['RNCWebView'],
            fontResourceByFontFamily: {
              'Material Design Icons': $rawfile('fonts/MaterialCommunityIcons.ttf'),
            },
          },
          initialProps: {},
          appKey: 'DeepTutorRNOH',
          wrappedCustomRNComponentBuilder,
          onSetUp: (rnInstance) => {
            rnInstance.enableFeatureFlag('ENABLE_RN_INSTANCE_CLEAN_UP');
          },
          jsBundleProvider: new TraceJSBundleProviderDecorator(
            new AnyJSBundleProvider([
              new MetroJSBundleProvider(),
              new FileJSBundleProvider('/data/storage/el2/base/files/bundle.harmony.js'),
              new ResourceJSBundleProvider(
                this.rnohCoreContext.uiAbilityContext.resourceManager,
                'bundle.harmony.js',
              ),
            ]),
            this.rnohCoreContext.logger,
          ),
        });
      }
    }
    .width('100%')
    .height('100%');
  }
}

