<!-- Hallmark · pre-emit critique: P5 H5 E4 S5 R5 V4 -->
<!-- DeepTutor Mobile · Flat Accessible UI · cool-fog / native-system-sans / tonal-cobalt -->

# DeepTutor Mobile Design System

- 文档迁移日期：2026-08-31
- 实现状态：未完成
- 规则：本文件迁移设计意图，不继承旧 Taro 组件或页面实现

Locked mobile design foundation. Future UI work in `mobile/` should read this
file first. Amend it intentionally; do not invent page-local colors, spacing,
type sizes, radii, motion curves, or interaction states.

## 1. Product character

- **Audience:** people who actively want to learn, from beginners to experienced
  self-directed learners.
- **Primary job:** make asking, understanding, practising, and returning to a
  topic feel easy enough to continue.
- **Tone:** calm, curious, direct, and exact. Friendly without becoming childish.
- **Style:** Flat Mobile + Accessible & Ethical.
- **Theme:** `Learning Focus`, a content-first native system with one tonal
  cobalt brand family, restrained motion, and long-reading support.
- **Anchor:** cool fog canvas + tonal cobalt interaction + semantic state colours.

The interface should feel like a patient study companion in a clear, bright room.
Ease comes from quiet contrast, rounded touch surfaces, plain language, and small
moments of response. It must not look like a generic purple AI app, a children's
game, or a desktop dashboard squeezed onto a phone.

## 2. Non-negotiable principles

1. **The learning task stays visible.** Navigation, model settings, and tools
   never compete with the current question, explanation, or exercise.
2. **Native first.** Navigation, lists, chat, forms, sheets, dialogs, and file
   actions use React Native/Paper components. WebView is bounded to rich content.
3. **Soft, not blurry.** Use tinted surfaces, borders, and spacing. No
   glassmorphism, coloured glows, or ornamental gradients.
4. **One brand accent.** Cobalt owns interaction and selection. Success,
   warning, and error colours are semantic only.
5. **One containment layer.** Avoid card-in-card nesting. A list on a surface
   usually needs dividers, not another set of cards.
6. **Motion explains state.** No universal fade-ups, bouncing controls, parallax,
   or looping decoration.
7. **Mobile constraints are the design.** Safe areas, keyboard avoidance,
   dynamic text, weak networks, long Chinese text, and one-handed reach are not
   later QA items.

## 3. Token architecture

Use three layers:

1. **Primitive tokens** hold raw measurable values.
2. **Semantic tokens** describe roles such as canvas, text, action, and status.
3. **Component tokens** exist only when a component cannot be expressed with
   semantic tokens. Never add a raw colour or dimension inside a page component.

Token names in this document are canonical. `src/theme/tokens.ts` will export
cross-platform sRGB values, while `paperTheme.ts` maps semantic roles into Paper.

### Unit convention

Design values below use logical `dp` / `sp`. React Native numeric layout values
map directly to logical density-independent units. Keep token names stable across
Android, iOS, and Harmony; platform adapters handle native font and inset details.

## 4. Colour tokens

All canonical colours use OKLCH. Hex values already present in code are legacy
implementation values, not sources of truth for new UI.

### Light mode

