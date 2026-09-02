# Mobile runtime foundation

This document describes the shared runtime layer that every screen and feature
must use. It is infrastructure, not evidence that a product flow is complete.

## Provider order

`AppProviders` owns process-wide providers in one place:

```text
GestureHandlerRootView
└── SafeAreaProvider
    └── NetworkStatusProvider
        └── KeyboardMetricsProvider
            └── QueryClientProvider
                └── PaperProvider
                    ├── SystemBars
                    └── AppErrorBoundary
                        └── application screens
```

Do not create another Query client, Paper theme, safe-area root or keyboard
listener inside a feature.

## Startup state machine

`StartupProvider` is the only owner of application boot state:

```text
booting
├── needs_server
├── needs_auth
├── offline
├── upgrade_required
├── fatal
└── ready
```

It loads versioned runtime settings, restores the secure auth session, rejects
expired or server-mismatched credentials, observes network state and probes the
mobile Bootstrap endpoint before entering the protected application.

## Navigation and links

React Navigation 6 JS Stack owns route history and system-back behavior. RNOH
uses its Harmony stack adapter and disables native Screens detachment. Root
routes are synchronized from startup state so a deep link cannot bypass server
or authentication gates.

The initial link prefix is `deeptutor://`; route and parameter changes belong in
the typed `RootStackParamList` and linking config together.

## Persistent and secure storage

Ordinary settings use versioned AsyncStorage envelopes. Corrupt or unsupported
data is removed instead of entering application state. Credentials use a
separate `AuthSessionRepository` backed by Android Keystore/iOS Keychain through
the native SensitiveInfo module.

Harmony deliberately fails closed for credential writes until an audited HUKS
TurboModule is compiled and device-tested. It never falls back to AsyncStorage
or the community Harmony port that uses a hard-coded application key/IV.

## Network state

`NetworkStatusProvider` maps native connection and reachability into
`unknown/online/offline`, drives TanStack Query's `onlineManager`, and exposes
connection cost/type for future upload policy. A connected interface with
failed internet reachability is offline.

## Logging and render failures

All logs pass through `Logger`. Sensitive keys and Bearer values are recursively
redacted, circular data is bounded, and production has no console sink by
default. `AppErrorBoundary` catches render failures and offers a stable retry
surface instead of a white screen.

## WebSocket runtime

`WebSocketRuntime` provides an injected, testable transport layer with:

- query-token authentication;
- connection/recovery/offline/suspended states;
- heartbeat and stale-connection detection;
- capped exponential reconnect;
- `turn_id + seq` resume;
- start, cancel and generic protocol messages;
- terminal-event cleanup;
- network and foreground/background lifecycle controls.

Assistant UI will consume this runtime through the DeepTutor Chat Adapter; UI
components must not open sockets directly.

## Safe area and system UI

Every full screen uses `SafeAreaScreen` instead of a raw root `View`:

```tsx
<SafeAreaScreen edges={['top', 'right', 'bottom', 'left']}>
  <ScreenContent />
</SafeAreaScreen>
```

- iOS receives padding from UIKit safe-area metrics.
- Android uses `adjustResize`; status/navigation colours live in the native
  theme, while `SafeAreaScreen` consumes display cutout and navigation insets.
- Harmony uses the RNOH Safe Area Context port registered by the ArkUI host.
- Modal roots and full-screen viewers create their own `SafeAreaScreen`.

`SystemBars` derives status-bar contrast and colour from the active Paper theme.
Pages must not independently change system-bar appearance.

## Keyboard events and avoidance

`KeyboardMetricsProvider` installs one application-level subscription and
exposes:

- `visible`;
- keyboard `height` and `screenY`;
- native animation `duration` and `easing`.

Use `useKeyboardInsets()` for floating overlays that need the current keyboard
geometry. Android normally returns a zero additional inset because the Activity
already uses `adjustResize`; pass `includeOnResizePlatforms` only for an overlay
that is outside the resized content hierarchy.

`SafeAreaScreen` applies iOS `KeyboardAvoidingView` behavior. A feature should
not nest another default keyboard-avoiding container unless it owns a separate
modal window.

## Runtime server configuration

`createRuntimeConfig()` accepts an HTTP(S) server address, removes trailing
slashes and derives the matching WS(S) origin. It rejects credentials,
non-HTTP protocols, queries and fragments.

```ts
const runtime = createRuntimeConfig('https://learn.example.com');
// runtime.apiBaseUrl === 'https://learn.example.com'
// runtime.wsBaseUrl === 'wss://learn.example.com'
```

The selected server is future user state. Do not read a page-local environment
variable or hardcode `localhost` inside API modules.

## HTTP requests

Features use `HttpClient`; they do not call `fetch` directly.

```ts
const client = new HttpClient({
  baseUrl: runtime.apiBaseUrl,
  getAccessToken: () => authSession.accessToken,
  onUnauthorized: () => authSession.clear(),
});

const profile = await client.request({
  path: '/api/v1/auth/profile',
  signal,
  schema: profileSchema,
});
```

The client provides:

- normalized URL and encoded query parameters;
- JSON and `FormData` request bodies;
- Bearer authentication;
- default 30-second timeout with per-request override;
- caller cancellation through `AbortSignal`;
- response schema validation with Zod;
- stable `HttpError` codes, retryability, status and request ID;
- a single unauthorized callback for auth cleanup.

Never log access tokens, raw authorization headers or full sensitive response
bodies.

## Server state

`createAppQueryClient()` configures TanStack Query for server-owned state.
Application foreground/background events drive Query focus through `AppState`.
Retries are limited and respect `HttpError.retryable`; mutations never retry by
default.

Zustand remains available for short-lived client state such as a composer
draft, current selection or connection phase. Do not duplicate Query-owned
server lists in Zustand.

## Current verification boundary

Automated checks cover runtime URL validation, HTTP auth/query/schema/error/
timeout behavior, keyboard geometry, storage envelopes, log redaction, network
mapping and WebSocket lifecycle. Android and Harmony bundles must continue to
pass. Real keyboard, cutout, storage, navigation, reconnect and background
behavior still require device validation before the corresponding product
status can be marked complete.
