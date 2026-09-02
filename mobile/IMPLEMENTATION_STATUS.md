# DeepTutor Mobile 实现状态

- 重置日期：2026-08-31
- 当前阶段：RN/RNOH 新工程基础验证，产品功能尚未开始
- 产品功能完成度：0%
- 状态标记：🟡 代码已落地/待真机 · ⬜ 未完成 · 🚫 明确不做

## 状态重置说明

旧 `mobile/` 中基于 Taro 的完成状态不继承到本工程。旧代码不会迁移，旧测试结果也不能证明新的 React Native/RNOH 实现已经完成。本文从零记录新工程的真实执行状态。

已经存在的 RN、Paper、Assistant UI、RNOH、Android APK 和 Harmony JS Bundle 只视为技术基础验证，不折算为登录、聊天、会话或学习功能完成。

## 已验证的工程事实

以下内容是当前脚手架事实，不是产品验收状态：

- React Native 0.72 兼容工程能够完成类型检查、Lint 和基础单元测试；
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
- 登录页、AuthClient、移动 Bearer 登录、Auth-disabled 自动进入和安全错误映射已落地；
- Harmony 原生 HAP、iOS App 和三端真机链路均未验证；
- 当前聊天页使用模拟 Adapter，不代表 DeepTutor 后端已经接通。

## 1. 工程与发布

| 状态 | 项目               | 验收要求                                                      |
| ---- | ------------------ | ------------------------------------------------------------- |
| ⬜   | 正式移动端目录收敛 | RN 工程成为唯一 `mobile/`，旧 Taro 工程归档后再删除           |
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
| 🟡   | 登录          | `/api/v1/auth/mobile/login`、表单、错误映射和会话接入已完成；真机待验收 |
| ⬜   | 首用户注册    | 注册状态检查、注册、自动登录和关闭状态                                  |
| ⬜   | Bootstrap     | 用户、模型、工具、能力、知识库和版本信息加载                            |
| 🟡   | 安全存储      | Android Keystore/iOS Keychain 已接入；Harmony HUKS 未完成               |
| 🟡   | 登录态恢复    | 启动恢复、过期/服务器不匹配清理和 Bootstrap 门控已完成；真机待验收      |
| ⬜   | Refresh Token | 轮换、撤销和重放检测                                                    |

## 4. Chat 与会话

| 状态 | 项目              | 验收要求                                                                      |
| ---- | ----------------- | ----------------------------------------------------------------------------- |
| ⬜   | DeepTutor Adapter | Assistant UI 与 DeepTutor HTTP/WS 协议完成适配                                |
| 🟡   | WebSocket         | Runtime 已实现鉴权、心跳、重连、`resume_from`、生命周期和取消；真实后端待验收 |
| ⬜   | 消息状态          | StreamEvent 聚合、去重、终止语义和错误保留                                    |
| ⬜   | Chat 页面         | 空状态、消息流、Composer、发送、停止和重试                                    |
| ⬜   | 会话管理          | 列表、分页、搜索、加载、重命名和删除                                          |
| ⬜   | 上下文选择        | Capability、模型、工具和知识库                                                |
| ⬜   | `ask_user`        | 单选、多选、自由文本、恢复和提交                                              |
| ⬜   | 重新生成          | regenerate、忙碌状态和失败回滚                                                |
| ⬜   | 弱网恢复          | 断网、切后台、服务重启后恢复活跃回合                                          |

## 5. 富内容与附件

| 状态 | 项目                   | 验收要求                                |
| ---- | ---------------------- | --------------------------------------- |
| ⬜   | Markdown               | 标题、列表、引用、表格和安全链接        |
| ⬜   | 数学公式               | 行内/块级公式和长公式滚动               |
| ⬜   | 代码块                 | 高亮、复制、换行、语言标签和长行处理    |
| ⬜   | Mermaid/SVG/Chart/HTML | 受限 Viewer、全屏、错误和无障碍摘要     |
| ⬜   | 附件                   | 文件/相册选择、上传进度、移除和失败重试 |
| ⬜   | 文件操作               | 预览、下载、系统打开和分享              |

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

1. 只有新 RN/RNOH 代码已经落地并通过对应自动化检查，才能从 ⬜ 改为完成；
2. 三端能力必须分别记录，Android APK 不能代替 iOS/Harmony 验收；
3. 模拟 Adapter、Mock 页面和静态占位不计为功能完成；
4. 每次状态变化必须同步更新 `MIGRATION_PLAN.md` 和 `WEB_TO_MOBILE_FEATURE_MATRIX.md`；
5. 旧 Taro 工程的代码、截图和测试不得作为新工程完成证据。