| Token                   | Value                        | Role                                               |
| ----------------------- | ---------------------------- | -------------------------------------------------- |
| `color.canvas`          | `oklch(97.5% 0.005 220)`     | App background; cool fog, never pure white         |
| `color.surface`         | `oklch(99% 0.003 220)`       | Sheets, composer, primary cards                    |
| `color.surface-muted`   | `oklch(94.5% 0.007 220)`     | Selected rows, assistant bubble, grouped regions   |
| `color.surface-pressed` | `oklch(91% 0.010 220)`       | Pressed neutral surface                            |
| `color.ink`             | `oklch(22% 0.012 220)`       | Headings, primary text, strong icons               |
| `color.body`            | `oklch(40% 0.012 220)`       | Running text; verified 8.5:1 on canvas             |
| `color.muted`           | `oklch(48% 0.010 220)`       | Metadata and helper text; verified 6.1:1 on canvas |
| `color.border`          | `oklch(84% 0.010 220)`       | Standard boundaries and dividers                   |
| `color.border-strong`   | `oklch(70% 0.014 220)`       | Selected or emphasized boundaries                  |
| `color.primary`         | `oklch(48% 0.130 255)`       | Primary action and active destination              |
| `color.primary-pressed` | `oklch(42% 0.120 255)`       | Pressed primary action                             |
| `color.primary-soft`    | `oklch(90% 0.035 255)`       | Selected surface and progress tint                 |
| `color.primary-muted`   | `oklch(95% 0.015 255)`       | Low-emphasis branded surface                       |
| `color.on-primary`      | `oklch(98% 0.004 220)`       | Text/icons on primary; verified 6.2:1              |
| `color.link`            | `color.primary`              | Links and informational actions; verified 6.2:1    |
| `color.highlight`       | `color.primary-soft`         | Progress, mastery, selected learning moment        |
| `color.on-highlight`    | `color.primary-pressed`      | Text/icons on tonal highlight                      |
| `color.success`         | `oklch(48% 0.130 150)`       | Completed, connected, correct                      |
| `color.success-soft`    | `oklch(94% 0.025 150)`       | Quiet success notice background                    |
| `color.warning`         | `oklch(50% 0.120 75)`        | Recoverable warning text/icon                      |
| `color.warning-soft`    | `oklch(94% 0.035 75)`        | Quiet warning notice background                    |
| `color.error`           | `oklch(52% 0.190 25)`        | Error and destructive action                       |
| `color.error-soft`      | `oklch(94% 0.035 25)`        | Quiet error notice background                      |
| `color.info`            | `oklch(49% 0.140 240)`       | Informational state                                |
| `color.info-soft`       | `oklch(94% 0.025 240)`       | Quiet informational notice background              |
| `color.focus`           | `color.primary`              | Focus ring on neutral surfaces                     |
| `color.scrim`           | `oklch(22% 0.012 220 / 44%)` | Modal and sheet backdrop modifier                  |

### Dark mode specification

Dark mode is defined now but must not be enabled until Android, iOS, Harmony,
and Harmony are visually tested. Higher surfaces become lighter; hue roles do not
change between modes.

| Token                   | Value                       |
| ----------------------- | --------------------------- |
| `color.canvas`          | `oklch(16% 0.010 220)`      |
| `color.surface`         | `oklch(20% 0.012 220)`      |
| `color.surface-muted`   | `oklch(24% 0.014 220)`      |
| `color.surface-pressed` | `oklch(28% 0.016 220)`      |
| `color.ink`             | `oklch(94% 0.006 210)`      |
| `color.body`            | `oklch(79% 0.008 210)`      |
| `color.muted`           | `oklch(68% 0.010 210)`      |
| `color.border`          | `oklch(34% 0.014 220)`      |
| `color.border-strong`   | `oklch(46% 0.016 220)`      |
| `color.primary`         | `oklch(72% 0.110 255)`      |
| `color.primary-pressed` | `oklch(66% 0.100 255)`      |
| `color.primary-soft`    | `oklch(28% 0.035 255)`      |
| `color.primary-muted`   | `oklch(24% 0.020 255)`      |
| `color.on-primary`      | `oklch(16% 0.010 220)`      |
| `color.link`            | `color.primary`             |
| `color.highlight`       | `color.primary-soft`        |
| `color.success`         | `oklch(72% 0.110 150)`      |
| `color.success-soft`    | `oklch(24% 0.025 150)`      |
| `color.warning`         | `oklch(78% 0.120 75)`       |
| `color.warning-soft`    | `oklch(24% 0.030 75)`       |
| `color.error`           | `oklch(72% 0.150 25)`       |
| `color.error-soft`      | `oklch(24% 0.030 25)`       |
| `color.info`            | `oklch(74% 0.110 240)`      |
| `color.info-soft`       | `oklch(24% 0.025 240)`      |
| `color.focus`           | `color.primary`             |
| `color.scrim`           | `oklch(8% 0.008 220 / 64%)` |

### Accent discipline

- Cobalt owns actions, links, selected surfaces, progress, focus, and active
  destinations. Use tonal lightness changes instead of adding another brand hue.
- Success green, warning amber, and error red appear only with matching text or
  icon semantics. They never decorate neutral content.
- Never use gradients. Never use colour as the only status cue.
- Emoji are copy, not icons. Do not use sparkle/rocket/fire emoji as decoration.

Primary controls use a two-layer focus treatment: an `on-primary` inner outline
against the cobalt fill and an `ink` outer ring against the page.

## 5. Data-visualisation tokens

