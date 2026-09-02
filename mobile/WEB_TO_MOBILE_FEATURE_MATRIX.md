# DeepTutor Web → Mobile 用户功能矩阵

- 原始 Web 审计日期：2026-08-25
- RN/RNOH 状态重置：2026-08-31
- 审计范围：`web/app`、用户功能组件、前端 API Client、FastAPI 路由与权限装配
- 移动端目标：Android、iOS、HarmonyOS NEXT
- 核心原则：迁移普通用户的学习和创作能力，不迁移管理员控制台或后端服务配置
- 代码策略：不迁移旧 Taro 代码，所有功能在 RN/RNOH 工程重新实现

状态标记：⬜ 未完成 · 🚫 不迁移。

本矩阵的旧完成/部分完成标记已经全部重置。Mock、脚手架、JS Bundle
或 Android 测试 APK 不计为产品功能完成。

优先级：

- P0：移动端可作为日常聊天客户端使用；
- P1：形成完整学习闭环；
- P2：高级创作、个性化和重型工作台；
- Web：只保留在 Web 管理端或桌面工作台。

## 1. 迁移边界

移动端迁移的是“用户完成学习目标所需的行为”，不是 Web 页面本身。

以下内容属于移动端范围：

- 登录、个人资料和退出；
- 日常聊天、会话历史和回合控制；
- 用户被授权的模型、工具、Capability 和知识库；
- 附件、内容预览和生成产物；
- Deep Solve、Deep Research、Quiz、Visualization 和 Mastery Path；
- Notebook、题库、Persona、用户 Skills、Memory 等个人内容；
- Book 和 Co-writer 的移动精简体验。

以下内容不属于移动端范围：

- 用户、角色和 Grant 管理；
- 模型供应商、API Key、Embedding、搜索、图像、视频、STT/TTS 服务配置；
- MCP Server、CLI App 和外部 Agent 的安装、连接及底层配置；
- MinerU、文档解析引擎、网络、端口、CORS 和服务状态诊断；
- RAG Provider、索引引擎、远程 LightRAG/Obsidian/本地目录连接配置；
- Playground、系统调试和部署维护界面。

## 2. Web 路由迁移结论

