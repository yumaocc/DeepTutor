# DeepTutor React Native / RNOH foundation

This directory is the selected React Native/RNOH foundation for the future
DeepTutor mobile client. The existing `../mobile` Taro project remains only
until directory consolidation; none of its application code is migrated here.

## Product and implementation documents

- [Architecture decision](./MOBILE_ARCHITECTURE_DECISION.md)
- [Runtime foundation](./FOUNDATION.md)
- [Mobile design system](./DESIGN.md)
- [Implementation status](./IMPLEMENTATION_STATUS.md)
- [Execution plan](./MIGRATION_PLAN.md)
- [Web-to-mobile capability matrix](./WEB_TO_MOBILE_FEATURE_MATRIX.md)

These documents preserve product scope and design intent from the old mobile
project. All execution status was reset on 2026-08-31 because the RN/RNOH
product will be implemented from scratch rather than porting Taro code.

## What is installed

| Layer             | Package                | Pinned version  | Purpose                                       |
| ----------------- | ---------------------- | --------------- | --------------------------------------------- |
| Runtime           | React Native           | `0.72.5`        | Shared iOS/Android application code           |
| Harmony runtime   | RNOH                   | `0.72.143`      | Runs the same React Native tree inside ArkUI  |
| Component library | React Native Paper     | `5.12.5`        | Accessible cross-platform product components  |
| Chat primitives   | Assistant UI Native    | `0.1.39`        | Thread, message, composer and streaming state |
| Motion            | Reanimated             | `3.6.0`         | Shared animation API                          |
| Harmony motion    | RNOH Reanimated port   | `3.6.4-rc.1`    | Maps Reanimated to Harmony native code        |
| Safe area         | Safe Area Context      | `4.7.4`         | iOS/Android safe-area API                     |
| Harmony safe area | RNOH Safe Area port    | `4.7.4-0.2.1`   | Maps the same imports to Harmony native code  |
| Navigation        | React Navigation Stack | `6.4.0`         | Typed routes, links and system back           |
| Settings storage  | AsyncStorage           | `1.21.0`        | Versioned non-sensitive persistence           |
| Network           | NetInfo                | `11.1.0`        | Reachability and Query online state           |
| Secure storage    | SensitiveInfo          | `6.0.0-alpha.9` | Android Keystore and iOS Keychain             |

The versions are intentionally exact. This is the documented RN 0.72
compatibility lane, not a claim that these are the newest releases. Upgrade the
whole matrix together after device validation; do not independently bump one
native package.

## Architecture boundary

```text
DeepTutor screen code
  ├─ React Native Paper         UI components + theme
  ├─ Assistant UI Native        chat state + interaction primitives
  │    └─ DeepTutor adapter     owns WebSocket/event semantics
  ├─ Reanimated                 motion API
  └─ Safe Area Context          inset API
          │
          ├─ iOS / Android      upstream native implementations
          └─ Harmony / RNOH     package aliases + ArkUI/C++ packages
```

Assistant UI is not the backend and does not own the DeepTutor protocol. The
temporary streaming model in `src/chat/mockChatModelAdapter.ts` proves the UI
runtime. Production migration should adapt `/api/v1/ws` behind the interface in
`src/chat/DeepTutorChatPort.ts`.

Assistant UI also does not provide the complete Markdown/KaTeX/code rendering
policy. Rich content remains a DeepTutor component and is injected through
`MessagePrimitive.Content.renderText` (and later tool-part renderers).

## Run and verify

```bash
pnpm install
pnpm start
pnpm android
```

Useful checks:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm bundle:android
pnpm bundle:harmony
pnpm verify
```

Create a standalone Android test APK (bundled JavaScript, debug certificate):

```bash
pnpm build:app
```

The script automatically detects JDK 17 and Android SDK API 33, builds the
release variant, copies the APK to `artifacts/`, verifies its signature and
prints its SHA-256 checksum.

The distributable test artifact is copied to
`artifacts/DeepTutor-0.1.0-test-android.apk`. It is suitable for internal
installation, but its debug signing certificate must not be used for a store
release.

The Android bundle is written to `dist/android`. The Harmony bundle is written
to `harmony/entry/src/main/resources/rawfile/bundle.harmony.js`.

## Harmony / ArkUI

The `harmony/` directory is the native ArkUI host. It contains:

- an `RNAbility` entry point and an `RNApp` surface;
- C++ and ArkTS registration for Reanimated and Safe Area Context;
- Material Community Icons registration required by Paper;
- development Metro, device-file and packaged-bundle providers;
- no signing certificates or developer-specific paths.

To build a HAP:

1. Install DevEco Studio with HarmonyOS SDK API 12 and configure local signing.
2. Run `pnpm install` and `pnpm bundle:harmony` in this directory.
3. Open `harmony/` in DevEco Studio, then **Sync and Refresh Project**.
4. Run the `entry` module, or use `pnpm harmony` after a device is configured.

This workstation currently has no DevEco/`ohpm` toolchain, so the Harmony JS
bundle can be verified here, while the native HAP must be validated in DevEco
and on the target ROM before release.
The Android standalone test APK has been built successfully with JDK 17 and the
API 33 Android toolchain.

## Current scope

The application currently includes the runtime foundation, startup gates,
server setup, navigation, network state and native mobile login. The protected
Chat surface still uses a mock Assistant UI adapter; real WebSocket Chat,
registration and rich-content rendering remain product work.
