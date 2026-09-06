"use client";

import React from "react";
import type { Palette } from "@/lib/theme";
import type { Part } from "@/lib/tokens";
import Icon from "./Icon";

/* Draws one part with iOS visuals. Coordinates come from the canvas wrapper:
 * each part renders absolutely at its x/y with its w/h. SF Symbol names render
 * through components/Icon.tsx (Lucide lookalikes, exact names preserved). */

interface Props {
  part: Part;
  palette: Palette;
  capsule: boolean;
  dark: boolean;
}

const radius = (capsule: boolean, h: number) => (capsule ? h / 2 : 12);

export default function SwiftPart({ part: p, palette: c, capsule, dark }: Props) {
  const fontStack = "-apple-system, 'SF Pro Text', 'Helvetica Neue', system-ui, sans-serif";

  switch (p.kind) {
    case "button": {
      const styles: Record<string, React.CSSProperties> = {
        bordered: { background: "transparent", border: `1.5px solid ${c.accent}`, color: c.accent },
        borderedProminent: { background: c.accent, color: c.accentText, border: "none" },
        gray: { background: c.fill, color: c.label, border: "none" },
        plain: { background: "transparent", color: c.accent, border: "none" },
        glass: {
          background: dark ? "rgba(120,120,128,0.30)" : "rgba(255,255,255,0.60)",
          backdropFilter: "blur(12px)",
          border: dark ? "0.5px solid rgba(255,255,255,0.15)" : "0.5px solid rgba(255,255,255,0.80)",
          color: c.accent,
          boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
        },
        glassProminent: {
          background: dark ? "rgba(120,120,128,0.35)" : "rgba(255,255,255,0.45)",
          backdropFilter: "blur(14px)",
          border: dark ? "0.5px solid rgba(255,255,255,0.18)" : "0.5px solid rgba(255,255,255,0.85)",
          color: c.accent,
          boxShadow: `inset 0 0 0 1.5px ${c.accent}`,
        },
      };
      return (
        <div
          style={{
            width: p.w ?? 160,
            height: p.h ?? 50,
            borderRadius: capsule ? (p.h ?? 50) / 2 : 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            fontSize: 17,
            fontWeight: 600,
            fontFamily: fontStack,
            ...styles[p.variant],
          }}
        >
          {p.icon ? <Icon name={p.icon} size={17} color={styles[p.variant].color as string} /> : null}
          {p.label}
        </div>
      );
    }

    case "iconButton": {
      const prominent = p.variant === "borderedProminent" || p.variant === "glassProminent";
      const glass = p.variant === "glass" || p.variant === "glassProminent";
      const size = p.w ?? 44;
      return (
        <div
          style={{
            width: size,
            height: size,
            borderRadius: capsule ? size / 2 : 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: prominent ? c.accent : glass ? (dark ? "rgba(120,120,128,0.30)" : "rgba(255,255,255,0.60)") : p.variant === "gray" ? c.fill : "transparent",
            border: p.variant === "bordered" ? `1.5px solid ${c.accent}` : glass ? (dark ? "0.5px solid rgba(255,255,255,0.16)" : "0.5px solid rgba(255,255,255,0.85)") : "none",
            backdropFilter: glass ? "blur(12px)" : undefined,
            boxShadow: glass ? "0 1px 4px rgba(0,0,0,0.12)" : undefined,
          }}
        >
          <Icon name={p.icon} size={18} color={prominent ? c.accentText : c.accent} />
        </div>
      );
    }

    case "toggle":
      return (
        <div style={{ width: p.w ?? 200, height: 31, display: "flex", alignItems: "center", justifyContent: "space-between", fontFamily: fontStack }}>
          <span style={{ fontSize: 17, color: c.label }}>{p.label}</span>
          <span
            style={{
              width: 51,
              height: 31,
              borderRadius: 16,
              background: p.checked ? "#34C759" : dark ? "rgba(120,120,128,0.32)" : "rgba(120,120,128,0.16)",
              position: "relative",
              transition: "background 0.2s",
              flex: "none",
            }}
          >
            <span
              style={{
                position: "absolute",
                top: 2,
                left: p.checked ? 22 : 2,
                width: 27,
                height: 27,
                borderRadius: 14,
                background: "#fff",
                boxShadow: "0 2px 4px rgba(0,0,0,0.25)",
                transition: "left 0.2s",
              }}
            />
          </span>
        </div>
      );

    case "slider": {
      const v = Math.min(100, Math.max(0, p.value ?? 40));
      return (
        <div style={{ width: p.w ?? 300, height: 36, display: "flex", alignItems: "center", position: "relative" }}>
          <div style={{ width: "100%", height: 4, borderRadius: 2, background: dark ? "rgba(120,120,128,0.38)" : "rgba(120,120,128,0.20)", position: "relative" }}>
            <div style={{ position: "absolute", inset: 0, width: `${v}%`, borderRadius: 2, background: dark ? "rgba(255,255,255,0.9)" : "#fff" }} />
            <div
              style={{
                position: "absolute",
                left: `calc(${v}% - 14px)`,
                top: "50%",
                transform: "translateY(-50%)",
                width: 28,
                height: 28,
                borderRadius: 14,
                background: dark ? "rgba(110,110,115,0.85)" : "rgba(250,250,250,0.95)",
                backdropFilter: "blur(8px)",
                border: dark ? "0.5px solid rgba(255,255,255,0.25)" : "0.5px solid rgba(0,0,0,0.06)",
                boxShadow: "0 3px 8px rgba(0,0,0,0.22), 0 1px 1px rgba(0,0,0,0.16)",
              }}
            />
          </div>
        </div>
      );
    }

    case "segmented": {
      const opts = p.options ?? [];
      const sel = p.selected ?? 0;
      return (
        <div
          style={{
            width: p.w ?? 361,
            height: 32,
            borderRadius: 9,
            background: dark ? "rgba(118,118,128,0.24)" : "rgba(118,118,128,0.12)",
            display: "flex",
            padding: 2,
            fontFamily: fontStack,
          }}
        >
          {opts.map((o, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                borderRadius: 7,
                background: i === sel ? (dark ? "#636366" : "#fff") : "transparent",
                boxShadow: i === sel ? "0 1px 3px rgba(0,0,0,0.12), 0 0 0 0.5px rgba(0,0,0,0.04)" : "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                fontSize: 13,
                color: c.label,
              }}
            >
              {o.icon ? <Icon name={o.icon} size={13} color={c.label} /> : null}
              {o.label}
            </div>
          ))}
        </div>
      );
    }

    case "picker":
      return (
        <div
          style={{
            width: p.w ?? 361,
            height: p.h ?? 60,
            borderRadius: 10,
            background: dark ? "rgba(118,118,128,0.24)" : "rgba(118,118,128,0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 16px",
            fontFamily: fontStack,
          }}
        >
          <span style={{ fontSize: 17, color: c.label }}>{p.label}</span>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 17, color: c.secondaryLabel }}>{(p.options ?? [])[p.selected ?? 0]?.label ?? ""}</span>
            <Icon name="chevron.up.chevron.down" size={12} color={c.secondaryLabel} />
          </span>
        </div>
      );

    case "textField":
      return (
        <div style={{ width: p.w ?? 361, fontFamily: fontStack }}>
          <div style={{ fontSize: 11, color: c.secondaryLabel, marginBottom: 4, letterSpacing: 0.2 }}>{p.label}</div>
          <div
            style={{
              height: 40,
              borderRadius: 10,
              background: dark ? "rgba(118,118,128,0.24)" : "rgba(118,118,128,0.12)",
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "0 12px",
              color: c.secondaryLabel,
              fontSize: 17,
            }}
          >
            {p.icon ? <Icon name={p.icon} size={16} color={c.secondaryLabel} /> : null}
            {p.supporting || ""}
          </div>
        </div>
      );

    case "searchField":
      return (
        <div
          style={{
            width: p.w ?? 361,
            height: p.h ?? 40,
            borderRadius: 10,
            background: dark ? "rgba(118,118,128,0.24)" : "rgba(118,118,128,0.12)",
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "0 10px",
            color: c.secondaryLabel,
            fontSize: 17,
            fontFamily: fontStack,
          }}
        >
          <Icon name="magnifyingglass" size={15} color={c.secondaryLabel} />
          {p.label || "Search"}
        </div>
      );

    case "navBar": {
      const large = p.variant === "large";
      return (
        <div
          style={{
            width: SCREENW,
            height: p.h ?? (large ? 96 : 54),
            background: c.chrome,
            backdropFilter: "blur(16px)",
            borderBottom: `0.5px solid ${c.separator}`,
            fontFamily: fontStack,
            position: "relative",
            color: c.label,
          }}
        >
          <div style={{ position: "absolute", left: 8, top: large ? 50 : 12, display: "flex", alignItems: "center", gap: 2, color: c.accent }}>
            {p.icon ? (
              <>
                <Icon name={p.icon} size={20} color={c.accent} />
                <span style={{ fontSize: 17 }}>Back</span>
              </>
            ) : null}
          </div>
          {large ? (
            <div style={{ position: "absolute", left: 16, bottom: 6, fontSize: 34, fontWeight: 700, letterSpacing: 0.4 }}>{p.label}</div>
          ) : (
            <div style={{ position: "absolute", left: 0, right: 0, top: 14, textAlign: "center", fontSize: 17, fontWeight: 600 }}>{p.label}</div>
          )}
          <div style={{ position: "absolute", right: 12, top: large ? 52 : 13 }}>
            <Icon name={p.icon2} size={20} color={c.accent} />
          </div>
        </div>
      );
    }

    case "tabBar": {
      const opts = p.options ?? [];
      const sel = p.selected ?? 0;
      return (
        <div
          style={{
            width: SCREENW,
            height: p.h ?? 83,
            background: c.chrome,
            backdropFilter: "blur(16px)",
            borderTop: `0.5px solid ${c.separator}`,
            display: "flex",
            flexDirection: "column",
            fontFamily: fontStack,
          }}
        >
          <div style={{ flex: 1, display: "flex" }}>
            {opts.map((o, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, color: i === sel ? c.accent : c.secondaryLabel }}>
                <Icon name={o.icon} size={22} color={i === sel ? c.accent : c.secondaryLabel} />
                <span style={{ fontSize: 10 }}>{o.label}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "center", paddingBottom: 8 }}>
            <div style={{ width: 134, height: 5, borderRadius: 3, background: c.label, opacity: dark ? 0.5 : 0.85 }} />
          </div>
        </div>
      );
    }

    case "list": {
      const opts = p.options ?? [];
      const inset = p.variant === "insetGrouped";
      return (
        <div
          style={{
            width: p.w ?? 361,
            background: inset ? c.panel : "transparent",
            borderRadius: inset ? 10 : 0,
            overflow: "hidden",
            fontFamily: fontStack,
            boxShadow: inset && !dark ? "0 0 0 0.5px rgba(0,0,0,0.04)" : undefined,
          }}
        >
          {opts.map((o, i) => (
            <div
              key={i}
              style={{
                height: 44,
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "0 16px",
                borderTop: i > 0 ? `0.5px solid ${c.separator}` : "none",
                marginLeft: inset && i > 0 && o.icon ? 16 : 0,
                paddingLeft: inset && i > 0 && o.icon ? 0 : 16,
              }}
            >
              {o.icon ? <Icon name={o.icon} size={20} color={c.accent} /> : null}
              <span style={{ fontSize: 17, color: c.label, flex: 1 }}>{o.label}</span>
              <Icon name="chevron.right" size={14} color={c.secondaryLabel} />
            </div>
          ))}
        </div>
      );
    }

    case "card":
      return (
        <div
          style={{
            width: p.w ?? 361,
            height: p.h ?? 140,
            borderRadius: 12,
            background: p.variant === "filled" ? c.panel : "transparent",
            border: p.variant === "stroke" ? `1px solid ${c.separator}` : "none",
            boxShadow: p.variant === "filled" && !dark ? "0 1px 3px rgba(0,0,0,0.08)" : undefined,
            padding: 14,
            fontFamily: fontStack,
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          {p.icon ? <Icon name={p.icon} size={26} color={c.accent} /> : null}
          <div style={{ fontSize: 17, fontWeight: 600, color: c.label }}>{p.label}</div>
          {p.supporting ? <div style={{ fontSize: 13, color: c.secondaryLabel, lineHeight: 1.35 }}>{p.supporting}</div> : null}
        </div>
      );

    case "alert":
      return (
        <div
          style={{
            width: p.w ?? 270,
            borderRadius: 14,
            background: dark ? "rgba(45,45,48,0.95)" : "rgba(250,250,250,0.97)",
            backdropFilter: "blur(20px)",
            overflow: "hidden",
            fontFamily: fontStack,
            boxShadow: "0 12px 40px rgba(0,0,0,0.25)",
            textAlign: "center",
          }}
        >
          <div style={{ padding: "18px 16px 14px" }}>
            <div style={{ fontSize: 17, fontWeight: 600, color: c.label }}>{p.label}</div>
            {p.supporting ? <div style={{ fontSize: 13, color: c.label, marginTop: 5, lineHeight: 1.35 }}>{p.supporting}</div> : null}
          </div>
          <div style={{ borderTop: `0.5px solid ${c.separator}`, display: "flex" }}>
            {(p.options ?? []).map((o, i, arr) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: 44,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 17,
                  color: c.accent,
                  fontWeight: i === arr.length - 1 ? 600 : 400,
                  borderLeft: i > 0 ? `0.5px solid ${c.separator}` : "none",
                }}
              >
                {o.label}
              </div>
            ))}
          </div>
        </div>
      );

    case "sheet":
      return (
        <div
          style={{
            width: SCREENW,
            height: p.h ?? 260,
            borderRadius: "10px 10px 0 0",
            background: c.panel,
            fontFamily: fontStack,
            position: "relative",
            boxShadow: "0 -4px 24px rgba(0,0,0,0.12)",
          }}
        >
          <div style={{ width: 36, height: 5, borderRadius: 3, background: c.secondaryLabel, opacity: 0.4, margin: "6px auto 0" }} />
          <div style={{ textAlign: "center", fontSize: 17, fontWeight: 600, color: c.label, marginTop: 8 }}>{p.label}</div>
          {p.supporting ? <div style={{ padding: "8px 16px", fontSize: 14, color: c.secondaryLabel, textAlign: "center" }}>{p.supporting}</div> : null}
        </div>
      );

    case "progress": {
      const v = p.value;
      if (p.variant === "circular") {
        const pct = v === undefined ? 0.25 : v / 100;
        const R = 20;
        const CIRC = 2 * Math.PI * R;
        return (
          <div style={{ width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width={48} height={48} viewBox="0 0 48 48">
              <circle cx={24} cy={24} r={R} fill="none" stroke={c.fill} strokeWidth={4} />
              {v !== undefined ? (
                <circle
                  cx={24}
                  cy={24}
                  r={R}
                  fill="none"
                  stroke={c.accent}
                  strokeWidth={4}
                  strokeLinecap="round"
                  strokeDasharray={`${CIRC * pct} ${CIRC}`}
                  transform="rotate(-90 24 24)"
                />
              ) : null}
            </svg>
          </div>
        );
      }
      return (
        <div style={{ width: p.w ?? 300, height: 4, borderRadius: 2, background: c.fill, overflow: "hidden" }}>
          <div style={{ width: `${v ?? 20}%`, height: "100%", borderRadius: 2, background: c.accent }} />
        </div>
      );
    }

    case "gauge": {
      const v = Math.min(100, Math.max(0, p.value ?? 60));
      const R = 44;
      const CIRC = Math.PI * R; // half circle
      return (
        <div style={{ width: p.w ?? 160, height: p.h ?? 120, fontFamily: fontStack, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <svg width={120} height={70} viewBox="0 0 120 70">
            <path d={`M 16 62 A ${R} ${R} 0 0 1 104 62`} fill="none" stroke={c.fill} strokeWidth={10} strokeLinecap="round" />
            <path
              d={`M 16 62 A ${R} ${R} 0 0 1 104 62`}
              fill="none"
              stroke={c.accent}
              strokeWidth={10}
              strokeLinecap="round"
              strokeDasharray={`${CIRC * (v / 100)} ${CIRC}`}
            />
          </svg>
          <div style={{ fontSize: 28, fontWeight: 700, color: c.label, marginTop: -14 }}>{v}</div>
          <div style={{ fontSize: 12, color: c.secondaryLabel }}>{p.label}</div>
        </div>
      );
    }

    case "text": {
      const size = ({ largeTitle: 34, title: 28, headline: 17, body: 17, callout: 16, footnote: 13, caption: 12 } as Record<string, number>)[p.variant] ?? 17;
      const weight = p.variant === "largeTitle" || p.variant === "title" ? 700 : p.variant === "headline" ? 600 : 400;
      return (
        <div
          style={{
            width: p.w ?? 300,
            fontSize: size,
            fontWeight: weight,
            color: c.label,
            fontFamily: fontStack,
            lineHeight: 1.25,
            whiteSpace: "pre-wrap",
          }}
        >
          {p.label}
        </div>
      );
    }

    case "image":
      return (
        <div
          style={{
            width: p.w ?? 200,
            height: p.h ?? 200,
            borderRadius: 10,
            background: dark ? "rgba(118,118,128,0.24)" : "rgba(118,118,128,0.12)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            color: c.secondaryLabel,
            fontFamily: fontStack,
          }}
        >
          <Icon name={p.icon ?? "photo"} size={40} color={c.secondaryLabel} />
          <span style={{ fontSize: 11 }}>{p.w ?? 200}×{p.h ?? 200}</span>
        </div>
      );

    case "divider":
      return <div style={{ width: p.w ?? 361, height: 1, background: c.separator }} />;

    case "box":
      return (
        <div
          style={{
            width: p.w ?? 361,
            height: p.h ?? 220,
            borderRadius: 12,
            background: p.variant === "background" ? c.bg : p.variant === "secondary" ? c.panel : c.fill,
            border: `0.5px solid ${c.separator}`,
            boxSizing: "border-box",
          }}
        />
      );
  }
}

const SCREENW = 393;
