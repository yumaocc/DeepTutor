# DeepTutor Mobile 实现状态

- 重置日期：2026-08-31
- 文档统一日期：2026-09-06
- 当前阶段：运行时基础与登录代码已落地，真实 Chat 适配与富内容预览代码已落地，真实后端与三端验收待完成
- 产品验收：尚无完成三端验收的产品闭环，不使用代码量估算完成百分比
- 状态标记：✅ 已通过对应验收 · 🟡 部分代码已落地/待集成或真机验收 · ⬜ 未完成 · 🚫 明确不做

本文是实现与验收状态的主记录；范围和优先级以 `WEB_TO_MOBILE_FEATURE_MATRIX.md` 为准，执行顺序见 `MIGRATION_PLAN.md`。

## 状态重置说明

旧 `mobile/` 中基于 Taro 的完成状态不继承到本工程。旧代码不会迁移，旧测试结果也不能证明新的 React Native/RNOH 实现已经完成。本文从零记录新工程的真实执行状态。

已经存在的 RN、Paper、Assistant UI、RNOH、Android APK 和 Harmony JS Bundle 只视为技术基础验证，不折算为登录、聊天、会话或学习功能完成。

## 已验证的工程事实

以下内容是当前脚手架事实，不是产品验收状态：

- React Native 0.77 兼容工程能够完成类型检查、Lint、基础单元测试和 Android 原生编译；
- React Native Paper、Assistant UI Native、Reanimated 和 Safe Area Context 已安装；
- Android 可生成内置 JS Bundle、使用调试证书签名的测试 APK；
- Harmony 可生成 RNOH JS Bundle，ArkUI 容器已注册 Reanimated、安全区和图标字体；
- App Provider 已统一 Safe Area、Paper、Query、键盘事件和 AppState；
- `SafeAreaScreen`、系统栏、键盘几何 Hook 和 Android `adjustResize` 基础已落地；
- HTTP Client 已覆盖 URL、Bearer、JSON/FormData、超时、取消、Zod 校验和稳定错误模型；
- 启动状态机、根导航、Deep Link、系统返回、离线/升级/错误门控已落地；
- AsyncStorage 版本化配置、Android/iOS 安全凭据 Repository 已落地；
- NetInfo 已接入 Query OnlineManager，WebSocket Runtime 已覆盖心跳、重连、续传、取消和 AppState；
- 日志脱敏和全局 Error Boundary 已落地；
- Harmony 已映射 AsyncStorage、NetInfo、Gesture Handler、Navigation、Reanimated 和 Safe Area；
- Harmony 社区 SensitiveInfo 因硬编码密钥/IV 被拒绝使用，HUKS Adapter 仍未完成；
- 登录页、AuthClient、当前后端 Cookie 登录、Auth-disabled 自动进入和安全错误映射已落地；移动 Bearer/Refresh Token 接口仍待实现；
- Harmony 原生 HAP、iOS App 和三端真机链路均未验证；
- 当前聊天页已接入真实 `/ws` v2 Adapter；发送、停止、重新生成、历史加载和活跃回合恢复已实现，真实模型联调待完成。
- ECharts/Chart.js JSON、HTML、SVG、Mermaid、Markdown/KaTeX 预览与生成附件卡片已实现；原生文件上传和完整二进制文件预览仍未完成。

## 本次验证（2026-09-06）

- TypeScript、ESLint、10 组 Jest 测试（31 项）通过；
- Android 原生 Release 测试 APK 与 Harmony JS Bundle 构建通过；
- Android 模拟器使用独立 QA applicationId 与受控 v2 协议服务，已验证发送、流式结果、新建对话后从历史恢复消息及图表入口、ECharts 预览、HTML 按钮交互和 Viewer 系统返回；
- 浏览器验证离线 ECharts、Chart.js、Mermaid、Markdown/KaTeX 和 HTML 页内交互；
- 当前没有真实模型联调结果，也没有 iOS/Harmony 真机验收结果；
- Android 模拟器报告现有 RN/Reanimated/Screens 等原生库的 16 KB 页对齐兼容提示，当前在兼容模式运行；正式发布前需单独解决。

## 1. 工程与发布

