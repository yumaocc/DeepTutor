<!-- Hallmark · pre-emit critique: P5 H5 E4 S5 R5 V4 -->
<!-- DeepTutor Mobile · Flat Accessible UI · cool-fog / native-system-sans / tonal-cobalt -->

# DeepTutor Mobile Design System

## 当前全局规范 · 2026-09-07 · Lavender / Conversation Flow

本节是所有移动端页面的有效设计规范，优先于下方历史规范。用户已确认将 Keitoto 的 [Conversation & Response Flow](https://dribbble.com/shots/26439303-AI-Chat-App-Conversation-Response-Flow) 作为公开视觉参考，并要求后续页面遵守同一套设计。原稿为透视展示图，没有可读取的 Figma 变量；以下是视觉提取后的原生适配值，不是声称从源文件获得的精确参数。背景采用用户随后确认的更淡版本。

### Token 表

| 类别 | Token / 数值 | 使用规则 |
| --- | --- | --- |
| 页面 | canvas `#F6F5FA` | 全局淡紫白底；系统手势区同色 |
| 顶部氛围 | atmosphereTop `#E8E3FA` → atmosphereMiddle `#F0EDF9` → 透明 | 仅页面顶部，440 dp 内柔和消退；覆盖状态栏，内容不侵入安全区 |
| 浮层 | surface `#FFFFFF`、surfaceMuted `#EEEEF3` | 输入、胶囊、用户气泡、弹层；阅读正文保持开放布局 |
| 文字 | ink `#111118`、body `#464652`、muted `#6C6C7B` | 标题/主要动作、正文、辅助信息三级 |
| 强调 | primary `#7563EE`、pressed `#493BA6`、muted `#EFEDFC` | 选择、链接与品牌图标；发送等主操作采用 ink 深色圆形按钮 |
| 边界 | border `#DDDDE6`、scrim `rgba(17,17,24,.24)` | 浮层细边使用原生 hairline；抽屉遮罩使用统一 scrim |
| 柔和阴影 | shadowSoft `#CBC6DE` | 浅色浮层统一使用淡紫灰投影，禁止 Paper 默认纯黑阴影 |
| 错误 | error `#BE222A`、errorSoft `#FCEBEC` | 仅错误，不覆盖品牌角色 |
| 间距 | 4 / 8 / 12 / 16 / 24 / 32 / 48 dp | 页面横边距 20；底部输入区横边距 16；组件间优先 8 / 12 / 16 |
| 圆角 | 8 / 12 / 16 / 999 dp | 小附件 / 输入面板 / 外框和气泡 / 圆形及胶囊 |
| 字号 | caption 12、label 14、body 15、reading 16、title 20 sp | 正文跟随系统字体；中文长文行高 26 |
| 欢迎标题 | 24 / 33 sp，500 | 衬线角色：iOS Georgia、Android serif；系统中文回退；其他页面标题默认无衬线 |
| 层级标题 | 23 / 20 / 18 sp | 阅读内容 H1 / H2 / H3；页面导航标题 17 |
| 触控 | 最小 48 × 48 dp | 顶部圆钮与快捷入口的可见高度为 40 dp，通过 4 dp hitSlop 保留 48 dp 触控范围 |
| 图标 | 常规 22、附件 18、提示 13、发送圆盘 32 dp | 使用现有 Paper 图标；不手绘替代成熟组件 |
| 阴影 | 按钮/快捷卡片：Y 3、blur 9、opacity 0.16、elevation 1；输入框：Y 4、blur 12、opacity 0.08、elevation 2 | 统一使用 shadowSoft 淡紫灰阴影；大面积输入框降低透明度并扩大柔化范围；用户气泡与等待状态保持 flat |
| 动效 | 只动 opacity / transform；入场 420 ms / 10 dp；按压 scale 0.985；等待 520 ms、错峰 140 ms | 欢迎区只播放一次入场；遵守 reduced motion；不添加装饰循环或弹跳 |

### 组件组合

- 新对话：左侧圆形导航入口使用 `@react-navigation/drawer` 官方抽屉导航，对话留在背景中；组件负责横向进出动画、边缘滑动手势、遮罩进度与返回键。抽屉背景延伸至屏幕顶部，内容通过安全区避开系统状态栏；宽度为屏幕的 78%，限制在 280–304 dp。帮助、历史和重新生成使用紧凑列表，账号状态与登录/模型动作固定在底部；登录使用淡紫品牌底与深紫文字，不使用黑色填充。右侧圆形新建对话入口；居中球体与欢迎标题、紧凑胶囊建议、底部输入框。
- 输入框（最新确认）：采用右侧参考图的单行胶囊，新对话与已有对话共用。白色 Paper Surface、28 dp 圆角、4 dp 内边距，默认总高约 56 dp；左侧加号打开图片或文件选择，中间文字输入，右侧 32 dp 深色发送/停止。保留 48 dp 操作区域。去掉外框提示、重复产品标识及独立附件行。多行文本和附件预览可增加高度，键盘出现时保持可见。只保留 elevation 1 的轻阴影，不画输入框边界。
- 回复：整个会话使用一个原生滚动列表，AI 正文不套可滚动卡片；用户气泡随内容收缩。Markdown、公式与附件保留原有真实渲染。
- 历史会话：共享淡紫背景和安全区渐变，居中导航标题、左右圆形返回/新建按钮。原生 FlatList 渲染白色圆角会话行，当前会话使用浅紫底和文字标记；下拉刷新、触底分页，保留手动重试/加载更多。空、加载、失败状态使用同一字体与颜色体系，不显示虚构日期。
- 其他页面：继承相同颜色、类型层级、圆角、触控与阴影；根据内容选择列表/表单/阅读布局，无须每页复制球体或欢迎结构。
- 原图中订阅、语音、模型下拉不代表已有产品功能，不制造假入口；使用 DeepTutor 的真实内容和操作。

### 实现与后续约束

唯一基础值来源是 `src/theme/tokens.ts`，Paper 由 `src/theme/paperTheme.ts` 映射。`chatTheme.ts` 只允许聊天组件布局扩展，不再维护第二套颜色。后续新增或修改页面先读本节，引用 token；需要新值时先补全局角色与本表。历史页面本轮统一基础主题，结构按后续任务逐页迁移，不视为已全部还原。

## 历史规范（归档参考，冲突时以上方当前规范为准）

- 文档迁移日期：2026-08-31
- 实现状态：设计规范已定义，组件实现与三端验收状态以 `IMPLEMENTATION_STATUS.md` 为准
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

Dark mode is defined now but must not be enabled until Android, iOS, and
HarmonyOS NEXT are visually tested. Higher surfaces become lighter; hue roles do not
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

The components below define the planned inventory. Implementation and acceptance
status is maintained in `IMPLEMENTATION_STATUS.md`; this inventory does not
claim that any component has passed device acceptance.
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


## Chat refinement · 2026-09-06

User-selected direction: 安静精致. Preserve Learning Focus; adapt Long Document's
continuous-reading rhythm to native conversation. Compact N9-style app bar,
open assistant text, tonal compact user bubbles (85% maximum width), and one
persistent composer. No entry animations, gradients, extra card layers, or
message-level process/share buttons. History/new/overflow remain in ChatControls.

The pending indicator uses three native-driver bars, opacity and scale only;
stop on unmount/background and show static bars when Reduce Motion is enabled.
Never fake progress percentages. The complete page keeps one vertical transcript.
At tablet widths, the transcript and composer cap at 680dp. All action hit areas
are 48dp; icon font assets are bundled locally, with no network font requests.

## Exports

Native runtime source: `src/theme/tokens.ts`. Portable OKLCH export: `tokens.css`.
Platform system fonts are intentional for Chinese glyph coverage and font scaling.
Web-only layouts and effects do not enter the native app.

### Tailwind v4

```css
@import "./tokens.css";
@theme inline {
  --color-background: var(--color-canvas);
  --color-foreground: var(--color-ink);
  --color-accent: var(--color-primary);
  --font-sans: var(--font-body);
  --spacing-page: 20px;
}
```

### DTCG

```json
{
  "color": {
    "canvas": {
      "$type": "color",
      "$value": "oklch(97.564% 0.00549 211.04)"
    },
    "surface": {
      "$type": "color",
      "$value": "oklch(98.984% 0.00251 228.78)"
    },
    "surfaceMuted": {
      "$type": "color",
      "$value": "oklch(94.514% 0.00698 219.56)"
    },
    "ink": {
      "$type": "color",
      "$value": "oklch(22.028% 0.01105 216.98)"
    },
    "body": {
      "$type": "color",
      "$value": "oklch(39.925% 0.01159 222.27)"
    },
    "muted": {
      "$type": "color",
      "$value": "oklch(48.004% 0.00936 216.69)"
    },
    "border": {
      "$type": "color",
      "$value": "oklch(83.991% 0.00975 222.08)"
    },
    "primary": {
      "$type": "color",
      "$value": "oklch(47.908% 0.13102 255.27)"
    },
    "primaryPressed": {
      "$type": "color",
      "$value": "oklch(42.072% 0.11893 254.61)"
    },
    "primaryMuted": {
      "$type": "color",
      "$value": "oklch(94.975% 0.01542 257.20)"
    },
    "onPrimary": {
      "$type": "color",
      "$value": "oklch(98.013% 0.00347 219.53)"
    },
    "error": {
      "$type": "color",
      "$value": "oklch(51.994% 0.19006 24.90)"
    },
    "errorSoft": {
      "$type": "color",
      "$value": "oklch(95.383% 0.01852 13.38)"
    }
  }
}
```

### shadcn/ui

```css
:root {
  --background: var(--color-canvas);
  --foreground: var(--color-ink);
  --primary: var(--color-primary);
  --primary-foreground: var(--color-on-primary);
  --muted: var(--color-surface-muted);
  --muted-foreground: var(--color-muted);
  --border: var(--color-border);
  --ring: var(--color-primary);
  --radius: 12px;
}
```

### Composer refinement - 2026-09-07

User-requested exception to flat standard surfaces: the chat composer has no
visible border and uses a subtle neutral native shadow (iOS opacity 0.08,
radius 8dp, offset 2dp; Android elevation 3). Send and Stop use neutral ink icons
on a transparent background, muted when disabled, with a light pressed surface.
Keyboard focus on the action remains visible. Error feedback uses a soft error
surface and the existing error notice. Other surfaces retain the flat policy.

### Starter cards - 2026-09-07

The two empty-chat suggestions are separate compact surface cards, using 16dp
corners and a 12dp gap. Remove the shared divider; keep native Paper List.Item
press feedback and the existing draft-only action. No added card shadows.


## Chat variant · reference-led redesign · 2026-09-07

User approved Keitoto's AI Chat App: Conversation & Response Flow as the primary visual reference:
https://dribbble.com/shots/26439303-AI-Chat-App-Conversation-Response-Flow

This is a native adaptation of its composition, not a reproduction of artwork. It overrides the earlier chat-specific layout and cobalt palette. Runtime source: src/theme/chatTheme.ts; scoped Paper provider keeps other routes unchanged.

- Pale neutral canvas #F7F7FA, white surfaces, ink #202029, muted #6C6C7B, violet accent #6355CD. Colors are chosen for this implementation, not sampled source tokens.
- Compact centered 17dp brand header. History stays at left; new conversation and regenerate live in the right menu. Connection status appears only when actionable.
- Welcome is centered within the available transcript area: flat book mark, centered Chinese heading, supporting sentence, four compact two-column learning prompt cards. Cards only fill a draft.
- Transcript remains one native vertical list. User bubbles are white and compact; assistant content stays open. Markdown heading scale is reduced to 23 / 20 / 18dp, body remains 16dp with 26dp leading.
- Composer becomes a two-row surface: message and image drafts above, attachment control and neutral send/stop below. Keep the user-approved borderless surface and subtle native shadow.
- No upgrade banners, reference orb artwork, camera/voice placeholders, process or share buttons. Native system fonts intentionally retain Chinese readability. Existing native waiting bars and reduced-motion support remain.
- On small/keyboard-constrained viewports, welcome content can scroll; long messages, images and attachments continue using the existing data/rendering pipeline.


## Chat visual override · 2026-09-07 · full reference composition

The user explicitly rejected preserving the previous page and requested following the UI reference directly. This supersedes the earlier flat book mark, two-column cards, borderless composer, and colored-send restrictions for the chat surface.

- Primary reference: Keitoto Conversation & Response Flow, full New Chat screen. Pale lavender light at the upper left; original native SVG sphere with layered highlights; two-line serif-role welcome; five compact colored-icon pills in 3+2 flow; circular navigation controls.
- Empty-state composer: softly outlined outer frame, a short truthful attachment hint instead of a subscription claim, inner white input panel, clear action, product identity and paperclip, black circular send/stop control. During a conversation it becomes a compact single-row composer.
- User bubbles and answer labels follow the reference's open composition; conversation begins with a smaller sphere. Waiting indicator is a three-dot white capsule with existing native-driver/reduced-motion behavior.
- Native SVG is used for atmosphere and sphere (no WebView, remote assets or added dependencies). Chinese copy and actual DeepTutor actions remain; unavailable paid tiers, model switches and voice controls are not fabricated.

Sphere asset update: the final orb is a locally bundled imagegen PNG at src/chat/assets/chat-orb.png, rendered with native Image; the initial SVG sphere was replaced after visual review. Background lighting remains native SVG.

Background refinement: chat canvas is lavender-white #F6F5FA with a soft upper-left wash (#E8E3FA through #F0EDF9), fading over 440 dp. White controls remain distinct from the tinted page.

Safe-area refinement: atmosphere sits behind the full chat safe area, including the transparent Android status bar; the Android gesture navigation bar matches #F6F5FA. Safe-area content insets remain in place.

### Navigation and loading refinement

Menu opens below its anchor without the extra Android status-bar offset. History uses the native modal fade transition (disabled with reduced motion). Selecting a session keeps history visible until the client finishes loading, with one row-level indicator. List requests retain a minimum 450 ms pending duration on success and failure; slower requests incur no extra delay. Refresh, initial, pagination and session-opening indicators are mutually exclusive.

### App identity and launch

Use the approved local chat orb for launcher icons and launch screens. Canvas #F6F5FA; center orb 96 dp. Cold-start reveal scales 0.92 to 1 over 600 ms, then fades the cover over 260 ms once startup resolves; minimum cover duration 850 ms. Reduced motion uses a static orb and 120 ms fade. Initialization continues beneath the cover; subsequent foreground resumes do not replay it. Native launch screens share the same orb and background. Export assets on macOS with `swift scripts/export-app-icons.swift "$PWD"` from mobile/.
