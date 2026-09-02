# DeepTutor Web → React Native Mobile 执行计划

- 重置日期：2026-08-31
- 当前阶段：Phase 0 — 文档与架构重新基线
- 执行状态：全部未完成
- 代码策略：不迁移旧 Taro 代码，按 Web 行为与后端协议重新实现

本计划中的“迁移”指迁移用户能力和协议语义，不复制旧 Taro 页面、组件、样式、Store 或测试实现。旧工程只可作为需求参考，不能作为新实现的代码来源。

## Runtime P0 基础状态

- [x] App Provider、安全区、系统栏、键盘事件和 AppState；
- [x] HTTP Client、Query 生命周期、超时、取消、鉴权和错误模型；
- [x] 版本化普通配置存储与损坏数据清理；
- [x] Android Keystore / iOS Keychain 凭据 Repository；
- [x] 网络状态、离线判断和 Query OnlineManager；
- [x] 启动状态机、根 Stack、Deep Link 和系统返回；
- [x] 日志脱敏、全局 Error Boundary 和稳定错误页；
- [x] WebSocket 心跳、重连、续传、取消和前后台控制；
- [x] Android/Harmony JS Bundle 与 Android Release 编译；
- [ ] Harmony HUKS TurboModule 与真机安全存储验证；
- [ ] Android/iOS/Harmony 的键盘、返回、Deep Link、离线恢复和安全存储真机验收。

## Phase 0 — 工程收敛与交付基线

- [ ] 确认 RN/RNOH 版本矩阵和升级策略；
- [ ] 确认正式应用名称、Android/iOS/Harmony 标识；
- [ ] 将 RN 工程收敛为唯一正式 `mobile/`；
- [ ] 配置正式目录、环境变量、日志、错误边界和 Feature Flag；
- [ ] 建立 Android、iOS、Harmony 的开发与测试构建命令；
- [ ] 建立 CI 和构建产物真实性检查；
- [ ] 三端真机完成最小启动、系统返回、安全区和键盘验证。

验收：三个平台的空壳使用同一版本号和环境配置启动；构建失败不会被脚本误报为成功。

## Phase 1 — 设计系统、组件库与导航

- [ ] 将 `DESIGN.md` Token 实现为 TypeScript Theme；
- [ ] 完成 Paper Light/Dark Theme 与动态字体策略；
- [ ] 建立 Button、Input、Surface、List、Notice、Dialog、Sheet 等基础组件；
- [ ] 完成 SafeAreaScreen、KeyboardAvoidance 和状态栏策略；
- [ ] 完成 Chat、Learn、Library、Profile 一级导航；
- [ ] 完成边缘停靠浮动菜单及无障碍状态；
- [ ] 建立加载、空、错误、离线和权限拒绝模式。

验收：320/375/414/768 宽度、200% 字体、横竖屏和键盘展开均无关键内容遮挡。

## Phase 2 — 服务器、认证与身份生命周期

- [ ] 运行时服务器地址配置和校验；
- [ ] HTTP Transport、错误映射和请求取消；
- [x] 移动登录、Auth-disabled 自动进入和安全错误映射；
- [ ] 首用户注册；
- [ ] Bootstrap 聚合数据加载；
- [ ] Android Keystore、iOS Keychain、Harmony HUKS；
- [ ] 启动恢复、Token 过期、退出和切换服务器；
- [ ] Refresh Token 轮换、撤销和重放检测。

验收：三端使用同一账号完成登录、杀进程恢复、过期清理和退出，敏感 Token 不进入普通持久化存储。

## Phase 3 — P0 Chat 真实闭环

- [ ] 定义 DeepTutor Adapter 与 Assistant UI Runtime 边界；
- [ ] 接入 `/api/v1/ws` 鉴权和 StreamEvent；
- [ ] 实现心跳、假活检测、重连、续传、取消和超时；
- [ ] 实现消息聚合、去重、错误分类和终止语义；
- [ ] 完成 Chat 空状态、消息流和 Composer；
- [ ] 完成会话列表、分页、加载、重命名和删除；
- [ ] 完成 Capability、模型、工具和知识库选择；
- [ ] 完成停止、重新生成、`ask_user` 和弱网恢复。

验收：真实后端完成“登录 → 新建对话 → 流式回复 → 停止/恢复 → 历史续聊”，不依赖 Mock Adapter。

## Phase 4 — 富内容、附件与生成产物

- [ ] Markdown/GFM、公式、代码块和表格；
- [ ] 代码复制、换行、语言标签和长行处理；
- [ ] Mermaid、SVG、Chart 和 HTML 受限 Viewer；
- [ ] 文件/相册选择、Multipart 上传、进度和重试；
- [ ] 图片/PDF/文本预览、下载和系统分享；
- [ ] Tool Call、来源、Thinking 和生成产物摘要。

验收：三端上传 PDF/图片并查看含公式、代码、来源和生成产物的真实回答。

## Phase 5 — P1 学习闭环

- [ ] Deep Solve、Deep Research、Quiz、Visualization；
- [ ] Mastery Path 和学习进度；
- [ ] Knowledge 文件管理；
- [ ] Notebook、题库和 Persona；
- [ ] 保存回答、TTS、来源引用和用户偏好。

验收：用户能从资料提问、练习、判分、保存并继续下一学习步骤。

## Phase 6 — P2 与发布准备

- [ ] Memory、Skills 和已连接 Agent 消费；
- [ ] Book 阅读/创建和页面 Chat；
- [ ] Co-writer 移动单栏编辑和导出；
- [ ] 平板、折叠屏、长列表和长内容性能；
- [ ] 崩溃、日志、隐私、权限、签名和商店材料；
- [ ] Android、iOS、Harmony 发布候选真机回归。

验收：发布候选使用正式签名，三端功能矩阵、隐私权限和已知限制全部有记录。

## 每阶段固定验证

- TypeScript、Lint 和单元测试；
- Android/iOS/Harmony 对应构建；
- 真实产物存在性和签名检查；
- 320/375/414/768 宽度与动态字体；
- 中文输入法、键盘、安全区、横竖屏和系统返回；
- 弱网、断网、后台恢复、长消息和长列表；
- 对应后端契约测试与无敏感信息错误检查。