| 状态 | 项目               | 验收要求                                                      |
| ---- | ------------------ | ------------------------------------------------------------- |
| 🟡   | 正式移动端目录收敛 | RN 工程已位于 `mobile/`；旧工程归档与全仓引用清理待核验       |
| ⬜   | 正式应用标识       | 确认 Android applicationId、iOS Bundle ID、Harmony bundleName |
| ⬜   | 正式签名           | Android、iOS、Harmony 分别配置非调试签名与密钥管理            |
| ⬜   | iOS 构建           | Xcode 构建并安装到真实 iPhone                                 |
| ⬜   | Harmony HAP        | DevEco、ohpm、签名和目标 ROM 完成原生构建                     |
| ⬜   | CI                 | 类型、测试、双平台 Bundle、APK/HAP 构建和产物检查进入 CI      |
| ⬜   | 三端真机基线       | Android、iOS、Harmony 完成启动、返回、键盘、安全区和后台恢复  |

## 2. UI 基础与导航

| 状态 | 项目         | 验收要求                                                               |
| ---- | ------------ | ---------------------------------------------------------------------- |
| ⬜   | Design Token | `DESIGN.md` 的颜色、字体、间距、圆角、层级和动效进入代码               |
| ⬜   | Paper Theme  | Light/Dark、动态字体和语义颜色在三端验证                               |
| ⬜   | 基础组件     | Button、Input、Surface、List、Notice、Sheet、Dialog、Empty/Error State |
| 🟡   | App Shell    | Safe Area、状态栏、键盘避让、系统返回和加载边界统一                    |
| 🟡   | 根导航       | 启动门控、Stack、Deep Link 和系统返回已完成；一级 Tab 待业务实现       |
| ⬜   | 浮动菜单     | 停靠、隐藏、激活、无障碍和手势冲突完成                                 |
| ⬜   | 图标系统     | Paper 图标和 Harmony 字体注册完成真机验证                              |

## 3. 账号与服务器

| 状态 | 项目          | 验收要求                                                                |
| ---- | ------------- | ----------------------------------------------------------------------- |
| 🟡   | 服务器配置    | API/WS 地址输入、校验、保存、切换和错误反馈                             |
| 🟡   | 登录          | `/api/auth/login` Cookie 契约、表单和错误映射已接入；移动 Bearer 与真机验收待完成 |
| ⬜   | 首管理员注册  | 仅空白服务器开放，注册后自动登录；普通用户由 Web 管理员创建             |
| ⬜   | Bootstrap     | 用户、模型、工具、能力、知识库和版本信息加载                            |
| 🟡   | 安全存储      | Android Keystore/iOS Keychain 已接入；Harmony HUKS 未完成               |
| 🟡   | 登录态恢复    | 启动恢复、过期/服务器不匹配清理和 `/api/auth/status` 门控已完成；真机待验收      |
| ⬜   | Refresh Token | 轮换、撤销和重放检测                                                    |

## 4. Chat 与会话

| 状态 | 项目              | 验收要求                                                                      |
| ---- | ----------------- | ----------------------------------------------------------------------------- |
| 🟡   | DeepTutor Adapter | 已接入 Assistant UI External Store 与 `/ws` v2；真实模型待验收                                |
| 🟡   | WebSocket         | Runtime 已实现鉴权、心跳、重连、`resume_from`、生命周期和取消；真实后端待验收 |
| 🟡   | 消息状态          | 已实现聚合、去重、done 终止、结果替换和持久化 ID 对齐；真实后端待验收                                    |
| 🟡   | Chat 页面         | 原生消息流、Composer、发送、停止和错误提示已接入；体验与真机验收待完成                                    |
| 🟡   | 会话管理          | 列表、分页、加载与新建已实现；搜索、重命名和删除待实现                                          |
| ⬜   | 上下文选择        | Capability、模型、工具和知识库                                                |
| 🟡   | `ask_user`        | 单选、多选、自由文本及 command_ack 接入；真实后端待验收                                              |
| 🟡   | 重新生成          | 已接入 regenerate，拒绝时保留旧回答；真实后端待验收                                                |
| 🟡   | 弱网恢复          | Chat 生命周期与 resume_from 已接入；断网、切后台和重启待真机验收                                          |

## 5. 富内容与附件

