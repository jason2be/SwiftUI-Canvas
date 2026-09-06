/* Data model for SwiftUI-Canvas.
 * A document is screens (iPhone-sized frames laid out on a canvas) and parts
 * (SwiftUI-shaped controls placed inside a screen). Everything serializes to
 * JSON as-is; localStorage holds the same shape. */

export type Lang = "en" | "zh";
export type Platform = "ios";

export type Variant =
  | "plain"
  | "gray"
  | "bordered"
  | "borderedProminent"
  | "glass"
  | "glassProminent"
  | "insetGrouped"
  | "plainList"
  | "inline"
  | "large"
  | "filled"
  | "stroke"
  | "roundedBorder"
  | "linear"
  | "circular"
  | "largeTitle"
  | "title"
  | "headline"
  | "body"
  | "callout"
  | "footnote"
  | "caption"
  | "background"
  | "secondary"
  | "tertiary"
  | "compact"
  | "graphical"
  | "bar"
  | "line";

export type Transition = "push" | "zoom" | "sheet" | "cover" | "none";

export const TRANSITIONS: Transition[] = ["push", "zoom", "sheet", "cover", "none"];

export type Kind =
  | "button"
  | "iconButton"
  | "toggle"
  | "slider"
  | "segmented"
  | "picker"
  | "textField"
  | "searchField"
  | "navBar"
  | "tabBar"
  | "list"
  | "card"
  | "alert"
  | "sheet"
  | "progress"
  | "gauge"
  | "text"
  | "image"
  | "divider"
  | "box"
  | "menu"
  | "stepper"
  | "datePicker"
  | "secureField"
  | "textEditor"
  | "shareLink"
  | "link"
  | "contentUnavailable"
  | "disclosure"
  | "labeledContent"
  | "map"
  | "chart";

export const KIND_ORDER: Kind[] = [
  "button",
  "iconButton",
  "toggle",
  "slider",
  "segmented",
  "picker",
  "textField",
  "searchField",
  "navBar",
  "tabBar",
  "list",
  "card",
  "alert",
  "sheet",
  "progress",
  "gauge",
  "text",
  "image",
  "divider",
  "box",
  "menu",
  "stepper",
  "datePicker",
  "secureField",
  "textEditor",
  "shareLink",
  "link",
  "contentUnavailable",
  "disclosure",
  "labeledContent",
  "map",
  "chart",
];

/** which kinds the parts palette shows, in order */
export const PALETTE_ORDER: Kind[] = [
  "button",
  "iconButton",
  "navBar",
  "tabBar",
  "list",
  "card",
  "toggle",
  "textField",
  "searchField",
  "segmented",
  "picker",
  "slider",
  "progress",
  "gauge",
  "alert",
  "sheet",
  "text",
  "image",
  "divider",
  "box",
];

/** variants offered per kind; first entry is the default */
export const KIND_VARIANTS: Record<Kind, Variant[]> = {
  button: ["bordered", "borderedProminent", "gray", "plain", "glass", "glassProminent"],
  iconButton: ["bordered", "borderedProminent", "gray", "plain", "glass", "glassProminent"],
  toggle: ["plain"],
  slider: ["plain"],
  segmented: ["plain"],
  picker: ["plain"],
  textField: ["roundedBorder", "plain"],
  searchField: ["plain"],
  navBar: ["large", "inline"],
  tabBar: ["plain"],
  list: ["insetGrouped", "plainList"],
  card: ["filled", "stroke"],
  alert: ["plain"],
  sheet: ["plain"],
  progress: ["linear", "circular"],
  gauge: ["plain"],
  text: ["body", "largeTitle", "title", "headline", "callout", "footnote", "caption"],
  image: ["plain"],
  divider: ["plain"],
  box: ["background", "secondary", "tertiary"],
  menu: ["bordered", "borderedProminent", "gray", "plain", "glass"],
  stepper: ["plain"],
  datePicker: ["compact", "graphical"],
  secureField: ["roundedBorder", "plain"],
  textEditor: ["plain"],
  shareLink: ["plain"],
  link: ["plain"],
  contentUnavailable: ["plain"],
  disclosure: ["plain"],
  labeledContent: ["plain"],
  map: ["plain"],
  chart: ["bar", "line"],
};

export interface Option {
  label: string;
  icon?: string | null;
  target?: string | null; // screen id a tab row item links to
}

export interface Link {
  target: string; // screen id or BACK_TARGET
  transition: Transition;
}