Complex charts remain inside the bounded rich-content renderer. Native screens
provide the title, loading/error/empty state, full-screen action, and accessible
summary. Do not add a separate native chart library until a native-only chart has
two real product consumers.

| Token                   | Light                  | Dark                   | Default meaning      |
| ----------------------- | ---------------------- | ---------------------- | -------------------- |
| `chart.series-1`        | `oklch(52% 0.150 235)` | `oklch(76% 0.110 235)` | Primary comparison   |
| `chart.series-2`        | `oklch(57% 0.170 35)`  | `oklch(74% 0.130 35)`  | Secondary comparison |
| `chart.series-3`        | `oklch(49% 0.130 150)` | `oklch(72% 0.110 150)` | Positive/progress    |
| `chart.series-4`        | `oklch(53% 0.140 300)` | `oklch(76% 0.100 300)` | Additional category  |
| `chart.series-5`        | `oklch(50% 0.120 75)`  | `oklch(78% 0.120 75)`  | Attention/category   |
| `chart.series-6`        | `oklch(46% 0.110 270)` | `oklch(72% 0.090 270)` | Additional category  |
| `chart.grid`            | `color.border`         | `color.border`         | Major grid only      |
| `chart.axis`            | `color.muted`          | `color.muted`          | Axis and tick labels |
| `chart.tooltip-surface` | `color.ink`            | `color.surface-muted`  | Tooltip surface      |
| `chart.tooltip-text`    | `color.canvas`         | `color.ink`            | Tooltip content      |

Chart rules:

- Labels and direct values are preferred over legends when space allows.
- Use line styles, shapes, or labels in addition to colour; never rely on
  red–green distinction.
- Minimum axis/legend text is `type.caption` and must scale with accessibility
  settings.
- Lines are 2dp; selected lines may reach 3dp. Touch targets around data points
  are at least 44pt/48dp even if the visible point is smaller.
- No 3D charts, decorative gradients, dual axes by default, or auto-rotating
  visualisations.
- Streaming charts update without replaying entrance animation.

## 6. Typography tokens

Mobile deliberately uses platform fonts for startup speed, Chinese coverage,
dynamic type, and native rendering. This is an intentional native-platform
exception to Hallmark's web font-pairing rule.

| Token              | Logical size / line                                                          | Weight | Use                                          |
| ------------------ | ---------------------------------------------------------------------------- | ------ | -------------------------------------------- |
| `font.ui`          | iOS SF Pro/PingFang · Android Roboto/Noto Sans CJK · HarmonyOS Sans          | —      | All interface text                           |
| `font.reading`     | Platform reading sans; optional platform serif only in dedicated reader mode | —      | Long explanations                            |
| `font.mono`        | Platform monospace                                                           | —      | Code and fixed-width data                    |
| `type.caption`     | 12sp / 16sp                                                                  | 500    | Metadata, chart ticks                        |
| `type.label`       | 14sp / 20sp                                                                  | 600    | Buttons, tabs, controls                      |
| `type.body`        | 15sp / 22sp                                                                  | 400    | Compact interface body and helper text       |
| `type.body-strong` | 15sp / 22sp                                                                  | 600    | Inline interface emphasis                    |
| `type.reading`     | 16sp / 25sp                                                                  | 400    | Chat answers and continuous learning content |
| `type.body-large`  | 17sp / 26sp                                                                  | 400    | Reading lead and empty-state body            |
| `type.title-3`     | 17sp / 22sp                                                                  | 700    | Card/section title                           |
| `type.title-2`     | 20sp / 26sp                                                                  | 700    | Screen subsection                            |
| `type.title-1`     | 24sp / 30sp                                                                  | 700    | Phone screen title                           |
| `type.display`     | 30sp / 36sp                                                                  | 700    | Rare learning milestone or tablet lead       |

Typography rules:

- Compact interface copy may use `type.body` at 15sp. Continuous explanations,
  chat answers, and other reading surfaces use `type.reading` at 16sp; 14sp is
  reserved for controls and secondary UI, while 12sp remains metadata-only.
- Chinese interface copy uses roughly 1.45–1.55 line height. Long reading
  surfaces keep the roomier `type.reading` line height and target 30–38 CJK
  characters per line on tablet.
- Headings are roman, sentence case, and use weight or colour for emphasis.
  Never italicise a word inside a heading.
- Numeric progress and chart values use tabular figures where supported.
- Support at least 200% dynamic type without clipping primary actions.

