# DeepTutor 移动端架构决策

- 状态：架构已选定，产品实现未完成
- 更新日期：2026-08-31
- 目标平台：Android、iOS、HarmonyOS NEXT
- 客户端策略：全新实现，不迁移旧 Taro 代码

实现状态见 [`IMPLEMENTATION_STATUS.md`](./IMPLEMENTATION_STATUS.md)，执行顺序见 [`MIGRATION_PLAN.md`](./MIGRATION_PLAN.md)，用户能力范围见 [`WEB_TO_MOBILE_FEATURE_MATRIX.md`](./WEB_TO_MOBILE_FEATURE_MATRIX.md)。

## 1. 产品边界

DeepTutor Web 继续承担完整用户功能、管理员控制台、Provider/MCP/网络配置和系统诊断。Mobile 面向学习者的日常聊天、练习、资料消费和个人内容，不复制桌面工作台，也不承载管理员与部署功能。

Mobile 与 Web 共享 FastAPI、ChatOrchestrator、会话数据、权限和 StreamEvent 协议，但不共享页面组件或路由。

## 2. 已选技术栈

```text
React Native + TypeScript
├── React Native Paper：通用 UI 和主题
├── Assistant UI Native：聊天状态与交互原语
├── Reanimated：动效
├── Safe Area Context：系统安全区域
├── Android / iOS：React Native 原生运行时
└── HarmonyOS NEXT：ArkUI 容器 + RNOH
```

当前 PoC 使用 RN 0.72 兼容版本矩阵。正式开发前必须在三端真机验证并决定是否整体升级；原生依赖必须成组升级，不能单独追新。

## 3. 一套代码如何运行三端

业务页面、状态、主题和大多数组件只写一套 React Native 代码。Android/iOS 由 React Native 原生运行，Harmony 由一个薄 ArkUI 容器加载相同 JS Bundle 并通过 RNOH 提供原生组件。

ArkUI 容器负责：

- Ability、生命周期和系统返回；
- RN JS Bundle 加载；
- Harmony 原生模块注册；
- 字体、安全区和系统能力桥接；
- HAP、权限和签名。

当某个能力无法跨端时，使用平台文件隔离：

```text
feature.ts                共享协议/逻辑
feature.native.ts         Android/iOS 实现
feature.harmony.ts        Harmony 实现
```

不为 Harmony 重写整套页面；只有真实兼容性问题才增加 ArkUI 自定义组件。

## 4. 组件与聊天边界

React Native Paper 提供 Button、Input、Surface、List、Dialog、Sheet、Navigation 等视觉组件。页面通过 DeepTutor 的语义组件封装使用 Paper，不在页面中散落厂商 Token。

Assistant UI Native 提供 Thread、Message、Composer、流式状态、停止和重新生成等聊天交互原语。它不拥有 DeepTutor 后端协议，也不决定最终视觉。

```text
DeepTutor HTTP / WebSocket
          ↓
DeepTutor Mobile Adapter
          ↓
Assistant UI Runtime
          ↓
DeepTutor Chat Components + Paper Theme
```

## 5. 代码重写原则

旧 `mobile/` 的 Taro 页面、组件、SCSS、Store、Transport 和测试代码不迁移。新工程按后端契约和产品行为重新实现，避免把不满意的结构带入新架构。

允许参考但不复制的内容：

- 后端 HTTP 和 WebSocket 契约；
- StreamEvent 字段和终止语义；
- Web 用户能力范围；
- 设计 Token 和产品文案；
- 已知边界场景与失败案例。

OpenAPI 类型应从当前后端重新生成，不复制旧生成文件。

## 6. 状态与数据所有权

- TanStack Query 或等价查询层负责服务器拥有的列表和详情；
- 本地 Store 只保留短生命周期 UI、连接和草稿状态；
- Assistant UI Runtime 负责当前聊天交互状态；
- 安全存储只保存身份凭据，不作为业务数据库；
- WebSocket Adapter 负责重连、续传、去重和取消；
- API Client 负责鉴权、超时、取消和稳定错误映射。

页面不能直接访问原生存储、裸 `fetch` 或裸 WebSocket。

