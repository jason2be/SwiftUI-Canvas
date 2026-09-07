# HTML → SwiftUI 翻译管线：CLI + MCP 规划

> 状态：规划。目标：让任何成熟 HTML 网页项目能被外部 Agent「翻译」为 SwiftUI iOS App，
> 以 SwiftUI-Canvas 的 Doc JSON 为中间表示（IR），人工/Agent 都能在画布上继续编辑。

## 0. 核心洞察：产品已经有了一个完美的 IR

现有管线的每一环都已存在并经过测试（72/72）：

```
Doc JSON ──► validateDoc（容错校验+修复+双语报告）
        ──► tidyScreen / alignParts（行模型整理对齐）
        ──► Preview（393×852 真实预览，逐屏导航）
        ──► buildPrompt（视觉顺序、行分组、导航图、API 基线、主题）
        ──► 外部 AI Agent 生成 SwiftUI 工程
```

所以「翻译」不需要新渲染器——只需要**把 HTML 变成 Doc**，其余全部复用：

```
HTML ──► [新] 提取器 ──► Doc（草稿）──► 现有管线 ──► SwiftUI App
```

## 1. 两个入口，同一套内核

### 1.1 CLI：`swiftui-canvas`（Node ≥ 20，单包零运行时依赖）

```
# 从 URL 或本地目录提取 → 生成 .sc.json（Doc）
swiftui-canvas import https://example.com -o app.sc.json
swiftui-canvas import ./landing-page/ -o app.sc.json

# 校验 + 容错修复（打印双语报告，--json 输出机器可读）
swiftui-canvas check app.sc.json

# 整理（行模型 tidy + 对齐提示），--fix 直接写回
swiftui-canvas tidy app.sc.json

# 生成提示词（整包或单屏），供任何 Agent 消费
swiftui-canvas prompt app.sc.json --lang zh > brief.md
swiftui-canvas prompt app.sc.json --screen home --lang en

# 预览：起一个只读服务器（复用已构建的静态编辑器 + URL hash 载入）
swiftui-canvas preview app.sc.json [--port 4173]

# 导出
swiftui-canvas open app.sc.json      # 生成分享链接（hash 编码）并打印
swiftui-canvas export app.sc.json    # 标准 SwiftUI App 模板骨架（可选，见 §4）
```

实现要点：
- `lib/` 已是同构纯 TS（tokens/project/prompt/tidy/share 均无 DOM 依赖），
  CLI 直接 import 这些模块，**不需要重建逻辑**；`npm run build` 加一个
  `esbuild --bundle cli/index.ts --platform=node --format=esm` 即可。
- `package.json` 增加 `"bin": { "swiftui-canvas": "./dist/cli.js" }`。
- `import` 子命令是唯一的"重"依赖点：解析 HTML 用 `linkedom`（≈零依赖、
  快），截图对比可选 `playwright-core`（peerDependency，缺了就跳过截图）。

### 1.2 MCP 服务器：`swiftui-canvas-mcp`（stdio）

给 Claude Code / Codex / Cursor 等任何 MCP 宿主用。工具面刻意窄：

| 工具 | 输入 | 输出 |
|---|---|---|
| `import_html` | `{ source: url或目录 }` | 草稿 Doc JSON + 修复报告 |
| `check_doc` | `{ doc }` | `{ doc, errors, warnings }`（容错修复后回传） |
| `tidy_doc` | `{ doc, screenId? }` | 整理后的 Doc |
| `build_prompt` | `{ doc, scope?, lang? }` | 提示词文本 |
| `open_preview` | `{ doc }` | 分享链接（#sw= hash），人可点开继续编辑 |

Agent 的典型回合：
1. `import_html` 拿草稿 → 自己读 Doc 思考
2. `tidy_doc` → `check_doc` 修到位
3. `build_prompt` → 用自己的模型产出 SwiftUI 工程
4. `open_preview` → 给用户链接验收

MCP 服务器就是 CLI 的薄壳（同一个 `cli/index.ts` 导出函数化），零新逻辑。

## 2. 提取器：HTML → Doc 草稿（真正的新代码，分两层）

### 2.1 第一层：规则提取（确定性，测试可写）

`lib/extract/`（新目录，同构、无 DOM 依赖，接收已解析的 DOM）：

