import { getT, KIND_TEXT, TRANSITION_TEXT, VARIANT_TEXT, type Lang } from "./i18n";
import {
  BACK_TARGET,
  SCREEN_H,
  SCREEN_W,
  type Doc,
  type Kind,
  type Option,
  type Part,
  type Screen,
  partSize,
  partsOf,
  screenName,
  variantOf,
} from "./tokens";
import { accentHex } from "./theme";

/* A prompt is the whole design (or one screen) as a concise brief an AI coding
 * tool can build directly. Language is en or zh; API wording is the modern
 * SwiftUI set (iOS 26 baseline) in both languages. */

const hasText = (s?: string | null) => !!s && s.trim().length > 0;

const q = (lang: Lang, s: string) => (lang === "zh" ? `“${s.trim()}”` : `"${s.trim()}"`);

function label(lang: Lang, s?: string | null): string {
  return hasText(s) ? q(lang, s!) : lang === "zh" ? "无文字" : "no text";
}

const kindNoun = (lang: Lang, k: Kind) => KIND_TEXT[lang][k] ?? k;
const variantText = (lang: Lang, v: string) => VARIANT_TEXT[lang][v as never] ?? v;

/* ---------- API baseline ---------- */

function apiBaseline(lang: Lang): string {
  if (lang === "zh") {
    return [
      "## 技术基线",
      "用 SwiftUI 实现，deployment target iOS 26.0，Swift 6.2 / 最新 SDK；只允许现代 API：",
      "- 导航用 NavigationStack 与 TabView + Tab（不要用已废弃的 NavigationView）；搜索用 .searchable。",
      "- 屏幕顶部留出系统状态栏（时间、信号、电池，约 59pt），底部留出主屏指示条（约 34pt）；不需要自己实现它们，留出安全区即可。",
      "- 工具栏与栏内按钮在 iOS 26 会自动呈现 Liquid Glass；自定义玻璃控件用 .glassEffect()、GlassEffectContainer、buttonStyle(.glass) 或 .glassProminent。",
      "- 顶部滚动边缘用 .scrollEdgeEffectStyle，内容延伸到栏下用 .backgroundExtensionEffect。",
      "- 模型用 @Observable；并发用 Swift 6；颜色修饰用 foregroundStyle（不要 foregroundColor）。",
      "- 缩放过渡用 .navigationTransition(.zoom(sourceID:in:))（iOS 26）。",
      "- iOS 27 beta 新增 AnyNavigationTransition 与 ToolbarItemVisibilityPriority，可以自愿采用，不要作为依赖。",
      "- 图标一律用 SF Symbols，名称按提示词原文放进 Image(systemName:)。",
      "- 文案使用提示词给出的原文（含中英文），不要自行翻译；为图标按钮补 VoiceOver 标签。",
    ].join("\n");
  }
  return [
    "## API baseline",
    "Build it in SwiftUI with a deployment target of iOS 26.0, Swift 6.2 on the latest SDK. Modern APIs only:",
    "- Navigate with NavigationStack and TabView + Tab (never the deprecated NavigationView); search with .searchable.",
    "- Leave room for the system status bar (time, signal, battery, ~59pt) at the top and the home indicator (~34pt) at the bottom; do not build them yourself, just respect the safe areas.",
    "- Toolbar and bar buttons render as Liquid Glass automatically on iOS 26; for custom glass controls use .glassEffect(), GlassEffectContainer, buttonStyle(.glass) or (.glassProminent).",
    "- Use .scrollEdgeEffectStyle for scroll edge effects and .backgroundExtensionEffect to extend content under bars.",
    "- Model state with @Observable; use Swift 6 concurrency; color views with foregroundStyle (not foregroundColor).",
    "- Zoom transitions use .navigationTransition(.zoom(sourceID:in:)) (iOS 26).",
    "- The iOS 27 beta adds AnyNavigationTransition and ToolbarItemVisibilityPriority; optional to adopt, never required.",
    "- All icons are SF Symbols: put the given names verbatim into Image(systemName:).",
    "- Use the exact strings given in this prompt for all labels (do not translate them); give icon-only controls accessibility labels.",
  ].join("\n");
}

/* ---------- theme ---------- */