| Web 路由               | Web 能力                               | 移动端结论                                                  | 优先级 | 当前状态 |
| ---------------------- | -------------------------------------- | ----------------------------------------------------------- | ------ | -------- |
| `/login`               | Cookie 登录、鉴权状态                  | 重做为服务器连接 + Bearer 登录                              | P0     | 🟡       |
| `/register`            | 创建首个管理员                         | 合并到账号页；仅空白服务器开放，普通用户仍由 Web 管理员创建 | P0/Web | ⬜       |
| `/home/[sessionId]`    | 完整 Chat Workspace                    | 重做为移动聊天主页面                                        | P0     | ⬜       |
| `/space/chat-history`  | 会话列表、搜索和管理                   | 合并到聊天 Tab                                              | P0     | ⬜       |
| `/knowledge`           | 知识库浏览、创建、文件和引擎配置       | 迁移用户浏览/上传/管理；引擎配置留 Web                      | P0/P1  | ⬜       |
| `/notebook`            | Notebook 和题库入口                    | 合并到学习 Tab                                              | P1     | ⬜       |
| `/space/notebooks`     | Notebook CRUD 和记录浏览               | 迁移                                                        | P1     | ⬜       |
| `/space/questions`     | 题库、书签和分类                       | 迁移                                                        | P1     | ⬜       |
| `/space/learning`      | Mastery 进度、重做和删除               | 迁移                                                        | P1     | ⬜       |
| `/space/personas`      | Persona 浏览、创建和编辑               | 先迁移选择，再迁移管理                                      | P1/P2  | ⬜       |
| `/space/skills`        | 用户 Skill 浏览、安装和编辑            | 先迁移浏览/启用，编辑延后                                   | P2     | ⬜       |
| `/memory`              | Memory 总览                            | 移动精简版                                                  | P2     | ⬜       |
| `/memory/graph`        | Memory 关系图                          | 只做查看器                                                  | P2     | ⬜       |
| `/memory/l1`           | Memory L1 工作台                       | 移动精简版，复杂维护留 Web                                  | P2     | ⬜       |
| `/memory/l2/*`         | Memory L2 工作台                       | 移动精简版，复杂维护留 Web                                  | P2     | ⬜       |
| `/memory/l3/*`         | Memory L3 工作台                       | 移动精简版，复杂维护留 Web                                  | P2     | ⬜       |
| `/memory/resolve`      | Memory 冲突处理                        | 可做任务式移动页面                                          | P2     | ⬜       |
| `/profile`             | 资料、头像和退出                       | 迁移到“我的”                                                | P1     | ⬜       |
| `/agents`              | 外部 Agent 连接和状态                  | 仅消费已连接 Agent；连接/配置留 Web                         | P2/Web | ⬜       |
| `/book`                | Book 创建、阅读、重建和块编辑          | 阅读与问答优先，复杂编辑延后                                | P2     | ⬜       |
| `/co-writer`           | 文档列表和创建                         | 迁移文档列表和轻编辑                                        | P2     | ⬜       |
| `/co-writer/[docId]`   | 双栏 Markdown 编辑、AI 改写和批注      | 做移动单栏精简版；完整工作台留 Web                          | P2/Web | ⬜       |
| `/partners/*`          | Partner 创建、配置、Channel 和聊天     | 当前后端整体 admin-gated，不作为普通用户迁移能力            | Web    | 🚫       |
| `/playground`          | Capability/API 调试工作台              | 不迁移                                                      | Web    | 🚫       |
| `/space/mcp`           | 用户 MCP 服务管理                      | 不迁移；后端自动挂载被授权能力                              | Web    | 🚫       |
| `/space/cli-apps`      | CLI App 目录与启用                     | 不迁移；后端使用管理员授权和用户偏好                        | Web    | 🚫       |
| `/settings/appearance` | 主题、语言、代码块偏好                 | 迁移适合移动端的子集                                        | P1     | ⬜       |
| `/settings/chat`       | Chat 响应与界面偏好                    | 迁移适合移动端的子集                                        | P1     | ⬜       |
| `/settings/tools`      | 可选工具启停                           | 合并到 Chat 工具选择器                                      | P0     | ⬜       |
| `/settings/tts`        | TTS Provider + 自动朗读偏好            | Provider 留 Web；自动朗读偏好迁移                           | P1     | ⬜       |
| 其他 `/settings/*`     | Provider、解析、网络、状态、Agent 配置 | 不迁移                                                      | Web    | 🚫       |
| `/admin/users`         | 用户、角色和 Grant                     | 不迁移                                                      | Web    | 🚫       |

## 3. 账号与身份

| 用户能力                | Web 依据/API                      | 移动端设计                                                               | 优先级 | 当前状态 |
| ----------------------- | --------------------------------- | ------------------------------------------------------------------------ | ------ | -------- |
| 配置 DeepTutor 服务地址 | Web 固定同源；移动端新增          | 首次启动或“我的”中配置 HTTPS 地址                                        | P0     | ⬜       |
| 登录                    | `/api/v1/auth/login`              | `/api/v1/auth/mobile/login` 返回 Bearer Access Token                     | P0     | 🟡       |
| Auth-disabled 本地模式  | `/api/v1/auth/status`             | 无密码进入 local-admin 空间                                              | P0     | 🟡       |
| 安全保存凭证            | Web HttpOnly Cookie               | 平台 SecureStorage Adapter：Android Keystore、iOS Keychain、Harmony HUKS | P0     | 🟡       |
| Refresh Token           | Web Cookie 会话                   | 轮换、撤销、重放检测                                                     | P0     | ⬜       |
| 获取用户有效能力        | Web 分散读取多个接口              | `/api/v1/auth/mobile/bootstrap` 聚合返回                                 | P0     | ⬜       |
| 查看个人资料            | `/api/v1/auth/profile`            | “我的”资料页                                                             | P1     | ⬜       |
| 修改头像                | `/api/v1/auth/profile`、`/avatar` | 图标头像、拍照/相册上传、删除                                            | P1     | ⬜       |
| 退出登录                | `/api/v1/auth/logout`             | 清除安全存储、内存、缓存和 Socket                                        | P0     | ⬜       |
| 首用户注册              | `/register`、`/is_first_user`     | 账号页检查服务器状态，创建首个管理员后立即登录                           | P0     | ⬜       |
| 普通用户创建            | `/admin/users`                    | 不开放自助注册；管理员继续在 Web 创建账号                                | Web    | 🚫       |