export interface Part {
  id: string;
  /** the screen this part sits on, or null for a canvas-level part that lives
   *  on the workspace (in world coordinates) and never enters the prompt */
  screen: string | null;
  kind: Kind;
  x: number;
  y: number;
  label: string;
  icon?: string | null;
  icon2?: string | null;
  supporting?: string;
  variant: Variant;
  checked?: boolean;
  selected?: number;
  options?: Option[];
  value?: number;
  w?: number;
  h?: number;
  note?: string;
  link?: Link;
}

export interface Screen {
  id: string;
  name: string;
  x: number;
  y: number;
  note?: string;
  /** screen background: a system token or a #hex color; system = default */
  bg?: string;
  /** system chrome: status bar (9:41, signal, battery) + home indicator;
   *  undefined keeps legacy screens clean, new screens draw it */
  chrome?: boolean;
}

/** safe areas the system chrome occupies: status bar top, home indicator bottom */
export const CHROME_TOP = 59;
export const CHROME_BOTTOM = 34;

/** the named screen backgrounds; anything else valid is a #hex color */
export const SCREEN_BGS = ["system", "secondary", "grouped"] as const;

/** the CSS color for a screen background, per scheme */
export function screenBgCss(bg: string | undefined, dark: boolean): string {
  if (!bg || bg === "system") return dark ? "#000000" : "#ffffff";
  if (bg === "secondary") return dark ? "#1C1C1E" : "#F2F2F7";
  if (bg === "grouped") return dark ? "#111113" : "#EFEFF4";
  return bg; // #hex
}

export interface Theme {
  accent: string; // preset key or hex like "#ff0000"
  scheme: "light" | "dark";
  shape: "default" | "capsule";
  font: "system" | "rounded" | "serif" | "monospaced";
}

export interface Doc {
  title: string;
  lang: Lang;
  platform: Platform;
  theme: Theme;
  screens: Screen[];
  parts: Part[];
}

export const BACK_TARGET = "back";
export const SCREEN_W = 393; // iPhone logical points
export const SCREEN_H = 852;
export const MARGIN = 16; // default inset inside a screen
export const GRID = 8;

export const ACCENT_PRESETS: { key: string; hex: string }[] = [
  { key: "systemBlue", hex: "#007AFF" },
  { key: "systemIndigo", hex: "#5856D6" },
  { key: "systemPurple", hex: "#AF52DE" },
  { key: "systemPink", hex: "#FF2D55" },
  { key: "systemRed", hex: "#FF3B30" },
  { key: "systemOrange", hex: "#FF9500" },
  { key: "systemGreen", hex: "#34C759" },
  { key: "systemMint", hex: "#00C7BE" },
  { key: "systemTeal", hex: "#30B0C7" },
];

export const DEFAULT_THEME: Theme = {
  accent: "systemBlue",
  scheme: "light",
  shape: "default",
  font: "system",
};

/** a fresh document with one screen and a starter nav bar + tab bar */
export function newDoc(lang: Lang = "en"): Doc {
  const home: Screen = { id: newId(), name: lang === "zh" ? "首页" : "Home", x: 60, y: 60 };
  return {
    title: lang === "zh" ? "未命名应用" : "Untitled App",
    lang,
    platform: "ios",
    theme: { ...DEFAULT_THEME },
    screens: [home],
    parts: [
      {
        id: newId(),
        screen: home.id,
        kind: "navBar",
        x: 0,
        y: 0,
        label: lang === "zh" ? "首页" : "Home",
        icon: "chevron.left",
        icon2: "plus",
        variant: "large",
      },
      {
        id: newId(),
        screen: home.id,
        kind: "tabBar",
        x: 0,
        y: SCREEN_H - 83,
        label: "",
        variant: "plain",
        selected: 0,
        options: [
          { label: lang === "zh" ? "首页" : "Home", icon: "house" },
          { label: lang === "zh" ? "搜索" : "Search", icon: "magnifyingglass" },
          { label: lang === "zh" ? "我的" : "Profile", icon: "person" },
        ],
      },
    ],
  };
}

export function newScreen(lang: Lang, index: number): Screen {
  return { id: newId(), name: lang === "zh" ? `屏幕 ${index + 1}` : `Screen ${index + 1}`, x: 60, y: 60, chrome: true };
}