## 7. Spacing and layout tokens

| Token       | Logical | Typical role                 |
| ----------- | ------: | ---------------------------- |
| `space.3xs` |     2dp | Optical correction only      |
| `space.2xs` |     4dp | Icon/text micro-gap          |
| `space.xs`  |     8dp | Compact sibling gap          |
| `space.sm`  |    12dp | Control internals            |
| `space.md`  |    16dp | Standard component gap       |
| `space.lg`  |    24dp | Card padding, content groups |
| `space.xl`  |    32dp | Section separation           |
| `space.2xl` |    48dp | Major screen rhythm          |
| `space.3xl` |    64dp | Rare large separation        |

| Layout token                | Value                       | Rule                                                 |
| --------------------------- | --------------------------- | ---------------------------------------------------- |
| `layout.gutter-phone`       | 18dp                        | Existing phone baseline                              |
| `layout.gutter-large-phone` | 24dp                        | ≥414 logical px                                      |
| `layout.gutter-tablet`      | 32dp                        | Tablet and foldable expanded pane                    |
| `layout.reading-max`        | 720dp                       | Cap long assistant content on tablet                 |
| `layout.detail-max`         | 880dp                       | Form/detail pane cap on tablet                       |
| `layout.split-min`          | 768dp                       | Earliest two-pane layout, only when content benefits |
| `layout.chat-max`           | 640dp                       | Maximum Chat workspace width on tablets              |
| `layout.chat-empty-max`     | 520dp                       | Maximum empty-state and starter-prompt measure       |
| `layout.bottom-reach`       | final 40% of phone viewport | Prefer primary frequent actions here                 |

Use Flexbox for component internals and single-axis mobile layouts. Introduce
Grid-like compositions only in tablet/foldable adapters. Never imitate a desktop
three-column card dashboard on a phone.

## 8. Size, radius, border, and elevation tokens

| Token             | Value | Use                                                |
| ----------------- | ----: | -------------------------------------------------- |
| `size.touch-min`  |  48dp | Cross-platform interactive floor                   |
| `size.control-sm` |  36dp | Visual-only compact control inside a 48dp hit area |
| `size.control-md` |  48dp | Default button/input row and compact Chat composer |
| `size.control-lg` |  56dp | Multiline composer and prominent action            |
| `size.tab-bar`    |  50dp | Native bottom-navigation layout reservation        |
| `size.icon-sm`    |  16dp | Inline metadata icon                               |
| `size.icon-md`    |  20dp | Standard control icon                              |
| `size.icon-lg`    |  24dp | Navigation and prominent action                    |
| `size.avatar-sm`  |  28dp | Compact list                                       |
| `size.avatar-md`  |  40dp | Default identity                                   |
| `size.avatar-lg`  |  56dp | Profile header                                     |

| Token             |             Value | Use                                          |
| ----------------- | ----------------: | -------------------------------------------- |
| `radius.xs`       |               4dp | Tiny indicators only                         |
| `radius.sm`       |               8dp | Chips and compact rows                       |
| `radius.md`       |              12dp | Inputs and standard controls                 |
| `radius.lg`       |              16dp | Cards and grouped surfaces                   |
| `radius.xl`       |              20dp | Composer, bottom sheet, large learning card  |
| `radius.2xl`      |              24dp | Rare feature surface                         |
| `radius.full`     |             999dp | Pills and circular controls                  |
| `border.hairline` | platform hairline | Dividers                                     |
| `border.standard` |         1dp / 2px | Inputs and visible component boundary        |
| `border.strong`   |         2dp / 4px | Focus/selected emphasis without layout shift |

Elevation is primarily a surface-colour change plus border. Cards are flat by
default. Use one quiet shadow only for floating sheets, menus, dragged items, and
modals. Do not put the same shadow on every card; do not use coloured glow.

## 9. Motion and haptic tokens

| Token              |                            Value | Use                                    |
| ------------------ | -------------------------------: | -------------------------------------- |
| `duration.instant` |                              0ms | Focus ring and required state feedback |
| `duration.press`   |                             90ms | Press in/out                           |
| `duration.micro`   |                            120ms | Icon/colour response                   |
| `duration.short`   |                            180ms | Chip, tab, compact disclosure          |
| `duration.base`    |                            240ms | Sheet content, list insertion          |
| `duration.long`    |                            320ms | Modal and page-level transition        |
| `easing.out`       |  `cubic-bezier(0.16, 1, 0.3, 1)` | Enter                                  |
| `easing.in`        |  `cubic-bezier(0.7, 0, 0.84, 0)` | Exit                                   |
| `easing.in-out`    | `cubic-bezier(0.65, 0, 0.35, 1)` | State toggle                           |