## 4. 会话与聊天生命周期

| 用户能力             | Web 依据/API                                  | 移动端设计                         | 优先级 | 当前状态 |
| -------------------- | --------------------------------------------- | ---------------------------------- | ------ | -------- |
| 新建聊天             | `/api/v1/ws` `start_turn`                     | 聊天首页直接输入                   | P0     | ⬜       |
| 流式回复             | StreamEvent `content/result/done/error`       | 原生消息列表逐步更新               | P0     | ⬜       |
| 连接状态             | WebSocket heartbeat/reconnect                 | 顶部连接状态和错误恢复             | P0     | ⬜       |
| 弱网自动重连         | `resume_from`                                 | 指数退避重连                       | P0     | ⬜       |
| 流事件补发与去重     | `turn_id + seq`                               | 按序续传并丢弃重复事件             | P0     | ⬜       |
| 会话列表             | `GET /api/v1/sessions`                        | Chat Tab 的历史入口                | P0     | ⬜       |
| 加载会话             | `GET /api/v1/sessions/{id}`                   | 恢复消息、事件、附件和偏好         | P0     | ⬜       |
| 会话分页/搜索        | `limit/offset` + Web 本地筛选                 | 增量分页和已加载会话搜索           | P0     | ⬜       |
| 重命名会话           | `PATCH /api/v1/sessions/{id}`                 | 管理菜单进入独立重命名页           | P1     | ⬜       |
| 删除会话             | `DELETE /api/v1/sessions/{id}`                | 二次确认后删除                     | P0     | ⬜       |
| 停止生成             | WS `cancel_turn`                              | 输入区切换为停止按钮               | P0     | ⬜       |
| 重新生成             | WS `regenerate`                               | Assistant 消息更多菜单             | P0     | ⬜       |
| 服务端拒绝恢复       | `regenerate_busy`、`nothing_to_regenerate`    | 恢复被临时移除的消息并提示         | P1     | ⬜       |
| 编辑用户消息         | `parent_message_id`                           | 编辑后创建新分支                   | P2     | ⬜       |
| 分支切换             | `PUT /sessions/{id}/branch-selection`         | 消息旁的分支导航                   | P2     | ⬜       |
| 删除一轮消息         | `DELETE /sessions/{id}/messages/{message_id}` | 消息更多菜单                       | P1     | ⬜       |
| Turn 导航            | Web `TurnNavigator`                           | 长会话快速跳转                     | P2     | ⬜       |
| `ask_user` 暂停/回复 | WS `submit_user_reply`                        | 原生单题/多题回复卡片              | P0     | ⬜       |
| 连接失败/超时        | Web watchdog 和 retry 状态                    | 可恢复错误、重试和服务器入口       | P0     | ⬜       |
| 导出聊天             | Web Markdown 下载                             | 原生 Share Sheet 导出 Markdown/PDF | P1     | ⬜       |

## 5. Chat Composer 与上下文