function themeText(doc: Doc): string {
  const t = doc.theme;
  const hex = accentHex(t);
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const design = { system: "", rounded: ".rounded", serif: ".serif", monospaced: ".monospaced" }[t.font];
  const shape = t.shape === "capsule" ? (doc.lang === "zh" ? "胶囊形（.buttonStyle 用 capsule 或 .clipShape(Capsule())）" : "capsule shapes (.clipShape(Capsule()) where fitting)") : "";
  if (doc.lang === "zh") {
    return [
      "## 主题",
      `- 强调色：Color(red: ${(r / 255).toFixed(3)}, green: ${(g / 255).toFixed(3)}, blue: ${(b / 255).toFixed(3)})，全应用 .tint 使用它。`,
      `- 外观：${t.scheme === "dark" ? "深色（.preferredColorScheme(.dark)）" : "浅色（.preferredColorScheme(.light)）"}。`,
      design ? `- 字体设计：.fontDesign(${design})。` : "- 字体：系统默认。",
      shape ? `- 形状：${shape}` : "- 形状：默认圆角。",
    ]
      .filter(Boolean)
      .join("\n");
  }
  return [
    "## Theme",
    `- Accent: Color(red: ${(r / 255).toFixed(3)}, green: ${(g / 255).toFixed(3)}, blue: ${(b / 255).toFixed(3)}); apply it with .tint on the root.`,
    `- Appearance: ${t.scheme === "dark" ? "dark (.preferredColorScheme(.dark))" : "light (.preferredColorScheme(.light))"}.`,
    design ? `- Font design: .fontDesign(${design}).` : "- Font: system default.",
    shape ? `- Shape: ${shape}.` : "- Shape: default rounded corners.",
  ]
    .filter(Boolean)
    .join("\n");
}

/* ---------- options ---------- */

function optionsText(lang: Lang, options: Option[], withTargets: boolean, doc: Doc): string {
  return options
    .map((o) => {
      const t = withTargets && o.target ? (lang === "zh" ? `，跳转到 ${screenName(doc, o.target, "?")}` : ` opens ${screenName(doc, o.target, "?")}`) : "";
      return `${q(lang, o.label || (lang === "zh" ? "无标签" : "no label"))}${o.icon ? ` (${o.icon})` : ""}${t}`;
    })
    .join(lang === "zh" ? "、" : ", ");
}

/* ---------- single parts ---------- */

function partText(lang: Lang, it: Part, doc: Doc): string {
  return lang === "zh" ? partZh(it, doc) : partEn(it, doc);
}

