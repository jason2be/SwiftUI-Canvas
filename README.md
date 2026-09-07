<p align="center">
  <img src="app/icon.svg" width="72" alt="" />
</p>

<h1 align="center">SwiftUI Canvas</h1>

<p align="center">
  <strong>Sketch SwiftUI screens in the browser, link them, tap through them, and copy a prompt for your AI coding tool.</strong><br />
  <a href="https://jason2be.github.io/SwiftUI-Canvas/"><strong>Open the app →</strong></a>
</p>

<p align="center">
  <a href="#中文">中文</a>
</p>

<p align="center">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs" />
  <img alt="React" src="https://img.shields.io/badge/React-19-20232a?logo=react&logoColor=61DAFB" />
  <img alt="SwiftUI" src="https://img.shields.io/badge/SwiftUI-iOS%2026+-007AFF?logo=swift&logoColor=white" />
  <a href="LICENSE"><img alt="MIT License" src="https://img.shields.io/badge/license-MIT-blue.svg" /></a>
  <img alt="No backend" src="https://img.shields.io/badge/backend-none%20(localStorage)-2E6A45" />
</p>

A sister project of [m3e-canvas](https://github.com/lnkiai/m3e-canvas) (Material 3 Expressive): same idea, different platform. Everything here is drawn and written for **SwiftUI on iOS**.

Works with any AI coding tool that takes a prompt — Claude Code, Codex, Gemini CLI, Cursor: copy the prompt, paste it into the tool, and ask for the app.

## What it does

- **Drag-and-drop parts** – buttons, icon buttons, toggles, sliders, segmented and menu pickers, text fields, search bars, navigation bars, tab bars, lists, cards, alerts, sheets, progress views, gauges, text, images, dividers and containers, all drawn as their iOS counterparts.
- **iPhone screens** – add as many screens as you like (393×852 pt), name them, drag a screen to move everything on it.
- **Tap to navigate** – give any tappable part or tab bar item a target screen (or "back") and a transition: push, the iOS 26 zoom transition, sheet, full-screen cover or none. Arrows show the flow on the canvas; the preview lets you tap through it.
- **Theme** – accent color (iOS system palette presets or any hex), light / dark appearance, default or capsule shapes, and the system font designs: rounded, serif, monospaced.
- **Prompt output** – the whole design (or a single screen) becomes a concise brief in English or Chinese, including your per-part behavior notes. The brief pins the toolchain to a **modern SwiftUI baseline**: NavigationStack, TabView + Tab, @Observable, `foregroundStyle`, Liquid Glass (`glassEffect`, `buttonStyle(.glass)`), scroll edge effects, the zoom navigation transition — and mentions what the iOS 27 beta adds without depending on it. Screen names and labels travel verbatim, SF Symbol names are used as given.
- **Tidy** – one button snaps bars to the edges and stacks the rest on 16pt margins.
- **Align** – one part lines up with the screen's body (inside the margins, clear of the bars); several parts line up with each other, or space out evenly between the two outer ones. Every action has an undo and steps aside instead of landing on another part.
- **Share links and agent drafts (beta)** – copy a link that opens your design on anyone's canvas; or point a coding agent at [public/agent.md](public/agent.md) and it sketches what you described, then replies with such a link.
- **Layers** – a layers panel lists the z-order of the active screen with reorder buttons.
- Undo/redo, keyboard shortcuts, duplicate, nudge, save/open JSON, share links, and everything autosaves to your browser (localStorage). No backend, no account.
- **English & Chinese UI** – the interface and the generated prompt each switch between English (matching Apple's documentation wording) and Chinese.

## Keyboard

| Key | Action |
| --- | --- |
| `V` / `H` | Select / hand tool (hold `Space` to pan) |
| Wheel, `Ctrl` + wheel | Pan, zoom |
| `0` | Fit |
| `Ctrl+Z` / `Ctrl+Shift+Z` | Undo / redo |
| `Ctrl+D` | Duplicate |
| Arrows (`Shift` = 10) | Nudge |
| `Delete` | Delete part |
| `P` | Preview |

## On API currency

The prompt template keeps generated apps on a modern SwiftUI baseline and is checked against the Swift interface files of the iOS 27 SDK (`SwiftUI` / `SwiftUICore` swiftinterface), not against memory: Liquid Glass lives in SwiftUICore, the zoom transition and scroll edge effects are iOS 26, and `AnyNavigationTransition` / `ToolbarItemVisibilityPriority` are the iOS 27 beta additions the prompt mentions as optional. For full documentation see [developer.apple.com/documentation/swiftui](https://developer.apple.com/documentation/swiftui).

## Develop

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # static export to ./out
npm test
```

The app is a static Next.js export with no backend. To host it under a sub-path (for example a GitHub Pages project site), set `NEXT_PUBLIC_BASE_PATH=/your-repo` at build time.

## CLI

```bash
npm run build:cli
node dist/cli.js --help
```

The same document the editor saves works from the terminal — check, tidy, prompt, preview, open:

```bash
node dist/cli.js check  design.sc.json --lang zh   # strict pass or repair report
node dist/cli.js tidy   design.sc.json --fix       # row-model tidy, written back
node dist/cli.js prompt design.sc.json --lang zh > brief.md
node dist/cli.js open   design.sc.json             # share link to keep editing
node dist/cli.js preview design.sc.json --port 4173
```

Agents can consume the JSON or the brief directly. The planned HTML→SwiftUI translator (CLI `import` + MCP server) is specified in [docs/translator.md](docs/translator.md).

## Sketches from an AI agent

Read [public/agent.md](public/agent.md): it specifies the JSON document format and how to turn one into a share link, so an agent can sketch a design and hand back the link.

## Credits

- Sister project and source of the idea: [m3e-canvas](https://github.com/lnkiai/m3e-canvas) by lnkiai (MIT) — sketch Material 3 Expressive screens for the Android/web side.
- Canvas icons are [Lucide](https://lucide.dev) lookalikes (ISC); prompts and generated apps always use Apple's [SF Symbols](https://developer.apple.com/sf-symbols/) names, which cannot be embedded in a web project by license.
- Icons in prompts are [SF Symbols](https://developer.apple.com/sf-symbols/) names owned by Apple Inc.

## License

MIT © SwiftUI Canvas contributors

---

## 中文

**在浏览器中拼装 SwiftUI 界面，把屏幕连起来、点一点试试，然后直接变成给 AI 编程工具的提示词。**

**在线使用 →** <https://jason2be.github.io/SwiftUI-Canvas/>

m3e-canvas（Material 3 Expressive）的姐妹项目：同一个想法，换到 iOS 这一边——这里的组件与提示词全部面向 **SwiftUI**。

可配合任何接受提示词的 AI 编程工具使用，例如 Claude Code、Codex、Gemini CLI 或 Cursor：复制提示词，粘贴到工具里，让它把应用做出来。

### 功能

- **拖放组件** – 按钮、图标按钮、开关、滑块、分段/菜单选择器、文本输入、搜索框、导航栏、标签栏、列表、卡片、提醒、半屏页、进度、仪表盘、文本、图片、分割线和容器，全部按 iOS 的样子绘制。
- **iPhone 屏幕** – 想加多少个屏幕都可以（393×852 pt），为它们命名，拖动屏幕即可整体移动。
- **点击跳转** – 给任意可点击组件或标签栏项目设置目标屏幕（或「返回」）和过渡：推入、iOS 26 缩放过渡、半屏、全屏覆盖或无动画。画布上会显示流程箭头，预览中可以真的点击跳转。
- **主题** – 强调色（iOS 系统色预设或任意十六进制色）、浅色／深色外观、默认或胶囊形状、系统字体设计（圆体、衬线、等宽）。
- **提示词输出** – 整个设计（或单个屏幕）会变成简洁的英文或中文提示词，并包含你为每个组件写的行为说明。提示词把技术基线锁定在**现代 SwiftUI**：NavigationStack、TabView + Tab、@Observable、`foregroundStyle`、Liquid Glass（`glassEffect`、`buttonStyle(.glass)`）、滚动边缘效果、缩放过渡——并提到 iOS 27 beta 的新增项但不作为依赖。屏幕名与文案按原文传递，SF Symbol 名称原样使用。
- **整理** – 一键把栏贴到边缘，其余组件按 16pt 边距重新堆叠。
- **对齐** – 单个组件与屏幕正文区对齐（边距以内、栏以外）；多个组件互相左中右／顶中底对齐，或在两端之间等距分布。每一步都可撤销，且不会压到其他组件上。
- **分享链接与代理草图（测试版）** – 复制一个能在他人画布上打开你设计的链接；也可以让编程代理阅读 [public/agent.md](public/agent.md)，它会画出你描述的草图并以链接回复。
- **图层** – 图层面板显示当前屏幕的层叠顺序，可一键上移／下移。
- 撤销／重做、键盘快捷键、复制、微调、保存／打开 JSON、分享链接，所有内容自动保存在浏览器（localStorage）中。无后端，无账号。
- **中英双语** – 界面与生成的提示词都可在英文（对齐 Apple 文档用语）和中文之间切换。

### 键盘

| 按键 | 动作 |
| --- | --- |
| `V` / `H` | 选择 / 抓手工具（按住空格平移） |
| 滚轮、`Ctrl` + 滚轮 | 平移、缩放 |
| `0` | 适配视图 |
| `Ctrl+Z` / `Ctrl+Shift+Z` | 撤销 / 重做 |
| `Ctrl+D` | 复制 |
| 方向键（`Shift` = 10） | 微调 |
| `Delete` | 删除组件 |
| `P` | 预览 |

### API 时效性说明

提示词模板把生成的应用锁定在现代 SwiftUI 基线上，并对照 iOS 27 SDK 的 Swift 接口文件（`SwiftUI` / `SwiftUICore` 的 swiftinterface）核实过，而不是凭记忆：Liquid Glass 位于 SwiftUICore；缩放过渡与滚动边缘效果是 iOS 26 引入；`AnyNavigationTransition` 与 `ToolbarItemVisibilityPriority` 是 iOS 27 beta 的新增项，提示词只以「可选」的方式提及。完整文档见 [developer.apple.com/documentation/swiftui](https://developer.apple.com/documentation/swiftui)。

### 开发

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # 静态导出到 ./out
npm test
```

项目以无后端的 Next.js 静态站点方式导出。若要部署在子路径下（例如 GitHub Pages 的项目站点），请在构建时设置 `NEXT_PUBLIC_BASE_PATH=/仓库名`。

### 来自 AI 代理的草图

参见 [public/agent.md](public/agent.md)：其中规定了 JSON 文档格式以及把它变成分享链接的方法，代理可以据此画出设计并回传链接。

### 致谢

- 姐妹项目与创意来源：[m3e-canvas](https://github.com/lnkiai/m3e-canvas)（MIT）——Android/Web 那一侧的 Material 3 Expressive 画板。
- 画布图标使用 [Lucide](https://lucide.dev) 的形近替代（ISC 许可）；提示词与生成的应用始终使用 Apple 的 [SF Symbols](https://developer.apple.com/sf-symbols/) 名称——按 Apple 许可，SF Symbols 字形本身不能嵌入网页项目。

### 许可证

MIT © SwiftUI Canvas contributors
