# DeepTutor React Native / RNOH foundation

This `mobile/` directory contains the React Native/RNOH implementation of the
DeepTutor mobile client. It is built from scratch; no application code from the
former Taro project is migrated here.

## Product and implementation documents

- [Architecture decision](./MOBILE_ARCHITECTURE_DECISION.md)
- [Runtime foundation](./FOUNDATION.md)
- [Mobile design system](./DESIGN.md)
- [Implementation status](./IMPLEMENTATION_STATUS.md)
- [Execution plan](./MIGRATION_PLAN.md)
- [Web-to-mobile capability matrix](./WEB_TO_MOBILE_FEATURE_MATRIX.md)

These documents preserve product scope and design intent from the old mobile
project. All execution status was reset on 2026-08-31 because the RN/RNOH
product is being implemented from scratch rather than porting Taro code.

`IMPLEMENTATION_STATUS.md` owns implementation and acceptance status;
`WEB_TO_MOBILE_FEATURE_MATRIX.md` owns scope and priorities; `MIGRATION_PLAN.md`
orders delivery work. Code landing or a successful bundle does not mean a
product flow has passed device acceptance.

## What is installed

| Layer             | Package                | Pinned version  | Purpose                                       |
| ----------------- | ---------------------- | --------------- | --------------------------------------------- |
| Runtime           | React Native           | `0.77.1`        | Shared iOS/Android application code           |
| Harmony runtime   | RNOH                   | `0.77.71`       | Runs the same React Native tree inside ArkUI  |
| Component library | React Native Paper     | `5.12.5`        | Accessible cross-platform product components  |
| Chat primitives   | Assistant UI Native    | `0.1.39`        | Thread, message, composer and streaming state |
| Motion            | Reanimated             | `3.16.7`        | Android/iOS animation API                     |
| Harmony motion    | RNOH Reanimated port   | `3.6.4-rc.1`    | Harmony adapter with isolated 3.6 JS sources  |
| Safe area         | Safe Area Context      | `5.1.0`         | iOS/Android safe-area API                     |
| Harmony safe area | RNOH Safe Area port    | `4.7.4-0.2.1`   | Maps the same imports to Harmony native code  |
| Navigation        | React Navigation Stack | `6.4.0`         | Typed routes, links and system back           |
| Settings storage  | AsyncStorage           | `1.21.0`        | Versioned non-sensitive persistence           |
| Network           | NetInfo                | `11.1.0`        | Reachability and Query online state           |
| Rich viewer       | React Native WebView  | `13.13.1`      | Bounded rich-content previews                |
| Harmony viewer    | RNOH WebView port      | `13.10.3`      | ArkUI-hosted WebView adapter                  |
| Secure storage    | SensitiveInfo          | `6.0.0-alpha.9` | Android Keystore and iOS Keychain             |

The versions are intentionally exact. This is the documented RN 0.77
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

Assistant UI is not the backend and does not own the DeepTutor protocol. The production Chat surface uses `src/chat/ChatClient.ts` to adapt the current
`/ws` v2 protocol behind `src/chat/DeepTutorChatPort.ts`. The former mock adapter
is not mounted by the application.

Assistant UI also does not provide the complete Markdown/KaTeX/code rendering
policy. Rich content remains a DeepTutor component: `MessageContent` renders the
structured message retained in Assistant UI metadata alongside its primitives.

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

The script automatically detects JDK 17 and Android SDK API 35, builds the
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
API 35 Android toolchain.

## Current scope

The application includes startup gates, server setup, navigation and login,
plus a real HTTP/WebSocket Chat adapter: streaming, stopping, regeneration,
history loading/pagination, active-turn replay and structured user replies.
The current backend login contract is `/api/auth/login` with a session cookie;
mobile Bearer/refresh-token endpoints remain planned, not implemented.

Rich-content previews support ECharts/Chart.js JSON, HTML, SVG, Mermaid and
Markdown/KaTeX. Libraries and math fonts are bundled locally by `pnpm rich:assets`
(no runtime CDN dependency). HTML runs in an opaque iframe sandbox with network,
forms, native bridge access and shared cookies disabled. Inline scripts can
support local interaction; external website dependencies are not loaded.

Generated artifact cards are extracted from tool results and sources and retained
in history. Same-server HTML/SVG/text files can be previewed; other files use an
external open action or extracted text. Native picking/uploading, authenticated
binary downloads and complete office/PDF viewers remain pending. Formatted
Markdown and math render directly as native React Native views in the transcript.

These implementations still require real-backend/model and three-platform device
acceptance. Automated protocol tests and browser renderer checks do not replace it.

AI 回复正文使用 react-native-markdown-display 原生组件（GFM、代码高亮/复制）；公式由 MathJax 排版并使用 react-native-svg 绘制，不使用 WebView。整个对话由 assistant-ui 原生列表纵向滚动，表格与代码仅横向滚动；Mermaid、HTML 和交互图表以入口打开独立预览。`rich:assets` 在构建时复用 `../web/lib/markdown-display.ts` 与 `../web/lib/latex.ts`，因此请在完整仓库中构建。交互 HTML 和图表附件继续在隔离预览中打开。