function partZh(part0: Part, doc: Doc): string {
  const it = { ...part0, variant: variantOf(part0) };
  const v = variantText("zh", it.variant);
  switch (it.kind) {
    case "button":
      return `${label("zh", it.label)} 的${it.variant === "glass" || it.variant === "glassProminent" ? "玻璃样式" : v}按钮${it.icon ? `（SF Symbol ${it.icon}）` : ""}`;
    case "iconButton":
      return `${it.icon ?? "plus"} 图标的图标按钮（${v}，44pt）`;
    case "toggle":
      return `${label("zh", it.label)} 的开关 Toggle（初始为${it.checked ? "开" : "关"}）`;
    case "slider":
      return `滑块 Slider（初始值 ${it.value ?? 40}%）`;
    case "segmented":
      return `分段选择器 Picker(.segmented)：${optionsText("zh", it.options ?? [], false, doc)}${selText("zh", it.selected ?? 0)}`;
    case "picker":
      return `菜单选择器 Picker(.menu)：标签 ${label("zh", it.label)}，选项 ${optionsText("zh", it.options ?? [], false, doc)}${selText("zh", it.selected ?? 0)}`;
    case "textField":
      return `文本输入 TextField：标签 ${label("zh", it.label)}，占位 ${label("zh", it.supporting)}${it.icon ? `，前导图标 ${it.icon}` : ""}`;
    case "searchField":
      return `搜索框（.searchable）：占位 ${label("zh", it.label)}`;
    case "navBar":
      return `导航栏（${it.variant === "large" ? "大标题" : "居中标题"}）：标题 ${label("zh", it.label)}${it.icon ? `，左侧按钮 ${it.icon}` : ""}${it.icon2 ? `，右侧按钮 ${it.icon2}` : ""}`;
    case "tabBar":
      return `标签栏 TabView：${optionsText("zh", it.options ?? [], true, doc)}${selText("zh", it.selected ?? 0)}`;
    case "list":
      return `${it.variant === "insetGrouped" ? "内嵌分组列表 List" : "普通列表 List"}：${optionsText("zh", it.options ?? [], true, doc)}${(it.options ?? []).some((o) => o.target) ? "；点击行进入对应屏幕" : "；每行尾部有 chevron.right"}`;
    case "card":
      return `${v}卡片：标题 ${label("zh", it.label)}${hasText(it.supporting) ? `，正文 ${label("zh", it.supporting)}` : ""}${it.icon ? `，左上角图标 ${it.icon}` : ""}`;
    case "alert":
      return `提醒弹窗 .alert：标题 ${label("zh", it.label)}，信息 ${label("zh", it.supporting)}，按钮 ${optionsText("zh", it.options ?? [], false, doc)}`;
    case "sheet":
      return `半屏页 .sheet：标题 ${label("zh", it.label)}${hasText(it.supporting) ? `，内容 ${label("zh", it.supporting)}` : ""}（顶部有拖动指示条）`;
    case "progress":
      return it.variant === "circular"
        ? `环形进度 ProgressView（${it.value === undefined ? "不确定状态" : `值 ${it.value}%`}）`
        : `线性进度 ProgressView（${it.value === undefined ? "不确定状态" : `值 ${it.value}%`}）`;
    case "gauge":
      return `仪表盘 Gauge：标签 ${label("zh", it.label)}，当前值 ${it.value ?? 60}%`;
    case "text":
      return `${v}样式文本 ${label("zh", it.label)}${it.variant !== "body" ? `（.font(.${it.variant})）` : ""}`;
    case "image":
      return `图片占位（${it.icon ? `SF Symbol ${it.icon}` : "photo"}，${it.w ?? 200}×${it.h ?? 200}pt）`;
    case "divider":
      return "分割线 Divider";
    case "box":
      return `${v}色的容器 RoundedRectangle（${it.w ?? 361}×${it.h ?? 220}pt）`;
    case "menu":
      return `菜单按钮 Menu：${v}样式，标签 ${label("zh", it.label)}，菜单项 ${optionsText("zh", it.options ?? [], false, doc)}${selText("zh", it.selected ?? 0)}`;
    case "stepper":
      return `步进器 Stepper：标签 ${label("zh", it.label)}，当前值 ${it.value ?? 1}`;
    case "datePicker":
      return it.variant === "graphical"
        ? `日历视图 DatePicker(.graphical)：整月日历，选中 ${label("zh", it.supporting)}`
        : `日期选择 DatePicker(.compact)：标签 ${label("zh", it.label)}，当前值 ${label("zh", it.supporting)}`;
    case "secureField":
      return `密码输入 SecureField：标签 ${label("zh", it.label)}，占位 ${label("zh", it.supporting)}，尾部有 eye.slash 图标`;
    case "textEditor":
      return `多行文本 TextEditor：占位 ${label("zh", it.label)}（${it.w ?? 280}×${it.h ?? 120}pt）`;
    case "shareLink":
      return `分享按钮 ShareLink：${label("zh", it.label)}（SF Symbol square.and.arrow.up）`;
    case "link":
      return `链接 Link：${label("zh", it.label)}（着色文字）`;
    case "contentUnavailable":
      return `空状态 ContentUnavailableView：图标 ${it.icon ?? "tray"}，标题 ${label("zh", it.label)}，说明 ${label("zh", it.supporting)}`;
    case "disclosure":
      return `展开分组 DisclosureGroup：标题 ${label("zh", it.label)}${it.checked ? "（展开）" : "（收起）"}，内容 ${optionsText("zh", it.options ?? [], false, doc)}`;
    case "labeledContent":
      return `标签行 LabeledContent：左侧 ${label("zh", it.label)}，右侧 ${label("zh", it.supporting)}`;
    case "map":
      return `地图占位 Map（${it.w ?? 361}×${it.h ?? 200}pt），带定位点`;
    case "chart":
      return `图表 Swift Charts（.${it.variant === "line" ? "lineMark" : "barMark"}，${it.w ?? 361}×${it.h ?? 200}pt）`;
  }
}