| 状态 | 项目                   | 验收要求                                |
| ---- | ---------------------- | --------------------------------------- |
| 🟡   | Markdown               | 原生正文与 Markdown 附件排版、安全链接已实现        |
| 🟡   | 数学公式               | 离线 KaTeX Viewer 已实现；长公式和动态字体待真机验收               |
| ⬜   | 代码块                 | 高亮、复制、换行、语言标签和长行处理    |
| 🟡   | Mermaid/SVG/Chart/HTML | 已有全屏预览、源码回退、错误与摘要；三端验收待完成     |
| ⬜   | 附件                   | 文件/相册选择、上传进度、移除和失败重试 |
| 🟡   | 文件操作               | 生成附件卡片、同源文本预览和外部打开已实现；鉴权下载与二进制 Viewer 待实现              |

## 6. 学习与个人内容

| 状态 | 项目                               | 验收要求                       |
| ---- | ---------------------------------- | ------------------------------ |
| ⬜   | Deep Solve / Research              | 移动配置、进度和最终结果       |
| ⬜   | Quiz / Mastery Path                | 作答、判分、进度和继续学习     |
| ⬜   | Knowledge                          | 列表、文件、上传和用户可写权限 |
| ⬜   | Notebook / 题库                    | 浏览、保存、删除和分类         |
| ⬜   | Profile / Preferences              | 资料、语言、主题、服务器和退出 |
| ⬜   | Book / Co-writer / Memory / Skills | 按移动体验裁剪后的 P2 能力     |

## 7. 明确不进入移动端

| 状态 | 范围                                         |
| ---- | -------------------------------------------- |
| 🚫   | 管理员用户、角色和 Grant 管理                |
| 🚫   | Provider、API Key、Embedding、搜索和解析配置 |
| 🚫   | MCP、CLI Apps、Agent 安装和底层连接配置      |
| 🚫   | 网络、端口、部署状态和系统诊断               |
| 🚫   | Playground 和其他开发运维工作台              |

## 更新规则

1. 新 RN/RNOH 代码部分落地后标为 🟡；只有通过该项全部验收要求（包括适用的自动化、集成和真机检查）才能标为 ✅；
2. 三端能力必须分别记录，Android APK 不能代替 iOS/Harmony 验收；
3. 模拟 Adapter、Mock 页面和静态占位不计为功能完成；
4. 每次状态变化必须同步更新 `MIGRATION_PLAN.md` 和 `WEB_TO_MOBILE_FEATURE_MATRIX.md`；
5. 旧 Taro 工程的代码、截图和测试不得作为新工程完成证据。

### 2026-09-06 登录接口兼容修复

- 部署服务器使用 `/api/v1/auth/status`，此前客户端固定 `/api/auth/status` 导致 404。
- 通过只读认证状态接口识别 `/api` 或 `/api/v1`，按服务器地址缓存；登录、启动校验、会话接口和 WebSocket 使用相同路由版本。
- 仅状态探测遇到 404 时切换路径；不重放登录请求，不因 401 切换路径。404 提示明确指出地址或部署版本问题。
- TypeScript、ESLint、10 个测试套件共 33 个测试通过。实际部署的状态接口返回 200、会话接口返回未登录 401，版本化 WebSocket 返回未登录 403；账号登录成功及真实模型对话仍需登录后验证。

### 2026-09-06 真实服务器对话联调

- 已在 Android 模拟器登录实际部署，通过两轮真实问答验证：17 × 23 = 391，后续追问能记住上轮结果。
- 修复版本化部署的旧事件无 `protocol_version` 时被拒绝的问题；仅识别为 `/api/v1` 的部署启用旧事件兼容，保留显式未知版本校验。补充旧版回合启动失败的错误展示和输入解锁。
- 真实生成的 HTML 柱状图展示 A=17/B=23；另一 HTML 按钮交互成功显示 Clicked!。模型按钮初始文本包含空白，第二次点击才切换文字，属于生成内容行为。
- 历史回读发现 Android WebView 的 incognito 会全局清空 CookieManager，导致预览后掉登录。Android 改为关闭 incognito、单独禁用缓存，继续使用无来源文档、iframe sandbox 和 CSP 网络限制。
- 35 项测试通过，TypeScript / ESLint 通过；Cookie 修复后的真实登录及历史恢复已完成下述补测。此记录不代表 iOS/Harmony 已验收。

### 2026-09-06 Cookie 修复后补测通过