let idCounter = 0;
export function newId(): string {
  idCounter += 1;
  return `p${Date.now().toString(36)}${idCounter.toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;
}

/** default size of a part when dropped onto a screen */
export function partSize(kind: Kind, part?: Partial<Part>): { w: number; h: number } {
  switch (kind) {
    case "button":
      return { w: 160, h: 50 };
    case "iconButton":
      return { w: 44, h: 44 };
    case "toggle":
      return { w: 200, h: 31 };
    case "slider":
      return { w: 300, h: 36 };
    case "segmented":
      return { w: 361, h: 32 };
    case "picker":
      return { w: 361, h: 44 };
    case "textField":
      return { w: 361, h: 60 };
    case "searchField":
      return { w: 361, h: 40 };
    case "navBar":
      return { w: SCREEN_W, h: 96 };
    case "tabBar":
      return { w: SCREEN_W, h: 83 };
    case "list":
      return { w: 361, h: 44 * Math.max(1, part?.options?.length ?? 3) };
    case "card":
      return { w: 361, h: 140 };
    case "alert":
      return { w: 270, h: 124 }; // rendered height: title + message + 44pt actions
    case "sheet":
      return { w: SCREEN_W, h: part?.h ?? 260 };
    case "progress":
      return { w: 300, h: part?.variant === "circular" ? 48 : 4 }; // linear bar is 4pt tall, circular ring 48
    case "gauge":
      return { w: 160, h: 120 };
    case "text": {
      // one line of the mapped UIFont size at 1.25 line height
      const size = ({ largeTitle: 34, title: 28, headline: 17, body: 17, callout: 16, footnote: 13, caption: 12 } as Record<string, number>)[variantOf({ kind: "text", variant: part?.variant ?? "body" })];
      return { w: 300, h: Math.round(1.25 * (size ?? 17)) };
    }
    case "image":
      return { w: 200, h: 200 };
    case "divider":
      return { w: 361, h: 1 };
    case "box":
      return { w: 361, h: 220 };
    case "menu":
      return { w: 160, h: 50 };
    case "stepper":
      return { w: 220, h: 36 };
    case "datePicker":
      return part?.variant === "graphical" ? { w: 320, h: 320 } : { w: 240, h: 36 };
    case "secureField":
      return { w: 361, h: 60 };
    case "textEditor":
      return { w: 280, h: 120 };
    case "shareLink":
      return { w: 160, h: 50 };
    case "link":
      return { w: 120, h: 25 };
    case "contentUnavailable":
      return { w: 361, h: 200 };
    case "disclosure":
      // collapsed row; expanded adds the 8pt gap, one 44pt row per option and hairlines
      return { w: 361, h: part?.checked ? 142 + 44 * Math.max(0, (part?.options?.length ?? 2) - 2) : 44 };
    case "labeledContent":
      return { w: 361, h: 44 };
    case "map":
      return { w: 361, h: 200 };
    case "chart":
      return { w: 361, h: 200 };
  }
}

/** the variant a part renders/prompt-writes with, defaulting to the kind's first */
export function variantOf(p: Pick<Part, "kind" | "variant">): Variant {
  const list = KIND_VARIANTS[p.kind];
  return list.includes(p.variant) ? p.variant : list[0];
}

export function defaultPart(lang: Lang, screenId: string | null, kind: Kind, x: number, y: number): Part {
  const base: Part = {
    id: newId(),
    screen: screenId,
    kind,
    x,
    y,
    label: "",
    variant: KIND_VARIANTS[kind][0],
  };
  switch (kind) {
    case "button":
      return { ...base, label: lang === "zh" ? "按钮" : "Button" };
    case "iconButton":
      return { ...base, icon: "plus" };
    case "toggle":
      return { ...base, label: lang === "zh" ? "开关" : "Toggle", checked: false };
    case "slider":
      return { ...base, value: 40 };
    case "segmented":
      return {
        ...base,
        selected: 0,
        options: [
          { label: lang === "zh" ? "一天" : "Day" },
          { label: lang === "zh" ? "一周" : "Week" },
          { label: lang === "zh" ? "一月" : "Month" },
        ],
      };
    case "picker":
      return {
        ...base,
        label: lang === "zh" ? "选择" : "Picker",
        selected: 0,
        options: [
          { label: lang === "zh" ? "选项一" : "Option 1" },
          { label: lang === "zh" ? "选项二" : "Option 2" },
        ],
      };
    case "textField":
      return { ...base, label: lang === "zh" ? "标签" : "Label", supporting: lang === "zh" ? "占位文本" : "Placeholder" };
    case "searchField":
      return { ...base, label: lang === "zh" ? "搜索" : "Search" };
    case "navBar":
      return { ...base, label: lang === "zh" ? "标题" : "Title", icon2: "plus" };
    case "tabBar":
      return {
        ...base,
        selected: 0,
        options: [
          { label: lang === "zh" ? "首页" : "Home", icon: "house" },
          { label: lang === "zh" ? "我的" : "Profile", icon: "person" },
        ],
      };
    case "list":
      return {
        ...base,
        options: [
          { label: lang === "zh" ? "列表项一" : "Row one", icon: "heart" },
          { label: lang === "zh" ? "列表项二" : "Row two", icon: "star" },
          { label: lang === "zh" ? "列表项三" : "Row three", icon: "bell" },
        ],
      };
    case "card":
      return {
        ...base,
        label: lang === "zh" ? "卡片标题" : "Card title",
        supporting: lang === "zh" ? "支持文本写在这里。" : "Supporting text goes here.",
        icon: "photo",
      };
    case "alert":
      return {
        ...base,
        label: lang === "zh" ? "提醒" : "Alert",
        supporting: lang === "zh" ? "这是一条说明信息。" : "A message goes here.",
        options: [
          { label: lang === "zh" ? "取消" : "Cancel" },
          { label: lang === "zh" ? "好" : "OK" },
        ],
      };
    case "sheet":
      return { ...base, label: lang === "zh" ? "半屏页面" : "Sheet", h: 260 };
    case "progress":
      return { ...base, value: 40 };
    case "gauge":
      return { ...base, label: lang === "zh" ? "速度" : "Speed", value: 60 };
    case "text":
      return { ...base, label: lang === "zh" ? "文本" : "Text" };
    case "image":
      return { ...base, icon: "photo" };
    case "divider":
      return base;
    case "box":
      return { ...base, variant: "background" };
    case "menu":
      return {
        ...base,
        label: lang === "zh" ? "更多操作" : "More",
        selected: 0,
        options: [
          { label: lang === "zh" ? "复制" : "Duplicate" },
          { label: lang === "zh" ? "重命名" : "Rename" },
          { label: lang === "zh" ? "删除" : "Delete" },
        ],
      };
    case "stepper":
      return { ...base, label: lang === "zh" ? "数量" : "Quantity", value: 1 };
    case "datePicker":
      return { ...base, label: lang === "zh" ? "日期" : "Date", supporting: lang === "zh" ? "2026年9月6日" : "Sep 6, 2026" };
    case "secureField":
      return { ...base, label: lang === "zh" ? "密码" : "Password", supporting: lang === "zh" ? "请输入密码" : "Required" };
    case "textEditor":
      return { ...base, label: lang === "zh" ? "备注" : "Notes", supporting: lang === "zh" ? "写点什么…" : "Start writing…" };
    case "shareLink":
      return { ...base, label: lang === "zh" ? "分享" : "Share", icon: "square.and.arrow.up" };
    case "link":
      return { ...base, label: lang === "zh" ? "了解更多" : "Learn more" };
    case "contentUnavailable":
      return { ...base, label: lang === "zh" ? "没有内容" : "No Content", supporting: lang === "zh" ? "稍后再来看看" : "Please check back later.", icon: "tray" };
    case "disclosure":
      return {
        ...base,
        label: lang === "zh" ? "详细信息" : "Details",
        options: [
          { label: lang === "zh" ? "条目一" : "Detail one" },
          { label: lang === "zh" ? "条目二" : "Detail two" },
        ],
      };
    case "labeledContent":
      return { ...base, label: lang === "zh" ? "版本" : "Version", supporting: "1.0" };
    case "map":
      return { ...base, label: lang === "zh" ? "地图" : "Map" };
    case "chart":
      return { ...base, label: lang === "zh" ? "图表" : "Chart" };
  }
}

/** parts of one screen in z-order (array order = back to front) */
export const partsOf = (doc: Doc, screenId: string) => doc.parts.filter((p) => p.screen === screenId);

export const screenById = (doc: Doc, id: string) => doc.screens.find((s) => s.id === id);

export const screenName = (doc: Doc, id: string, fallback = "?") =>
  id === BACK_TARGET ? (doc.lang === "zh" ? "返回" : "Back") : (screenById(doc, id)?.name ?? fallback);

export function duplicatePart(p: Part, id = newId()): Part {
  return {
    ...structuredClone(p),
    id,
    x: p.x + GRID * 2,
    y: p.y + GRID * 2,
    options: p.options?.map((o) => ({ ...o })),
  };
}

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