| 用户能力          | Web 依据/API                                              | 移动端设计                                | 优先级 | 当前状态 |
| ----------------- | --------------------------------------------------------- | ----------------------------------------- | ------ | -------- |
| 文本输入          | `ChatComposer`                                            | 自适应输入框、发送和停止                  | P0     | ⬜       |
| Capability 选择   | Chat、Solve、Quiz、Research、Visualize、Mastery           | 独立移动选项页，不做桌面下拉菜单          | P0     | ⬜       |
| 模型选择          | `/api/v1/settings/llm-options`、Bootstrap models          | 只显示当前用户被授权模型                  | P0     | ⬜       |
| 工具选择          | `/api/v1/tools`、`/settings/enabled-tools`                | 只显示被授权且可切换的工具                | P0     | ⬜       |
| 知识库选择        | `/api/v1/knowledge/list`                                  | 多选用户可见知识库                        | P0     | ⬜       |
| 附件选择          | Web File/Paste/Drop → base64/attachment                   | 三端文件选择、相册、拍照和 Multipart 上传 | P0     | ⬜       |
| 附件限制提示      | `/knowledge/supported-file-types`、Chat attachment limits | 选择前提示类型/数量/体积                  | P0     | ⬜       |
| 附件移除/预览     | `ChatComposer` pending attachment                         | 输入区附件横向列表                        | P0     | ⬜       |
| Persona 选择      | `/api/v1/personas`                                        | Chat 上下文 Sheet                         | P1     | ⬜       |
| Notebook 引用     | `/api/v1/notebook`                                        | 选择 Notebook 记录作为上下文              | P1     | ⬜       |
| 历史会话引用      | `/api/v1/sessions`                                        | 选择其他会话作为上下文                    | P2     | ⬜       |
| 题库引用          | `/api/v1/question-notebook`                               | 选择题目作为上下文                        | P1     | ⬜       |
| Memory 引用       | `/api/v1/memory`                                          | 选择 Summary/Profile 等用户记忆           | P2     | ⬜       |
| Book 引用         | `/api/v1/book`                                            | 选择书籍页面作为上下文                    | P2     | ⬜       |
| 已连接 Agent 选择 | `/api/v1/subagents`                                       | 只消费 Web 已配置好的连接                 | P2     | ⬜       |
| Context Budget    | Web `ContextBudgetChip`                                   | 简化为上下文用量/超限提示                 | P2     | ⬜       |
| 拖放文件          | Web Pointer/Drop                                          | 移动端不迁移；由系统文件选择替代          | Mobile | 🚫       |

## 6. Capability 用户流程

| Capability    | Web 用户流程                         | 移动端范围                         | 优先级 | 当前状态 |
| ------------- | ------------------------------------ | ---------------------------------- | ------ | -------- |
| Chat          | 自由对话 + 可选工具                  | 完整迁移                           | P0     | ⬜       |
| Deep Solve    | 多步推理、过程事件、最终答案         | 完整迁移，配置做底部 Sheet         | P0     | ⬜       |
| Deep Research | 主题重述、拆解、研究、报告           | 迁移配置、Outline 确认、进度和报告 | P1     | ⬜       |
| Deep Question | 题型配置、生成、作答、判分、保存题库 | 完整学习闭环                       | P1     | ⬜       |
| Visualize     | SVG、Chart、Mermaid、HTML、Manim     | 迁移配置和 Viewer；生成仍在后端    | P1     | ⬜       |
| Mastery Path  | 硬门控辅导、测验、评分、进度图       | 迁移聊天模式与学习进度             | P1     | ⬜       |
| Math Animator | 后端 Manim 生成                      | 移动端只播放结果，不承载本地渲染   | P2     | ⬜       |

## 7. 消息渲染与消息操作

