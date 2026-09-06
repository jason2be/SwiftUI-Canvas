/* A curated set of SF Symbols. The canvas preview draws an approximation
 * glyph per name; prompts and generated apps always use the exact name. */

export interface SymbolDef {
  name: string;
  glyph: string;
  cat: "common" | "media" | "comms" | "objects" | "arrows" | "nature";
}

export const SYMBOLS: SymbolDef[] = [
  { name: "house", glyph: "⌂", cat: "common" },
  { name: "gearshape", glyph: "⚙", cat: "common" },
  { name: "magnifyingglass", glyph: "⌕", cat: "common" },
  { name: "plus", glyph: "＋", cat: "common" },
  { name: "minus", glyph: "－", cat: "common" },
  { name: "xmark", glyph: "✕", cat: "common" },
  { name: "checkmark", glyph: "✓", cat: "common" },
  { name: "person", glyph: "👤", cat: "common" },
  { name: "person.2", glyph: "👥", cat: "common" },
  { name: "heart", glyph: "♥", cat: "common" },
  { name: "star", glyph: "★", cat: "common" },
  { name: "bell", glyph: "🔔", cat: "common" },
  { name: "bookmark", glyph: "🔖", cat: "common" },
  { name: "calendar", glyph: "📅", cat: "common" },
  { name: "clock", glyph: "🕐", cat: "common" },
  { name: "timer", glyph: "⏱", cat: "common" },
  { name: "trash", glyph: "🗑", cat: "common" },
  { name: "pencil", glyph: "✎", cat: "common" },
  { name: "square.and.pencil", glyph: "✎", cat: "common" },
  { name: "folder", glyph: "📁", cat: "common" },
  { name: "doc", glyph: "📄", cat: "common" },
  { name: "book", glyph: "📖", cat: "common" },
  { name: "tag", glyph: "🏷", cat: "common" },
  { name: "cart", glyph: "🛒", cat: "common" },
  { name: "bag", glyph: "🛍", cat: "common" },
  { name: "creditcard", glyph: "💳", cat: "common" },
  { name: "gift", glyph: "🎁", cat: "common" },
  { name: "crown", glyph: "👑", cat: "common" },
  { name: "key", glyph: "🔑", cat: "common" },
  { name: "lock", glyph: "🔒", cat: "common" },
  { name: "shield", glyph: "🛡", cat: "common" },
  { name: "list.bullet", glyph: "☰", cat: "common" },
  { name: "square.grid.2x2", glyph: "▦", cat: "common" },
  { name: "circle", glyph: "○", cat: "common" },
  { name: "seal", glyph: "◉", cat: "common" },
  { name: "qrcode", glyph: "▩", cat: "common" },
  { name: "faceid", glyph: "☻", cat: "common" },

  { name: "play", glyph: "▶", cat: "media" },
  { name: "pause", glyph: "⏸", cat: "media" },
  { name: "forward.end", glyph: "⏭", cat: "media" },
  { name: "backward.end", glyph: "⏮", cat: "media" },
  { name: "shuffle", glyph: "🔀", cat: "media" },
  { name: "repeat", glyph: "🔁", cat: "media" },
  { name: "speaker.wave.2", glyph: "🔊", cat: "media" },
  { name: "mic", glyph: "🎤", cat: "media" },
  { name: "music.note", glyph: "♪", cat: "media" },
  { name: "headphones", glyph: "🎧", cat: "media" },
  { name: "photo", glyph: "🖼", cat: "media" },
  { name: "camera", glyph: "📷", cat: "media" },
  { name: "video", glyph: "🎥", cat: "media" },
  { name: "film", glyph: "🎞", cat: "media" },
  { name: "gamecontroller", glyph: "🎮", cat: "media" },
  { name: "tv", glyph: "📺", cat: "media" },

  { name: "message", glyph: "💬", cat: "comms" },
  { name: "envelope", glyph: "✉", cat: "comms" },
  { name: "phone", glyph: "📞", cat: "comms" },
  { name: "paperplane", glyph: "✈", cat: "comms" },
  { name: "phone.badge.waveform", glyph: "📞", cat: "comms" },
  { name: "bubble.left", glyph: "🗨", cat: "comms" },
  { name: "share", glyph: "⤴", cat: "comms" },
  { name: "square.and.arrow.up", glyph: "⤴", cat: "comms" },
  { name: "square.and.arrow.down", glyph: "⤵", cat: "comms" },
  { name: "tray", glyph: "📥", cat: "comms" },

  { name: "chevron.left", glyph: "‹", cat: "arrows" },
  { name: "chevron.right", glyph: "›", cat: "arrows" },
  { name: "chevron.up", glyph: "⌃", cat: "arrows" },
  { name: "chevron.down", glyph: "⌄", cat: "arrows" },
  { name: "arrow.left", glyph: "←", cat: "arrows" },
  { name: "arrow.right", glyph: "→", cat: "arrows" },
  { name: "arrow.up", glyph: "↑", cat: "arrows" },
  { name: "arrow.down", glyph: "↓", cat: "arrows" },
  { name: "arrow.clockwise", glyph: "↻", cat: "arrows" },
  { name: "arrow.counterclockwise", glyph: "↺", cat: "arrows" },
  { name: "plus.circle", glyph: "⊕", cat: "arrows" },
  { name: "minus.circle", glyph: "⊖", cat: "arrows" },
  { name: "xmark.circle", glyph: "⊗", cat: "arrows" },
  { name: "checkmark.circle", glyph: "☑", cat: "arrows" },
  { name: "chevron.left.chevron.right", glyph: "«", cat: "arrows" },
  { name: "ellipsis", glyph: "…", cat: "arrows" },

  { name: "map", glyph: "🗺", cat: "nature" },
  { name: "location", glyph: "➤", cat: "nature" },
  { name: "leaf", glyph: "🍃", cat: "nature" },
  { name: "flame", glyph: "🔥", cat: "nature" },
  { name: "moon", glyph: "☾", cat: "nature" },
  { name: "sun.max", glyph: "☀", cat: "nature" },
  { name: "cloud", glyph: "☁", cat: "nature" },
  { name: "wifi", glyph: "🛜", cat: "nature" },
  { name: "battery.100", glyph: "🔋", cat: "nature" },
  { name: "car", glyph: "🚗", cat: "nature" },
  { name: "airplane", glyph: "🛩", cat: "nature" },
  { name: "bike", glyph: "🚲", cat: "nature" },
  { name: "figure.walk", glyph: "🚶", cat: "nature" },
  { name: "pawprint", glyph: "🐾", cat: "nature" },
  { name: "fork.knife", glyph: "🍴", cat: "nature" },
  { name: "drop", glyph: "💧", cat: "nature" },
  { name: "waveform", glyph: "🎙", cat: "nature" },
  { name: "chart.bar", glyph: "📊", cat: "nature" },
  { name: "chart.pie", glyph: "◔", cat: "nature" },
  { name: "graduationcap", glyph: "🎓", cat: "nature" },
  { name: "briefcase", glyph: "💼", cat: "nature" },
  { name: "building", glyph: "🏢", cat: "nature" },
  { name: "wallet", glyph: "👛", cat: "nature" },
  { name: "dollarsign", glyph: "＄", cat: "nature" },
];

export function glyphFor(name?: string | null): string {
  if (!name) return "";
  return SYMBOLS.find((s) => s.name === name)?.glyph ?? "◉";
}

export function searchSymbols(query: string): SymbolDef[] {
  const q = query.trim().toLowerCase();
  if (!q) return SYMBOLS;
  return SYMBOLS.filter((s) => s.name.toLowerCase().includes(q) || s.cat.includes(q));
}