function partEn(part0: Part, doc: Doc): string {
  const it = { ...part0, variant: variantOf(part0) };
  const v = variantText("en", it.variant);
  switch (it.kind) {
    case "button":
      return `${v} Button labeled ${label("en", it.label)}${it.icon ? ` with the SF Symbol ${it.icon}` : ""}`;
    case "iconButton":
      return `A ${v} icon button (${it.icon ?? "plus"}, 44pt)`;
    case "toggle":
      return `A Toggle labeled ${label("en", it.label)} (initially ${it.checked ? "on" : "off"})`;
    case "slider":
      return `A Slider (initial value ${it.value ?? 40}%)`;
    case "segmented":
      return `A segmented Picker with the items ${optionsText("en", it.options ?? [], false, doc)}${selText("en", it.selected ?? 0)}`;
    case "picker":
      return `A menu Picker labeled ${label("en", it.label)} with the items ${optionsText("en", it.options ?? [], false, doc)}${selText("en", it.selected ?? 0)}`;
    case "textField":
      return `A TextField labeled ${label("en", it.label)} with the placeholder ${label("en", it.supporting)}${it.icon ? ` and a leading ${it.icon} icon` : ""}`;
    case "searchField":
      return `A search field (.searchable) with the placeholder ${label("en", it.label)}`;
    case "navBar":
      return `A navigation bar (${it.variant === "large" ? "large title" : "inline title"}) titled ${label("en", it.label)}${it.icon ? `, a leading ${it.icon} button` : ""}${it.icon2 ? ` and a trailing ${it.icon2} button` : ""}`;
    case "tabBar":
      return `A tab bar (TabView) with the items ${optionsText("en", it.options ?? [], true, doc)}${selText("en", it.selected ?? 0)}`;
    case "list":
      return `An ${it.variant === "insetGrouped" ? "inset grouped List" : "plain List"} with the rows ${optionsText("en", it.options ?? [], true, doc)}${(it.options ?? []).some((o) => o.target) ? "; tapping a row opens its screen" : "; each row ends with a chevron.right"}`;
    case "card":
      return `A ${v} card titled ${label("en", it.label)}${hasText(it.supporting) ? ` with the body ${label("en", it.supporting)}` : ""}${it.icon ? ` and a ${it.icon} icon at the top` : ""}`;
    case "alert":
      return `An .alert titled ${label("en", it.label)} with the message ${label("en", it.supporting)} and the buttons ${optionsText("en", it.options ?? [], true, doc)}`;
    case "sheet":
      return `A .sheet titled ${label("en", it.label)}${hasText(it.supporting) ? ` containing ${label("en", it.supporting)}` : ""} (with a grabber at the top)`;
    case "progress":
      return `A ${it.variant} ProgressView (${it.value === undefined ? "indeterminate" : `${it.value}%`})`;
    case "gauge":
      return `A Gauge labeled ${label("en", it.label)} at ${it.value ?? 60}%`;
    case "text":
      return `A ${v} Text reading ${label("en", it.label)}${it.variant !== "body" ? ` (.font(.${it.variant}))` : ""}`;
    case "image":
      return `An image placeholder (${it.icon ? `SF Symbol ${it.icon}` : "photo"}, ${it.w ?? 200}×${it.h ?? 200}pt)`;
    case "divider":
      return "A Divider";
    case "box":
      return `A ${v} rounded rectangle container (${it.w ?? 361}×${it.h ?? 220}pt)`;
    case "menu":
      return `A ${v} Menu labeled ${label("en", it.label)} with items ${optionsText("en", it.options ?? [], false, doc)}${selText("en", it.selected ?? 0)}`;
    case "stepper":
      return `A Stepper labeled ${label("en", it.label)} at ${it.value ?? 1}`;
    case "datePicker":
      return it.variant === "graphical"
        ? `A graphical DatePicker (.graphical) with ${label("en", it.supporting)} selected`
        : `A compact DatePicker labeled ${label("en", it.label)} showing ${label("en", it.supporting)}`;
    case "secureField":
      return `A SecureField labeled ${label("en", it.label)}, placeholder ${label("en", it.supporting)}, eye.slash trailing icon`;
    case "textEditor":
      return `A TextEditor with placeholder ${label("en", it.label)} (${it.w ?? 280}×${it.h ?? 120}pt)`;
    case "shareLink":
      return `A ShareLink labeled ${label("en", it.label)} (SF Symbol square.and.arrow.up)`;
    case "link":
      return `A Link reading ${label("en", it.label)} (tinted text)`;
    case "contentUnavailable":
      return `A ContentUnavailableView with icon ${it.icon ?? "tray"}, title ${label("en", it.label)}, description ${label("en", it.supporting)}`;
    case "disclosure":
      return `A DisclosureGroup titled ${label("en", it.label)}${it.checked ? " (expanded)" : " (collapsed)"} containing ${optionsText("en", it.options ?? [], false, doc)}`;
    case "labeledContent":
      return `A LabeledContent row: ${label("en", it.label)} on the left, ${label("en", it.supporting)} on the right`;
    case "map":
      return `A Map placeholder (${it.w ?? 361}×${it.h ?? 200}pt) with a location pin`;
    case "chart":
      return `A Swift Charts chart (.${it.variant === "line" ? "lineMark" : "barMark"}, ${it.w ?? 361}×${it.h ?? 200}pt)`;
  }
}