| 用户能力             | Web 实现                             | 移动端设计                     | 优先级 | 当前状态 |
| -------------------- | ------------------------------------ | ------------------------------ | ------ | -------- |
| 普通文本             | React 消息组件                       | 原生 Text                      | P0     | ⬜       |
| Markdown/GFM         | React Markdown                       | 局部 Rich Renderer             | P0     | ⬜       |
| 数学公式             | KaTeX                                | 局部 WebView/Renderer          | P0     | ⬜       |
| 代码块               | Syntax Highlighter、复制、换行和行号 | Renderer + 原生复制            | P0     | ⬜       |
| Tool Call/Result     | Process/Trace Cards                  | 默认折叠，按需展开             | P1     | ⬜       |
| Thinking/Observation | StreamEvent 卡片                     | 默认折叠，按需展开             | P1     | ⬜       |
| 引用来源             | Sources Event                        | 可点击来源列表                 | P1     | ⬜       |
| 复制回答             | Clipboard                            | 原生 Clipboard                 | P0     | ⬜       |
| 朗读回答             | `/api/v1/voice/tts`                  | 播放、暂停和自动朗读偏好       | P1     | ⬜       |
| 保存到 Notebook      | `SaveToNotebookModal`                | 消息更多菜单                   | P1     | ⬜       |
| 生成图片/视频        | 消息内媒体卡片                       | 图片查看、视频播放、保存和分享 | P1     | ⬜       |
| SVG/Chart/Mermaid    | `VisualizationViewer`                | 全屏 Viewer                    | P1     | ⬜       |
| HTML 交互结果        | 沙箱 iframe                          | 受限 WebView Viewer            | P1     | ⬜       |
| Subagent Transcript  | Session Viewer/Transcript            | 高级详情页                     | P2     | ⬜       |
| Cost/Context Summary | Session Trace                        | 简化为高级详情                 | P2     | ⬜       |

## 8. 文件与产物

| 用户能力           | Web 文件类型               | 移动端决策                         | 优先级 | 当前状态 |
| ------------------ | -------------------------- | ---------------------------------- | ------ | -------- |
| 图片预览           | PNG/JPEG/WebP/GIF          | 原生图片查看器                     | P0     | ⬜       |
| PDF 预览           | Browser PDF Viewer         | 系统 Viewer 或 WebView             | P1     | ⬜       |
| Markdown/Text/Code | Markdown/Text Preview      | Rich Renderer                      | P1     | ⬜       |
| SVG 预览           | `<img>`/Viewer             | 受限 WebView 或 SVG Renderer       | P1     | ⬜       |
| DOCX 预览          | `docx-preview`             | 首版后端文本预览，后续局部 WebView | P2     | ⬜       |
| XLSX 预览          | `exceljs`                  | 首版下载/系统打开，后续表格 Viewer | P2     | ⬜       |
| PPTX 预览          | 后端提取文本               | 文本预览或系统打开                 | P2     | ⬜       |
| 生成产物列表       | Session Activity/Artifacts | 合并到资料库和会话详情             | P1     | ⬜       |
| 下载/保存          | Browser Download           | 系统文件保存                       | P1     | ⬜       |
| 分享               | Web 链接/下载              | 原生 Share Sheet                   | P1     | ⬜       |

## 9. 学习资料与个人内容

