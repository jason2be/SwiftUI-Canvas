import { ACCENT_PRESETS, type Theme } from "./tokens";

/** iOS system colors, light and dark variants, as canvas-renderable hex */
const LIGHT: Record<string, string> = {
  systemBlue: "#007AFF",
  systemIndigo: "#5856D6",
  systemPurple: "#AF52DE",
  systemPink: "#FF2D55",
  systemRed: "#FF3B30",
  systemOrange: "#FF9500",
  systemGreen: "#34C759",
  systemMint: "#00C7BE",
  systemTeal: "#30B0C7",
};

const DARK: Record<string, string> = {
  systemBlue: "#0A84FF",
  systemIndigo: "#5E5CE6",
  systemPurple: "#BF5AF2",
  systemPink: "#FF375F",
  systemRed: "#FF453A",
  systemOrange: "#FF9F0A",
  systemGreen: "#30D158",
  systemMint: "#63E6E2",
  systemTeal: "#40C8E0",
};

export interface Palette {
  accent: string;
  accentText: string; // readable text on accent
  bg: string;
  groupedBg: string;
  panel: string;
  label: string;
  secondaryLabel: string;
  separator: string;
  fill: string;
  chrome: string; // bar backgrounds
}

export function accentHex(theme: Theme): string {
  const a = theme.accent;
  if (a.startsWith("#")) return a;
  return (theme.scheme === "dark" ? DARK : LIGHT)[a] ?? LIGHT.systemBlue;
}

export function paletteOf(theme: Theme): Palette {
  const dark = theme.scheme === "dark";
  const accent = accentHex(theme);
  const onAccent = isLight(accent) ? "#000000" : "#FFFFFF";
  return dark
    ? {
        accent,
        accentText: onAccent,
        bg: "#000000",
        groupedBg: "#000000",
        panel: "#1C1C1E",
        label: "#FFFFFF",
        secondaryLabel: "rgba(235,235,245,0.6)",
        separator: "#38383A",
        fill: "#2C2C2E",
        chrome: "rgba(30,30,30,0.85)",
      }
    : {
        accent,
        accentText: onAccent,
        bg: "#FFFFFF",
        groupedBg: "#F2F2F7",
        panel: "#FFFFFF",
        label: "#000000",
        secondaryLabel: "rgba(60,60,67,0.6)",
        separator: "#C6C6C8",
        fill: "#D1D1D6",
        chrome: "rgba(249,249,249,0.85)",
      };
}

function isLight(hex: string): boolean {
  const h = hex.replace("#", "");
  if (h.length < 6) return false;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 160;
}

export const isPresetAccent = (key: string) => ACCENT_PRESETS.some((p) => p.key === key);