- 用户重新登录后，从真实服务器历史列表恢复计算会话，原始问答与两份 HTML 预览均保留。
- 打开柱状图与网页预览，按钮成功切换为 Clicked!；退出后手动刷新历史列表成功，未被踢回登录页。
- 强制停止并重启 Android 应用，登录态仍有效；再次打开历史并恢复同一会话成功。
- 在恢复后的会话追问“给此前乘法结果加 9，仅回复数字”，观察到正在思考/停止状态，然后返回 400，输入区恢复发送状态。验证了重启后的上下文续聊与回合结束。
- 范围：当前 Android 模拟器和实际部署服务器的基础聊天、历史恢复、HTML 图表及交互预览。文件上传、PDF/Office、其他平台及更多异常恢复场景仍待验收。

### 2026-09-06 对齐 Web Markdown 正文解析

- Web 端链路：`MarkdownRenderer` 自动选择 Simple/Rich，使用 GFM、数学预处理 + KaTeX、语法高亮、Mermaid、引用及附件链接。
- 移动端回复气泡直接渲染 Markdown；构建时打包 Web 的 `normalizeMarkdownForDisplay`、`stripArtifactAnnotations` 和 `processMarkdownContent`，避免复制后规则漂移。构建需要完整仓库中的 `web/lib`。
- 支持标题、强调、删除线、引用块、链接、图片、任务列表、表格、行内/块级公式、普通代码高亮和复制；旧 flow/seq/sequence 语法沿用 Web 转換规则。Mermaid 按需加载内嵌显示，HTML/ECharts/SVG 等交互内容仍从代码块进入隔离预览。
- 公式由 remark-math / rehype-katex 解析，代码中的公式符号和转义美元符号保持原样。已知附件文件名可转换为可点击链接；正文 HTML 清理后显示，不执行模型脚本。
- 流式更新复用同一个正文文档并合并 60ms 内的更新，自动测量高度；Android 不启用会清除全局 Cookie 的 incognito。
- 11 个测试套件共 40 项测试通过（含 GFM、流式替换、公式/代码/价格、HTML 清理、附件链接、Web 文本预处理）。Android 真实模型回复已目视确认标题/强调/列表/表格/公式/代码高亮直接显示。
- 差异：Web 的编辑器源码行号跟踪、代码显示偏好、GeoGebra 专用入口未迁移；移动端使用适合触屏的代码复制和隔离预览操作。iOS/Harmony 真机排版仍待验收。

- 按“优先使用库”的要求，正文最终采用 unified + remark-parse / remark-gfm / remark-math / remark-rehype + rehype-raw / rehype-katex / rehype-stringify，与 Web 的 ReactMarkdown 底层插件链一致；没有自定义 Markdown 或公式 tokenizer。高亮使用 highlight.js，清理使用 DOMPurify，图表使用 Mermaid。手写代码仅用于平台桥接、布局和业务附件/引用操作。
- 最终包验证：Android 重新安装保留登录，历史中的 Markdown 示例以标题/强调/列表/表格/KaTeX/高亮代码直接显示；Mermaid 三个节点 Start → Learn → Done 的图形和文字均可见。修复了 SVG 清理移除 foreignObject 标签文字的问题，采用 Mermaid 自带的 `htmlLabels: false` 配置。Android APK 与 Harmony bundle 构建通过（Harmony 仅打包验证）。

### 2026-09-06 对话纵向滚动修复

- 正文 WebView 关闭 `nestedScrollEnabled`，让 Android 父级 assistant-ui FlatList 接管纵向拖动；隐藏内外纵向指示条并关闭正文 WebView overscroll，HTML 根节点不建立纵向滚动区域。
- 删除特殊代码块的 180px 高度限制，正文和代码块按内容撑开，代码/表格只保留横向溢出；全屏独立 Markdown 预览仍可纵向滚动。
- Android 模拟器实测两个长回复会话（包括原先卡在“一元一次方程”小结的会话）：在正文中央连续上下滑动成功，能到达后续回复、附件以及末尾分享按钮，不再需要沿边缘拖动。
- 代码复制后粘贴内容一致；测试输入已清空且未发送。40 项测试、TypeScript 与 ESLint 通过。
- 此次针对手势争抢和正文内部滚动；流式全文重排及回合结束 ID 替换的进一步性能优化未纳入本次修改。