| 用户能力                        | Web API/页面                      | 移动端范围                   | 优先级 | 当前状态 |
| ------------------------------- | --------------------------------- | ---------------------------- | ------ | -------- |
| 浏览知识库                      | `/api/v1/knowledge/list`          | 自有和管理员分配知识库       | P0     | ⬜       |
| 查看知识库文件                  | `/knowledge/{name}/files`         | 文件列表、状态和只读标记     | P1     | ⬜       |
| 创建个人知识库                  | `/knowledge/create`               | 仅允许用户空间创建           | P1     | ⬜       |
| 上传知识库文件                  | Knowledge Multipart API           | 文件选择、上传进度和任务状态 | P1     | ⬜       |
| 文件夹/文件管理                 | create-folder/move/delete         | 移动精简版                   | P2     | ⬜       |
| 默认知识库                      | `/knowledge/default/{name}`       | 用户偏好                     | P1     | ⬜       |
| 重试/重新索引自己的 KB          | retry/reindex                     | 只对可写 KB 开放             | P2     | ⬜       |
| RAG Provider/模型配置           | Knowledge Engine Settings         | 不迁移                       | Web    | 🚫       |
| Obsidian/本地目录/LightRAG 连接 | connect/probe API                 | 不迁移                       | Web    | 🚫       |
| Notebook 列表/详情              | `/api/v1/notebook`                | 迁移                         | P1     | ⬜       |
| Notebook 创建/删除              | Notebook CRUD                     | 迁移                         | P1     | ⬜       |
| Notebook 记录管理               | record CRUD                       | 浏览、删除、从消息保存       | P1     | ⬜       |
| 题库浏览                        | `/question-notebook/entries`      | 迁移                         | P1     | ⬜       |
| 书签/分类                       | entries/categories API            | 迁移                         | P1     | ⬜       |
| Quiz 作答和结果                 | quiz judge + session quiz results | 迁移                         | P1     | ⬜       |
| Mastery 进度                    | `/api/v1/learning`                | 列表、地图、下一步           | P1     | ⬜       |
| Mastery 删除/重做               | learning delete/redo              | 二次确认后开放               | P1     | ⬜       |
| Persona 选择                    | `/api/v1/personas`                | 优先迁移                     | P1     | ⬜       |
| Persona 创建/编辑               | Persona CRUD                      | 延后迁移                     | P2     | ⬜       |
| Skills 浏览/启用                | `/api/v1/skills`                  | 用户可见 Skills              | P2     | ⬜       |
| Skills 创建/编辑/标签           | Skills CRUD                       | 高级用户功能                 | P2     | ⬜       |
| Memory 作为聊天上下文           | `/api/v1/memory`                  | 优先于完整工作台             | P2     | ⬜       |
| Memory 工作台/关系图/冲突       | Memory routes                     | 移动精简版                   | P2     | ⬜       |

## 10. 高级创作

| 用户能力           | Web 实现                   | 移动端范围               | 优先级     | 当前状态 |
| ------------------ | -------------------------- | ------------------------ | ---------- | -------- |
| Book Library       | Book 列表、详情、删除      | 迁移浏览和阅读           | P2         | ⬜       |
| Book 创建流程      | Proposal → Spine → Pages   | 移动向导式流程           | P2         | ⬜       |
| Book 阅读/测验     | Page Reader、Quiz Block    | 适合移动端，优先于编辑   | P2         | ⬜       |
| Book 块编辑        | 重生成、移动、删除、换类型 | 平板优先，手机延后       | P2         | ⬜       |
| Book 页面 Chat     | page-chat-session          | 迁移                     | P2         | ⬜       |
| Co-writer 文档列表 | Co-writer CRUD             | 迁移                     | P2         | ⬜       |
| Co-writer 轻编辑   | 标题、Markdown、保存       | 手机单栏编辑             | P2         | ⬜       |
| AI 改写/批注       | edit stream、automark      | 选区操作 Sheet           | P2         | ⬜       |
| 双栏同步和拖动批注 | Web 桌面工作台             | 不在手机实现；可考虑平板 | Web/Tablet | 🚫       |
| 导出 Co-writer     | Markdown 下载              | 原生分享/文件保存        | P2         | ⬜       |

## 11. 用户偏好

| 用户能力          | Web 设置       | 移动端范围             | 优先级 | 当前状态 |
| ----------------- | -------------- | ---------------------- | ------ | -------- |
| 界面语言          | Appearance     | 中文/英文              | P1     | ⬜       |
| 回复语言          | Appearance     | 作为默认发送配置       | P1     | ⬜       |
| 深色/浅色主题     | Appearance     | 跟随系统 + 手动选择    | P1     | ⬜       |
| 代码块主题        | Appearance     | Renderer 偏好          | P2     | ⬜       |
| 行号/长行换行     | Appearance     | Renderer 偏好          | P2     | ⬜       |
| Chat 响应超时     | Chat Settings  | 移动 watchdog 偏好     | P1     | ⬜       |
| 自动朗读          | TTS Settings   | 只迁移用户播放偏好     | P1     | ⬜       |
| TTS Provider 配置 | TTS Settings   | 不迁移                 | Web    | 🚫       |
| 工具启停偏好      | Tools Settings | 合并到 Chat 工具 Sheet | P0     | ⬜       |
| 服务地址切换      | 移动端新增     | “我的”中的服务器管理   | P0     | ⬜       |