- Animate opacity and transform only. Press feedback may translate by 1dp; it
  must not scale text or change layout.
- One cheerful response is allowed after meaningful learning progress. Normal
  saves, taps, and navigation remain quiet.
- Haptics: light selection for meaningful choice; success haptic only after a
  completed task; warning/error haptic only when immediate attention is needed.
- Reduced motion removes spatial transitions and uses ≤150ms opacity changes.
  Progress and loading remain functional.

## 10. Layer tokens

| Token            | Value | Use                            |
| ---------------- | ----: | ------------------------------ |
| `layer.base`     |     0 | Page content                   |
| `layer.sticky`   |   100 | App bar and composer           |
| `layer.dropdown` |   200 | Anchored menu                  |
| `layer.sheet`    |   300 | Bottom/side sheet              |
| `layer.modal`    |   400 | Dialog                         |
| `layer.toast`    |   500 | Toast/banner                   |
| `layer.tooltip`  |   600 | Keyboard/accessibility tooltip |

Platform-native portals may map these values differently, but the ordering is
fixed. Never use arbitrary large z-index values.

## 11. Component foundation

Build a small semantic system on top of React Native Paper. Assistant UI Native
provides chat primitives, not the visual language. Add or expose a primitive only
after it passes Android, iOS, and Harmony. Runtime components consume
`src/theme/tokens.ts` and `paperTheme.ts`; page-local raw colours are forbidden.

Foundation inventory:

- **Typography:** `AppText`, `Heading`, `ReadingText`, `CodeText`.
- **Actions:** `Button`, `IconButton`, `LinkButton`, `PressableRow`.
- **Inputs:** `TextField`, `TextArea`, `SearchField`, `SelectRow`, `SwitchRow`,
  `CheckboxRow`, `RadioRow`.
- **Surfaces:** `Surface`, `Card`, `ListGroup`, `ListItem`, `Divider`, `Chip`,
  `Badge`.
- **Feedback:** `InlineNotice`, `Progress`, `Skeleton`, `Toast`, `EmptyState`,
  `ErrorState`.
- **Overlays:** `BottomSheet`, `Dialog`, `ActionSheet`, `Popover` where supported.
- **Navigation:** `AppBar`, `FloatingNavigation`, `SegmentedControl`, `BackAction`.
- **Learning:** `MessageBubble`, `Composer`, `StarterPrompt`, `AnswerOption`,
  `MasteryProgress`, `SourceChip`, `RichContentFrame`, `ChartSurface`.

### Local component library status

All components below are planned and currently count as **not implemented**.
The future library lives in `src/components/` and wraps Paper/Assistant UI behind
DeepTutor semantic props instead of exposing vendor-specific choices to screens.

| Status  | Components                                             | Rule                                                              |
| ------- | ------------------------------------------------------ | ----------------------------------------------------------------- |
| Planned | `AppText`, `Heading`, `ReadingText`                    | Typography roles consume shared type/tone tokens                  |
| Planned | `AppButton`, `IconButton`, `PressableRow`              | Stable loading/disabled/error geometry and ≥48dp hit areas        |
| Planned | `TextField`, `TextAreaField`, `SearchField`            | Visible label, helper/error slot, keyboard and autofill semantics |
| Planned | `Surface`, `Card`, `Chip`, grouped lists               | Flat surfaces; selected differs from focus/pressed                |
| Planned | `InlineNotice`, `EmptyState`, `ErrorState`, `Skeleton` | Feedback includes text and recovery action                        |
| Planned | `Dialog`, `BottomSheet`, `ActionSheet`                 | Platform portal, safe area and system back behavior               |
| Planned | `MessageBubble`, `Composer`, `AskUserCard`             | Built from Assistant UI primitives with DeepTutor visual rules    |
| Planned | `PageShell`, `AppBar`, `FloatingNavigation`            | Safe area, keyboard, tablet width and edge docking                |
| Planned | remaining learning components                          | Added only with a real consumer and three-platform fixture        |

Paper is the default visual library; do not add a second general-purpose visual
system for one primitive. Any extra candidate must pass Android, iOS, and Harmony
builds plus interaction tests and remain behind the DeepTutor component API.