## 7. 富内容策略

主界面保持原生。普通文本、基础 Markdown 和代码优先使用 RN 渲染；复杂 KaTeX、Mermaid、SVG、Chart.js、HTML 和办公文档使用有边界的受限 Viewer。

Viewer 必须具备：

- 内容清洗和危险链接限制；
- 明确的加载、错误、重试和全屏状态；
- 语义 Theme 注入；
- 系统返回、安全区和方向变化；
- 纯文本或数据摘要作为无障碍回退。

整个 App 不会变成 WebView。

## 8. 平台能力

| 能力     | Android                 | iOS                      | Harmony                   |
| -------- | ----------------------- | ------------------------ | ------------------------- |
| 安全存储 | Keystore                | Keychain                 | HUKS                      |
| 文件选择 | Android Document Picker | UIDocumentPicker         | ArkUI Picker              |
| 分享     | Android Sharesheet      | UIActivityViewController | Harmony Share Kit         |
| 深链     | Intent/App Links        | Universal Links          | Want/Skills               |
| 安全区   | WindowInsets            | UIKit Safe Area          | ArkUI 避让区/RNOH Adapter |
| 键盘     | Window Insets           | Keyboard Layout Guide    | ArkUI Keyboard Avoidance  |

平台实现隐藏在 Adapter 后，业务代码不直接分支。

## 9. 目标代码结构

```text
mobile/
├── android/                  Android 原生壳
├── ios/                      iOS 原生壳
├── harmony/                  ArkUI / RNOH 原生壳
├── src/
│   ├── app/                  Provider、导航、启动流程
│   ├── screens/              页面组装
│   ├── features/             Auth、Chat、Session、Learning 用例
│   ├── domain/               类型、协议和纯业务规则
│   ├── data/                 HTTP、WebSocket、查询和生成类型
│   ├── state/                本地短生命周期状态
│   ├── platform/             原生能力契约与平台实现
│   ├── components/           DeepTutor 语义组件
│   ├── theme/                Token、Paper Theme、图标和动效
│   └── i18n/                 移动端文案
├── scripts/                  构建、验证和生成脚本
└── artifacts/                本地测试产物，不进入版本库
```

## 10. 功能范围

P0：登录、服务器连接、Chat、会话历史、附件、Markdown/公式/代码、模型/工具/知识库选择、停止/重试/`ask_user` 和弱网恢复。

P1：Deep Solve、Research、Quiz、Visualization、Mastery Path、Knowledge、Notebook、题库、Persona、TTS 和学习进度。

P2：Memory、Skills、Book、Co-writer、已连接 Agent 消费和大屏专项体验。

管理员、Provider/API Key、Embedding、MCP、CLI Apps、网络诊断、部署配置和 Playground 保留在 Web。

## 11. 必须通过的三端 PoC

- 正式后端登录和安全保存 Token；
- 创建会话、流式回答、停止、重连和断线续传；
- Markdown、公式、代码和附件上传；
- 中文输入法、键盘避让、安全区和系统返回；
- 前后台切换、屏幕旋转、长列表和长消息；
- 下载、分享和外部链接；
- Android、iPhone、Harmony 真机完成同一条用户链路。

模拟器启动、JS Bundle 成功或单端 APK 均不能代替三端 PoC。

## 12. 主要风险

- Assistant UI Native 和 RNOH 仍需要真实业务压力与长会话验证；
- Paper、Reanimated、安全区、WebView 和文件能力的 Harmony 兼容性必须逐项验证；
- 当前 Android 测试包使用调试证书，不能作为发布包；
- Harmony 目前只有 JS Bundle 和 ArkUI 容器，尚未生成已签名 HAP；
- Refresh Token、HUKS、附件和富内容 Viewer 仍未实现；
- RN 0.72 是兼容性选择，生产前需要安全和维护周期评审。

## 13. 决策结果

DeepTutor 保持 Web 与 Mobile 两个互补客户端。Mobile 使用 React Native + RNOH 从零实现，三端尽量共享一套 React Native 页面；ArkUI 只承担 Harmony 容器和必要的原生扩展。旧 Taro 代码不进入新工程。