## 12. 明确不迁移的后台与管理能力

| 类别            | Web 页面/API                                            | 原因                                                    |
| --------------- | ------------------------------------------------------- | ------------------------------------------------------- |
| 用户与权限      | `/admin/users`、multi-user Grant                        | 管理员职责                                              |
| 部署初始化      | `/register` 首管理员注册                                | 只应在 Web/部署阶段执行                                 |
| 模型服务        | LLM、Models、Embedding、Image、Video、STT、TTS Provider | 包含密钥和部署配置                                      |
| 搜索/解析       | Search、MinerU、Document Parsing                        | 后端服务配置和模型下载                                  |
| 网络与状态      | Network、Status、端口、CORS、诊断                       | 部署运维能力                                            |
| Capability 参数 | `/settings/capabilities`                                | 服务级模型预算和流水线参数                              |
| Memory 服务参数 | `/settings/memory`                                      | 后端整合策略配置；用户 Memory 内容仍迁移                |
| 附件服务参数    | `/settings/attachments`                                 | 上传上限和解析策略由管理员设置，移动端只读取限制        |
| MCP             | `/settings/mcp`、`/space/mcp`                           | 外部服务连接和凭证管理                                  |
| CLI Apps        | `/space/cli-apps`                                       | 第三方代码安装和执行配置                                |
| Agent 配置      | `/settings/agents/*`、Agent Connect/Disconnect          | 本地 CLI 和后端执行环境配置                             |
| Knowledge 引擎  | RAG Provider、PageIndex、GraphRAG、LightRAG 配置        | 索引基础设施配置                                        |
| Partner         | `/partners/*`                                           | 当前 FastAPI 整体使用 `require_admin`；不是普通用户 API |
| Playground      | `/playground`                                           | 调试和开发工作台                                        |

## 13. 阶段验收口径

### P0：日常移动 Chat

必须完成：

- 安全登录、Refresh Token、退出和服务器切换；
- 会话列表、加载、删除和分页；
- Chat/Deep Solve、模型、工具和知识库选择；
- 文本、Markdown、公式和代码块；
- 附件选择、上传、移除和基础预览；
- 停止、重新生成、`ask_user`、弱网重连和错误恢复；
- 复制、分享和基础生成产物访问；
- Android、iOS、HarmonyOS NEXT 三端真机通过同一条链路。

### P1：完整学习闭环

必须完成：

- Deep Research、Quiz、Visualization 和 Mastery Path；
- Notebook、题库、Persona 和知识库文件管理；
- 消息保存到 Notebook、TTS、来源引用和富内容 Viewer；
- 学习进度、测验结果和用户偏好。

### P2：高级工作台

按移动体验取舍：

- Memory、Skills、已连接 Agent 消费；
- Book 阅读/创建和页面 Chat；
- Co-writer 单栏编辑和 AI 改写；
- 分支编辑、Trace、Subagent Transcript 和 Context Budget；
- 手机不适合的密集编辑能力保留 Web 或仅支持平板。

## 14. 审计依据

本矩阵来自以下现有实现，而不是根据产品名称推测：

- Web 路由：`web/app/**/page.tsx`；
- Chat：`web/app/(workspace)/home/[[...sessionId]]/page.tsx`、`web/context/UnifiedChatContext.tsx`；
- Chat UI：`web/components/chat/home/`、`web/components/chat/preview/`；
- 用户 API Clients：`web/lib/session-api.ts`、`knowledge-api.ts`、`learning-api.ts`、`notebook-api.ts`、`personas-api.ts`、`skills-api.ts`、`book-api.ts`、`co-writer-api.ts`；
- 后端权限边界：`deeptutor/api/main.py`；
- 后端路由：`deeptutor/api/routers/`；
- 当前移动实现：`mobile/src/` 和 `mobile/IMPLEMENTATION_STATUS.md`。

每次 Web 新增普通用户能力或移动端完成一项迁移，都应同步更新本矩阵和 `IMPLEMENTATION_STATUS.md`。