### 2026-09-06 原生消息渲染（替代上述正文 WebView 方案）

- `MarkdownMessage` 改为 `react-native-markdown-display` 的 Text/View；GFM、任务列表与脚注由 markdown-it 及插件解析，业务代码不手写 Markdown tokenizer。仍复用 Web 的文本、LaTeX 和引用预处理。
- MathJax liteAdaptor 在 JS 中离线排版，react-native-svg 绘制公式路径；无浏览器、无高度回传。代码高亮使用 lowlight，代码复制走原生剪贴板。
- 会话正文和展开过程不包含纵向 ScrollView，只有 assistant-ui FlatList 纵向滚动；宽表格、公式和代码只横向滚动且隐藏指示条。
- Markdown 附件预览也改为原生；HTML、Mermaid 和交互图表仅在点击独立预览时使用受限浏览器。Mermaid 不再在正文自动绘制，保留源码及预览入口。
- 固定 Markdown AST 与根节点 key，服务端完成事件回填 ID 时保留 uiId，避免流式更新和回合完成使原生内容整体重新挂载。公式使用有界缓存。
- 注册 Harmony SVG HAR/C++/ArkTS 依赖。Android 安装验证与 Harmony JS bundle 分开验收，iOS/Harmony 原生运行尚未验证。
- 回归：43 个测试通过（含 GFM/脚注兼容、公式矢量结果、有界横向滚动、长文本末尾和消息 uiId）；typecheck/lint 通过。模拟器在原“一元一次方程详解”会话中从正文中央持续上滑，可到末尾图解附件及完整“分享回答”按钮；聊天原生视图树中 RNCWebView 为 0。
- 实时回归：新会话返回表格、行内/块级公式及 NATIVE_CHAT_DONE；完整结束标记与分享按钮可见，日志无 ReactNativeJS/AndroidRuntime 错误。公式视口按实际 viewBox 等比定尺寸，避免原生行内 SVG 使用最小高度后裁切。


### 2026-09-06 原生聊天页视觉调整（Hallmark）

- 按用户选择的“安静精致”方向，统一为轻量图标工具栏、开放的 AI 阅读区、紧凑浅蓝用户气泡和一体输入框；移除回复下方“查看过程 / 分享回答”按钮，历史、新对话和重新生成入口保留。
- 思考状态使用原生 Animated 三条短线错峰起伏和 native driver；支持减少动态效果，后台及卸载时停止动画。正文继续原生 Markdown，整段会话统一纵向滚动。
- 补齐 Android 图标字体打包；修复 Activity 重建时的 Fragment 状态恢复崩溃。
- TypeScript、ESLint 通过，13 个测试套件 / 45 项测试通过；Android 独立 APK 构建并安装。320 / 375 / 414 / 768 dp 宽度空态目视通过，模拟器已恢复原始尺寸和密度。
- 实际服务器聊天验证：等待短线动效可见，随后返回含标题、公式、表格的回答，完成后恢复发送状态；关闭键盘后可滚至表格最后一行，未被输入区遮挡。
- Harmony 仅 JS bundle 构建通过；iOS / Harmony 原生运行及真机手感尚未验收。


### 2026-09-07 聊天图片上传

- 输入框增加原生相册入口，使用 react-native-image-picker 8.2.1；选图后进入 assistant-ui 附件草稿，发送前支持缩略图、原生大图预览及移除，支持纯图片与图文发送。
- 沿用 Web 的 start_turn.attachments（type / filename / mime_type / base64）协议；本地缩放至最长边 2048、JPEG quality 0.8，每次最多 4 张，单张最多 4 MB，合计最多 8 MB。服务端保留最终限制和验证。
- 已发送图片使用原生 Image 和 Modal 预览，不通过 WebView；历史中的图片 URL 沿用已有附件地址解析。图片气泡收紧，点击图片即可预览。切换或新建会话清理附件草稿。
- Android 实测系统选图、缩略图预览、移除、纯图片发送、AI 识别及历史恢复通过；测试图为本地创建的左红右蓝色块，AI 正确识别，历史回读图片仍显示。
- 14 个测试套件 / 48 项测试通过；TypeScript / ESLint 通过。iOS 已配置相册用途说明，但未运行原生构建。Harmony 相册适配尚未接入，保留明确失败返回，避免缺失原生模块导致聊天页崩溃。