Use one icon grammar through an `AppIcon` adapter: rounded strokes, 20/24dp
standard sizes, consistent optical weight. Do not mix icon libraries or use emoji
as feature icons.

### Shape contract

- Cards, grouped lists, sheets: `radius.lg` (16dp).
- Inputs and standard buttons: `radius.md` (12dp).
- Chips, filters, compact tags: `radius.full` only.
- Icon buttons: circular only when the visual glyph is square.
- No shadows on standard surfaces. Modal and sheet elevation use platform-native
  treatment only.

### Eight-state contract

Every interactive component defines:

1. Default
2. Hover, only when the platform exposes a fine pointer
3. Focus, for hardware keyboard and accessibility navigation
4. Pressed/active
5. Disabled, with a visible reason when not obvious
6. Loading, keeping geometry stable
7. Error, with icon/text and recovery instruction
8. Success, quiet and reversible where possible

`Selected` is an additional semantic state, not a replacement for focus or
pressed. Border width and component size stay constant across all states.

## 12. Navigation and screen patterns

- Primary destinations remain **Chat · Learn · Library · Profile**. The dormant
  floating trigger may be icon-only with an accessible name; its active menu
  always shows both Feather icons and short labels.
- The app bar shows one screen title and at most two trailing actions. Overflow
  goes into a sheet.
- The composer stays in one stable location. Send becomes Stop during generation;
  it does not create a second control.
- Advanced model, capability, tool, and knowledge settings live on a dedicated
  options screen, not in a desktop-style toolbar.
- Use bottom sheets for short contextual choices, full screens for search-heavy
  or multi-step selection, and dialogs only for irreversible decisions.
- Reversible deletion uses Undo; confirmation is reserved for irreversible loss.
- Empty chat uses compact starter prompts and does not reserve a large blank
  transcript before the first message.

## 13. Rich content and chart presentation

- Native UI owns loading, error, retry, title, source, share, and full-screen
  actions around every rich-content renderer.
- WebView content receives semantic colour, typography, and chart tokens. It may
  not invent its own white canvas or purple gradient.
- Markdown, KaTeX, code, Mermaid, SVG, Chart.js, and HTML render inside bounded
  frames. The whole application never becomes a WebView.
- Every chart has a plain-language accessible summary and a data-table or list
  fallback when the visual carries essential information.
- Full-screen visualisation respects orientation, safe areas, and the system back
  gesture. Pinch/zoom is supplementary, never the only way to inspect values.

## 14. Voice and copy

Voice is warm, direct, and specific:

- Prefer “继续这个问题”, “查看来源”, “再试一次”, “保存到资料库”.
- Avoid “赋能”, “释放潜能”, “超级智能”, “开启学习之旅”, and decorative hype.
- Errors state what happened, why when known, and what to do next.
- Empty states name what is empty, why it matters, and one next action.
- Do not joke in authentication, lost work, connection failure, or destructive
  flows.

## 15. Accessibility and delivery gates

- Text contrast ≥4.5:1; large glyphs, focus rings, and component boundaries ≥3:1.
  The key light/dark text pairs above have been contrast-checked.
- Interactive targets are ≥48dp cross-platform and separated by at least 8dp.
- Colour is never the only signal. Pair it with text, shape, icon, or pattern.
- Verify dynamic type at 100%, 150%, and 200%; labels and primary actions do not
  clip or disappear.
- Verify reduced motion, screen reader order, hardware keyboard focus, keyboard
  avoidance, safe areas, and system back behavior.
- Verify 320, 375, 414, and 768 logical-pixel widths plus portrait/landscape,
  tablet, and foldable states.
- Verify Android, iOS, and HarmonyOS NEXT independently. One native platform does
  not prove parity on another.
- Verify weak network, offline, reconnecting, streaming, long messages, long
  lists, CJK expansion, and RTL-safe logical spacing.

## 16. Implementation mapping

Implementation starts from the canonical roles in this document. Convert OKLCH
values to tested sRGB strings in `tokens.ts`, map semantic colours into Paper in
`paperTheme.ts`, and expose spacing/type/radius tokens directly as RN numbers.
Do not copy Sass aliases or styles from the old Taro project.

The `snow` and `glass` Web themes are not part of this mobile system. Mobile has
one light system and one separately verified dark system; no glass variant.