| 模块 | 职责 |
|---|---|
| `segment.ts` | 页面切分：`<header>` → navBar、`<nav>/<footer>` → tabBar 或底栏、`<main>` → 内容流；`position:fixed` 头/底映射到屏幕栏 |
| `mappers/` | 元素→Part 映射表：button/link→button、input[type=search]→searchField、input[type=password]→secureField、textarea→textEditor、input→textField、select→menu/picker、img→image、table/ul→list、h1-h6→text 变体映射、form 按钮→alert/sheet 候选、video/map→map 占位 |
| `style.ts` | 计算样式→token：颜色（accent 聚类：出现最多的高饱和色）、圆角（>50% 宽 → capsule）、字体（system/rounded/serif/mono 启发式）、间距 → 8pt 栅格吸附 |
| `icons.ts` | 网站图标（SVG path/lucide/FontAwesome class）→ 最近的 SF Symbols 名（用现有 `lib/iconMap.ts` 的 Lucide 表反查；对不上的记入报告，不猜） |
| `layout.ts` | 视口按 393pt 逻辑宽归一化；导航结构 → screens（多页站点：每页一屏；SPA：按路由/锚点切屏） |
| `report.ts` | 每个决策都是一条记录：`{ element, decision, confidence, reason }`——机器可读，Agent 可据此迭代 |

确定性规则 + **置信度标注**是关键设计：低置信度决策进入报告而非硬编码。

### 2.2 第二层：Agent 提升轮（可选，CLI 编排）

```
swiftui-canvas import page.html --refine
```

CLI 不内置 LLM 调用。`--refine` 输出一份「提升任务书」：
- 输入：草稿 Doc + 报告（低置信度决策清单）
- 要求：只返回修订后的 Doc JSON（schema 即 `lib/tokens.ts`，`validateDoc` 把关）
- Agent（Claude Code/MCP 宿主）用自己的模型跑这一步，或直接在 MCP 模式下
  由宿主 Agent 自然完成：`import_html` → 读报告 → 修改 JSON → `check_doc`。

这保持内核零 AI 依赖：**规则打底、Agent 提升**，任何宿主都能接。

## 3. 数据契约（对 Agent 承诺的稳定性）

- **Doc schema**：`lib/tokens.ts` 即规范；`validateDoc` 容错接受 + 修复 + 报告
  （已实现，72 测试覆盖），`isProject` 严格门（含 presents 同屏不变量）。
- **版本化**：Doc 加可选 `version?: number`（默认 1）；CLI/MCP 声明
  `--schema-version`。破坏性变更时 validateDoc 报告并迁移。
- **图标**：HTML 侧图标映射为 SF Symbols 名写入 Doc（渲染时经 lib/iconMap
  转 Lucide 外观，与现有约定一致）。
- **多页 → 多屏**：`<a href>` 相对链接在站内 → `link.target`；跨站/外链 →
  截断为文本；表单提交按钮 → `presents` alert/sheet 候选（低置信度）。

## 4. 不做什么（刻意的边界）

- **不内置 AI**：CLI/MCP 是确定性工具；「翻译」的智能部分由宿主 Agent 完成
  （它本来就擅长）。内核保持可测试、零 API key。
- **不追求像素级**：产出的是「可整理的草稿」，不是截图克隆。像素级复刻
  违背产品「整理 + 提示词」的方法论。
- **不做 SwiftUI 编译器**：`export` 子命令只输出工程骨架（可选、后置）；
  代码生成由 Agent 按 buildPrompt 产出，质量更高且随模型升级免费提升。
- **第一版不做 JS 执行**：静态解析 HTML+CSS；SPA 运行时渲染的内容
  （playwright 截图 → 视觉提取）列为后续版本。

## 5. 里程碑

| 阶段 | 内容 | 验收 |
|---|---|---|
| M1 | CLI 骨架：check/tidy/prompt/preview/open（纯复用现有 lib） | 5 个子命令 + 测试；`npx swiftui-canvas check` 可用 |
| M2 | 规则提取器 v1：segment + 常用 10 个 mapper + style/icons | 对 3 个真实落地页出草稿，Preview 可看 |
| M3 | MCP 服务器 + `import_html` 等 5 工具 | Claude Code 实测端到端：URL → SwiftUI 工程 |
| M4 | 提升轮报告格式打磨 + 多页站点切屏 | 5+ 页站点导航图正确 |

M1 约是现有 lib 的薄壳（1-2 天量级）；M2 是真正的新代码（提取器核心）；
M3 是薄壳；M4 打磨。顺序保证每一步都可发布、可单独使用。

## 6. 仓库布局

```
cli/
  index.ts          # 子命令分发 + 函数化导出（MCP 复用）
  serve.ts          # preview 只读服务器
mcp/
  server.ts         # stdio MCP，薄壳调 cli 函数
lib/extract/
  segment.ts  mappers/  style.ts  icons.ts  layout.ts  report.ts
docs/translator.md  # 本文件；agent.md 增补一节指向它
```

## 7. 风险与对策

| 风险 | 对策 |
|---|---|
| 真实网页脏乱（内联样式、CSS-in-JS、框架水合） | validateDoc 容错哲学一以贯之：修+报，永不静默丢弃 |
| SF 映射不上 | 报告里列出未映射图标，Agent 用自己的知识补 |
| SPA 内容在 JS 里 | v1 明确不支持并在报告说明；v2 用截图+视觉提取 |
| Doc schema 演进破坏 Agent 集成 | version 字段 + validateDoc 迁移路径 + agent.md 变更日志节 |