function selText(lang: Lang, index: number): string {
  return lang === "zh" ? `，第 ${index + 1} 项为选中状态` : `, item ${index + 1} selected`;
}

/* ---------- screens & links ---------- */

function screenText(lang: Lang, doc: Doc, screen: Screen, withHeading: boolean): string {
  const parts = partsOf(doc, screen.id);
  const bars = parts.filter((p) => p.kind === "navBar" || p.kind === "tabBar");
  const rest = parts.filter((p) => !bars.includes(p));
  const lines: string[] = [];
  if (withHeading) {
    const bg = screen.bg && screen.bg !== "system" ? `${lang === "zh" ? "背景 " : "background "}${screen.bg}` : "";
    lines.push(`## ${lang === "zh" ? "屏幕" : "Screen"}: ${screen.name} (iPhone, ${SCREEN_W}×${SCREEN_H}pt)${bg ? `, ${bg}` : ""}`);
  } else {
    lines.push(`### ${screen.name}${screen.bg && screen.bg !== "system" ? (lang === "zh" ? `（背景 ${screen.bg}）` : ` (background ${screen.bg})`) : ""}`);
  }

  for (const bar of bars) {
    lines.push(`- ${partText(lang, bar, doc)}${noteText(lang, bar)}${linkText(lang, bar, doc)}`);
  }

  // visual reading order: top-to-bottom, left-to-right; parts whose vertical
  // spans overlap share a row (the same grouping tidy uses) and emit as one line
  const sorted = [...rest].sort((a, b) => a.y - b.y || a.x - b.x);
  const rows: Part[][] = [];
  for (const p of sorted) {
    const h = p.h ?? partSize(p.kind, p).h;
    const row = rows.find((r) => {
      const top = Math.min(...r.map((q) => q.y));
      const bottom = Math.max(...r.map((q) => q.y + partSize(q.kind, q).h));
      return p.y < bottom && p.y + h > top;
    });
    if (row) row.push(p);
    else rows.push([p]);
  }
  for (const row of rows) {
    if (row.length === 1) {
      const p = row[0];
      lines.push(`- ${partText(lang, p, doc)}${noteText(lang, p)}${linkText(lang, p, doc)}`);
    } else {
      const items = [...row]
        .sort((a, b) => a.x - b.x)
        .map((p) => `[${partText(lang, p, doc)}${linkText(lang, p, doc)}]`)
        .join(lang === "zh" ? "，" : ", ");
      lines.push(`- ${lang === "zh" ? "一行：" : "One row, left to right: "}${items}`);
    }
  }
  if (hasText(screen.note)) lines.push(lang === "zh" ? `- 屏幕说明：${screen.note}` : `- Screen note: ${screen.note}`);
  return lines.join("\n");
}