### 2026-09-07 按已确认参考重构聊天视觉

- 采用 Keitoto Conversation & Response Flow 的居中欢迎区、轻量导航、紧凑入口和开放阅读区构图，新增聊天页专用 chatTheme.ts。其他路由保持原主题。
- 欢迎页改为四个两列学习卡片；输入框改为编辑区加底部工具行，保留无色发送按钮、浅阴影及图片草稿。新对话和重新生成收纳到右上菜单。
- 原生 Markdown 标题字号收紧，正文保持 16dp / 26dp，等待条使用聊天页紫色强调。没有复制参考装饰图、增加付费入口或恢复分享/过程按钮。
- TypeScript / ESLint / 48 项测试通过；Android APK 构建并安装，Harmony JS bundle 通过。320 / 375 / 414 / 768 dp 四种空态布局逐一目视通过。
- Android 验证快捷卡片填入草稿、键盘避让、新对话清理草稿、历史恢复及长回复滚动到末尾。历史公式、表格和图片保持原生显示；最终文字位于输入区上方，未被遮挡。
- 原生 iOS / Harmony 未实测；本次未改变此前 Harmony 图片选择尚未适配的范围。


### 2026-09-07 参考图完整构图重做

- 用户明确要求忽略旧页面后，取消旧四卡片结构，采用圆形导航、两行衬线欢迎语、五个彩色图标胶囊（3+2）、淡紫背景光感和分层输入面板。
- 首页与对话使用不同输入布局：对话收成单行工具栏；黑色圆形发送/停止、回形针选图、清空草稿、帮助、新对话及重新生成都连接实际操作。
- 球体最终采用 imagegen 生成的本地透明 PNG（src/chat/assets/chat-orb.png），替换初版 SVG 球体。背景光感仍为原生 SVG，消息仍为原生 Markdown，不使用 WebView。
- 等待动画改为原生三点胶囊，保留 reduced-motion、后台暂停及卸载清理。48 项测试通过，TypeScript / ESLint 通过。
- Android 检查：320 / 375 / 414 / 768 dp 布局；历史图片和回答恢复；聊天输入栏随键盘抬升。模拟器尺寸和密度已恢复。
- 素材和中文排版为本地实现，非原作者源文件；未添加无法使用的语音、模型切换或订阅入口。iOS / Harmony 原生效果仍待实测。

### 2026-09-07 Global reference tokens and composer

Shared tokens/Paper theme now use the approved lavender palette; DESIGN.md current section supersedes historical styling. Welcome composer places product/send on the second row and attachment on a separate bottom row. Typecheck, lint and Android APK build passed. Emulator visual checks: 320/375/414/768 dp, keyboard-visible input, enabled send styling, native photo picker opening. No message sent during this visual check. Other routes inherit shared colors; their layouts have not been fully migrated.

### 2026-09-07 Native history redesign

History now shares the lavender atmosphere and circular navigation, with white rounded rows and a current-session label. FlatList replaces ScrollView; pull-to-refresh, guarded pagination and retry/empty/loading states are implemented. Typecheck/lint/build passed. Android screenshots verified at 320/375/414/768 dp; opening a stored math conversation and returning to its selected row verified. Pagination failure and empty states were not exercised against the live server.

### 2026-09-07 Menu, transition and loading fixes

Paper menu now anchors downward with statusBarHeight=0. History modal fades unless reduced motion is enabled; session selection keeps the list visible until client loading ends. All history list requests have a 450 ms minimum, including failures, with mutually exclusive initial/refresh/page/session indicators and request guards. Typecheck/lint and 3 timing tests passed; Android build installed. Menu safe-area positioning, history session opening and pull-to-refresh verified on emulator.

### 2026-09-07 App icon and cold launch

Approved orb exported into Android legacy/adaptive launcher icons, iOS app icon catalog, and both Harmony icon locations. Native launch backgrounds configured; iOS storyboard placeholder replaced by orb. Shared LaunchExperience provides one startup scale/fade with reduced-motion behavior and preserves auth/offline/fatal routes. Android APK built and installed; launcher icon and cold-start frames visually verified. Typecheck/lint passed, 4 launch handoff tests and 3 minimum-duration tests passed. iOS storyboard XML and opaque icon checked; iOS/Harmony native builds were not run.