function noteText(lang: Lang, it: Part): string {
  return hasText(it.note) ? (lang === "zh" ? `。行为：${it.note}` : `. Behavior: ${it.note}`) : "";
}

function linkText(lang: Lang, it: Part, doc: Doc): string {
  const presents = it.presents
    ? (() => {
        const m = doc.parts.find((p) => p.id === it.presents);
        return m ? (lang === "zh" ? `。点击后弹出${m.kind === "alert" ? "警告框" : "面板"}「${m.label || m.id}」` : `. Tapping it presents the ${m.kind} "${m.label || m.id}"`) : "";
      })()
    : "";
  if (!presents) {
    const link = it.link;
    if (!link || !hasText(link.target)) return "";
    const target = link.target === BACK_TARGET ? (lang === "zh" ? "返回上一屏" : "goes back") : `${lang === "zh" ? "跳转到屏幕" : "opens the screen"} ${screenName(doc, link.target, "?")}`;
    const trans = TRANSITION_TEXT[lang][link.transition];
    return lang === "zh" ? `。点击后${target}，过渡：${trans}` : `. Tapping it ${target} with a ${trans} transition`;
  }
  return presents;
}

/* ---------- whole prompt ---------- */

export type PromptScope = { kind: "all" } | { kind: "screen"; id: string };

export function buildPrompt(doc: Doc, scope: PromptScope, lang: Lang): string {
  const screens = scope.kind === "all" ? doc.screens : doc.screens.filter((s) => s.id === scope.id);
  if (screens.length === 0 || doc.parts.length === 0) return "";

  const intro =
    lang === "zh"
      ? [
          `用 SwiftUI 构建一个 iPhone 应用${hasText(doc.title) ? `，名称 ${q(lang, doc.title)}` : ""}。设计稿如下，请按描述实现界面与导航。`,
          "布局按各条目出现的先后自上而下排列（栏固定在顶部/底部，其余条目按顺序排入可滚动内容区）；对齐与间距遵循 Human Interface Guidelines 的标准 16pt 边距。",
        ].join("\n")
      : [
          `Build an iPhone app${hasText(doc.title) ? ` called ${q(lang, doc.title)}` : ""} in SwiftUI from the design below.`,
          "Lay out each screen top-to-bottom in the order given (bars pin to the top/bottom; everything else stacks into a scrollable content area); follow the standard 16pt margins of the Human Interface Guidelines.",
        ].join("\n");

  const navText =
    lang === "zh"
      ? [
          "## 导航",
          "- 第一个屏幕是根视图；点击跳转用 NavigationStack push，半屏用 .sheet，全屏用 .fullScreenCover，无过渡直接切换视图，缩放过渡见技术基线。",
          "- 标签栏的每一项都指向对应屏幕（或用返回按钮 pop）。",
        ].join("\n")
      : [
          "## Navigation",
          "- The first screen is the root; taps navigate with a NavigationStack push, sheets with .sheet, full screens with .fullScreenCover, plain switches with no transition, and zoom transitions as described in the baseline.",
          "- Every tab bar item points at its target screen (or pops back).",
        ].join("\n");

  const closing =
    lang === "zh"
      ? "保持代码是地道的 SwiftUI：视图按屏幕拆分文件，状态用 @Observable，不引入第三方依赖，不写 UIKit。"
      : "Keep the code idiomatic SwiftUI: one file per screen, @Observable state, no third-party dependencies, no UIKit.";

  const body = screens.map((s) => screenText(lang, doc, s, true)).join("\n\n");
  // a single-screen brief can still reference other screens; say so explicitly
  // so the builder stubs their navigation instead of asking for them
  const outside = scope.kind === "screen" ? doc.screens.filter((s) => !screens.some((x) => x.id === s.id)).map((s) => s.name) : [];
  const externNote =
    scope.kind === "screen" && outside.length > 0
      ? lang === "zh"
        ? `注意：本屏跳转到的屏幕（${outside.join("、")}）不在本次范围内，请按名称预留导航接口即可。`
        : `Note: screens linked from this brief (${outside.join(", ")}) are outside its scope; stub their navigation by name.`
      : "";
  return [intro, apiBaseline(lang), themeText(doc), navText, body, externNote, closing].filter(Boolean).join("\n\n");
}
