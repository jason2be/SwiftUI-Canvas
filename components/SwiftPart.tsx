"use client";

import React from "react";
import type { Lang } from "@/lib/i18n";
import type { Palette } from "@/lib/theme";
import { variantOf, type Part } from "@/lib/tokens";
import Icon from "./Icon";

/* Draws one part with iOS visuals. Coordinates come from the canvas wrapper:
 * each part renders absolutely at its x/y with its w/h. SF Symbol names render
 * through components/Icon.tsx (Lucide lookalikes, exact names preserved). */

interface Props {
  part: Part;
  palette: Palette;
  capsule: boolean;
  dark: boolean;
  /** interface language for built-in labels ("Back"); defaults to en */
  lang?: Lang;
}

const radius = (capsule: boolean, h: number) => (capsule ? h / 2 : 12);

export default function SwiftPart({ part: p, palette: c, capsule, dark, lang = "en" }: Props) {
  const fontStack = "-apple-system, 'SF Pro Text', 'Helvetica Neue', system-ui, sans-serif";

  switch (p.kind) {
    case "button": {
      const v = variantOf(p);
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
            ...styles[v],
          }}
        >
          {p.icon ? <Icon name={p.icon} size={17} color={styles[v].color as string} /> : null}
          {p.label}
        </div>
      );
    }

    case "iconButton": {
      const v = variantOf(p);
      const prominent = v === "borderedProminent" || v === "glassProminent";
      const glass = v === "glass" || v === "glassProminent";
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
            background: prominent ? c.accent : glass ? (dark ? "rgba(120,120,128,0.30)" : "rgba(255,255,255,0.60)") : v === "gray" ? c.fill : "transparent",
            border: v === "bordered" ? `1.5px solid ${c.accent}` : glass ? (dark ? "0.5px solid rgba(255,255,255,0.16)" : "0.5px solid rgba(255,255,255,0.85)") : "none",
            backdropFilter: glass ? "blur(12px)" : undefined,
            boxShadow: glass ? "0 1px 4px rgba(0,0,0,0.12)" : undefined,
          }}
        >
          <Icon name={p.icon} size={20} color={prominent ? c.accentText : c.accent} />
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
            <div style={{ position: "absolute", inset: 0, width: `${v}%`, borderRadius: 2, background: c.accent }} />
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
      // iOS menu picker renders as a Form row: label left, value + up/down
      // chevron right, 44pt tall, no box around it
      return (
        <div
          style={{
            width: p.w ?? 361,
            height: p.h ?? 44,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
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
            justifyContent: "center",
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
      const large = variantOf(p) === "large";
      // iOS layout: back chevron and the trailing action share the top 44pt
      // row; the large title sits in the lower half, left-aligned at 16pt
      const rowTop = large ? 10 : 15;
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
          <div style={{ position: "absolute", left: 8, top: rowTop, display: "flex", alignItems: "center", gap: 2, color: c.accent }}>
            {p.icon ? (
              <>
                <Icon name={p.icon} size={20} color={c.accent} />
                <span style={{ fontSize: 17 }}>{lang === "zh" ? "返回" : "Back"}</span>
              </>
            ) : null}
          </div>
          {large ? (
            <div style={{ position: "absolute", left: 16, bottom: 8, fontSize: 34, fontWeight: 700, letterSpacing: 0.4 }}>{p.label}</div>
          ) : (
            <div style={{ position: "absolute", left: 0, right: 0, top: 15, textAlign: "center", fontSize: 17, fontWeight: 600 }}>{p.label}</div>
          )}
          <div style={{ position: "absolute", right: 12, top: rowTop, display: "flex", alignItems: "center" }}>
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
      const inset = variantOf(p) === "insetGrouped";
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
                position: "relative",
                marginLeft: inset && i > 0 && o.icon ? 16 : 0,
                paddingLeft: inset && i > 0 && o.icon ? 0 : 16,
              }}
            >
              {/* iOS separators are inset to the text origin, not full width */}
              {i > 0 ? <div style={{ position: "absolute", left: inset && o.icon ? 0 : 16, right: 0, top: 0, height: 0.5, background: c.separator }} /> : null}
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
            background: variantOf(p) === "filled" ? c.panel : "transparent",
            border: variantOf(p) === "stroke" ? `1px solid ${c.separator}` : "none",
            boxShadow: variantOf(p) === "filled" && !dark ? "0 1px 3px rgba(0,0,0,0.08)" : undefined,
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
            {(p.options ?? []).map((o, i) => (
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
                  fontWeight: i === 0 ? 600 : 400, // iOS bolds the preferred (first/cancel) action
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
      // value is 0-100; tolerate 0-1 fractions (agent-authored docs)
      const ratio = v2pct(p.value, 20);
      if (variantOf(p) === "circular") {
        const pct = v2pct(p.value, 25) / 100;
        const R = 20;
        const CIRC = 2 * Math.PI * R;
        return (
          <div style={{ width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width={48} height={48} viewBox="0 0 48 48">
              <circle cx={24} cy={24} r={R} fill="none" stroke={c.fill} strokeWidth={4} />
              {p.value !== undefined ? (
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
          <div style={{ width: `${ratio}%`, height: "100%", borderRadius: 2, background: c.accent }} />
        </div>
      );
    }

    case "gauge": {
      const v = Math.round(Math.min(100, Math.max(0, v2pct(p.value, 60))));
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
      // per UIFont text styles: titles are regular weight; bold is a nav-bar
      // concern (handled in the navBar case)
      const size = ({ largeTitle: 34, title: 28, headline: 17, body: 17, callout: 16, footnote: 13, caption: 12 } as Record<string, number>)[variantOf(p)] ?? 17;
      const v = variantOf(p);
      const weight = v === "headline" ? 600 : 400;
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

    case "menu": {
      // a button that opens a menu: same button styles, chevron.up.chevron.down trailing
      const v = variantOf(p);
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
            gap: 7,
            fontSize: 17,
            fontWeight: 600,
            fontFamily: fontStack,
            ...styles[v],
          }}
        >
          {p.icon ? <Icon name={p.icon} size={16} color={styles[v].color as string} /> : null}
          {p.label}
          <Icon name="chevron.up.chevron.down" size={11} color={styles[v].color as string} />
        </div>
      );
    }

    case "stepper":
      // a label row with the UISegmented-like −/value/+ control on the right
      return (
        <div style={{ width: p.w ?? 220, height: p.h ?? 36, display: "flex", alignItems: "center", fontFamily: fontStack }}>
          <div style={{ fontSize: 15, color: c.label, flex: 1, whiteSpace: "nowrap", overflow: "hidden" }}>{p.label}</div>
          <div style={{ display: "flex", alignItems: "center", height: 32, borderRadius: 8, overflow: "hidden", background: c.fill, flex: "none" }}>
            <div style={{ width: 32, height: 32, display: "grid", placeItems: "center", color: c.secondaryLabel, fontSize: 17 }}><Icon name="minus" size={13} /></div>
            <div style={{ width: 1, height: 32, background: c.separator }} />
            <div style={{ minWidth: 30, textAlign: "center", fontSize: 15, color: c.label, fontWeight: 600 }}>{p.value ?? 1}</div>
            <div style={{ width: 1, height: 32, background: c.separator }} />
            <div style={{ width: 32, height: 32, display: "grid", placeItems: "center", color: c.accent, fontSize: 17 }}><Icon name="plus" size={13} /></div>
          </div>
        </div>
      );

    case "datePicker": {
      if (p.variant === "graphical") {
        // a month grid: header, weekday letters, 5 rows of days, one selected
        const days = Array.from({ length: 30 }, (_, i) => i + 1);
        return (
          <div style={{ width: p.w ?? 320, height: p.h ?? 320, borderRadius: 12, background: c.bg, fontFamily: fontStack, padding: 10, border: `1px solid ${c.separator}` }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: c.label, marginBottom: 6 }}>{p.label || (lang === "zh" ? "2026年9月" : "September 2026")}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, fontSize: 10, color: c.secondaryLabel, textAlign: "center" }}>
              {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <div key={i}>{d}</div>)}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, fontSize: 12, color: c.label, textAlign: "center", marginTop: 4 }}>
              {days.map((d) => (
                <div key={d} style={{ width: 24, height: 24, margin: "0 auto", display: "grid", placeItems: "center", borderRadius: 12, background: d === 6 ? c.accent : "transparent", color: d === 6 ? c.accentText : c.label }}>{d}</div>
              ))}
            </div>
          </div>
        );
      }
      return (
        <div style={{ width: p.w ?? 240, height: p.h ?? 36, borderRadius: 8, background: c.fill, display: "flex", alignItems: "center", gap: 6, padding: "0 10px", fontFamily: fontStack }}>
          <span style={{ fontSize: 15, color: c.label, flex: 1, whiteSpace: "nowrap", overflow: "hidden" }}>{p.supporting || p.label}</span>
          <Icon name="calendar" size={15} color={c.accent} />
          <Icon name="chevron.up.chevron.down" size={11} color={c.secondaryLabel} />
        </div>
      );
    }

    case "secureField": {
      // a password field: label above, dot placeholder, eye.slash trailing
      return (
        <div style={{ width: p.w ?? 361, fontFamily: fontStack }}>
          {p.label && <div style={{ fontSize: 11, color: c.secondaryLabel, marginBottom: 4, letterSpacing: 0.2 }}>{p.label}</div>}
          <div
            style={{
              height: 40,
              borderRadius: p.variant === "plain" ? 0 : 10,
              background: p.variant === "plain" ? "transparent" : dark ? "rgba(118,118,128,0.24)" : "rgba(118,118,128,0.12)",
              border: p.variant === "plain" ? "none" : "none",
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: p.variant === "plain" ? 0 : "0 12px",
            }}
          >
            <span style={{ fontSize: 17, color: c.secondaryLabel, letterSpacing: 2, flex: 1 }}>••••••••</span>
            <Icon name="eye.slash" size={16} color={c.secondaryLabel} />
          </div>
        </div>
      );
    }

    case "textEditor":
      return (
        <div
          style={{
            width: p.w ?? 280,
            height: p.h ?? 120,
            borderRadius: 8,
            background: dark ? "rgba(118,118,128,0.24)" : "rgba(118,118,128,0.12)",
            padding: 9,
            fontSize: 15,
            color: c.secondaryLabel,
            fontFamily: fontStack,
            textAlign: "left",
            lineHeight: 1.4,
          }}
        >
          {p.label || ""}
        </div>
      );

    case "shareLink":
      return (
        <div style={{ width: p.w ?? 160, height: p.h ?? 50, borderRadius: capsule ? (p.h ?? 50) / 2 : 12, background: c.accent, color: c.accentText, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, fontSize: 17, fontWeight: 600, fontFamily: fontStack }}>
          <Icon name={p.icon ?? "square.and.arrow.up"} size={17} color={c.accentText} />
          {p.label}
        </div>
      );

    case "link":
      return (
        <span style={{ width: p.w ?? 120, fontSize: 17, color: c.accent, textDecoration: "underline", fontFamily: fontStack, display: "inline-block" }}>{p.label}</span>
      );

    case "contentUnavailable":
      return (
        <div style={{ width: p.w ?? 361, height: p.h ?? 200, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: fontStack, padding: 16, textAlign: "center" }}>
          <Icon name={p.icon ?? "tray"} size={44} color={c.secondaryLabel} />
          <div style={{ fontSize: 17, fontWeight: 600, color: c.label }}>{p.label}</div>
          <div style={{ fontSize: 13, color: c.secondaryLabel, textAlign: "center", maxWidth: 260 }}>{p.supporting}</div>
        </div>
      );

    case "disclosure": {
      const open = !!p.checked;
      const rows = p.options ?? [];
      return (
        <div style={{ width: p.w ?? 361, fontFamily: fontStack }}>
          <div style={{ height: 44, display: "flex", alignItems: "center", gap: 8, background: c.bg }}>
            <span style={{ fontSize: 17, color: c.label, flex: 1 }}>{p.label}</span>
            <Icon name="chevron.down" size={13} color={c.secondaryLabel} />
          </div>
          {open && rows.length > 0 && (
            <div style={{ border: `1px solid ${c.separator}`, borderRadius: 10, overflow: "hidden", marginTop: 8 }}>
              {rows.map((o, i) => (
                <div key={i}>
                  <div style={{ height: 44, display: "flex", alignItems: "center", padding: "0 12px", fontSize: 15, color: c.secondaryLabel }}>{o.label}</div>
                  {i < rows.length - 1 && <div style={{ height: 0.5, background: c.separator }} />}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    case "labeledContent":
      return (
        <div style={{ width: p.w ?? 361, height: p.h ?? 44, display: "flex", alignItems: "center", background: c.bg, padding: "0 12px", fontFamily: fontStack }}>
          <span style={{ fontSize: 17, color: c.label }}>{p.label}</span>
          <span style={{ fontSize: 17, color: c.secondaryLabel, marginLeft: "auto" }}>{p.supporting}</span>
        </div>
      );

    case "map": {
      // a light map: blocks, a diagonal avenue, a route polyline and a pin
      const land = dark ? "#1c2a1e" : "#e8efe4";
      const road = dark ? "#2e3d31" : "#f6f8f4";
      return (
        <div style={{ width: p.w ?? 361, height: p.h ?? 200, borderRadius: 12, background: land, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", left: 0, right: 0, top: 44, height: 14, background: road, transform: "rotate(-6deg)" }} />
          <div style={{ position: "absolute", left: 0, right: 0, top: 120, height: 10, background: road, transform: "rotate(3deg)" }} />
          <div style={{ position: "absolute", top: 0, bottom: 0, left: 120, width: 12, background: road, transform: "rotate(8deg)" }} />
          <div style={{ position: "absolute", top: 0, bottom: 0, left: 260, width: 9, background: road }} />
          <svg width="100%" height="100%" viewBox="0 0 361 200" style={{ position: "absolute", inset: 0 }}>
            <path d="M 40 170 C 110 150, 150 90, 250 60" fill="none" stroke={c.accent} strokeWidth={4} strokeLinecap="round" opacity={0.9} />
            <circle cx={250} cy={60} r={5} fill={c.accent} />
          </svg>
          <div style={{ position: "absolute", left: "50%", top: "42%", transform: "translate(-50%, -100%)", color: "#ff3b30" }}>
            <Icon name="mappin" size={26} />
          </div>
        </div>
      );
    }

    case "chart": {
      if (p.variant === "line") {
        const pts = [150, 110, 128, 70, 90, 40].map((y, i) => `${40 + i * 56},${y}`).join(" ");
        return (
          <div style={{ width: p.w ?? 361, height: p.h ?? 200, background: c.bg, borderRadius: 12, position: "relative", fontFamily: fontStack, padding: 10 }}>
            <svg width="100%" height="100%" viewBox="0 0 340 180" preserveAspectRatio="none">
              {[30, 80, 130].map((y) => <line key={y} x1={30} x2={330} y1={y} y2={y} stroke={c.separator} strokeWidth={1} />)}
              <polyline points={pts} fill="none" stroke={c.accent} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        );
      }
      const bars = [60, 110, 84, 140, 96];
      return (
        <div style={{ width: p.w ?? 361, height: p.h ?? 200, background: c.bg, borderRadius: 12, position: "relative", fontFamily: fontStack, padding: 10 }}>
          <div style={{ position: "absolute", left: 10, right: 10, bottom: 20, top: 16, display: "flex", alignItems: "flex-end", justifyContent: "space-around" }}>
            {bars.map((h, i) => (
              <div key={i} style={{ width: 26, height: `${(h / 150) * 100}%`, borderRadius: "5px 5px 2px 2px", background: i === 3 ? c.accent : c.accent, opacity: i === 3 ? 1 : 0.55 }} />
            ))}
          </div>
          <div style={{ position: "absolute", left: 10, right: 10, bottom: 20, height: 1, background: c.separator }} />
        </div>
      );
    }

    case "box":
      return (
        <div
          style={{
            width: p.w ?? 361,
            height: p.h ?? 220,
            borderRadius: 12,
            background: variantOf(p) === "background" ? c.bg : variantOf(p) === "secondary" ? c.panel : c.fill,
            border: `0.5px solid ${c.separator}`,
            boxSizing: "border-box",
          }}
        />
      );
  }
}

const SCREENW = 393;

/** progress/gauge values are 0-100 but agent docs may carry a 0-1 fraction */
function v2pct(value: number | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  return Math.min(100, Math.max(0, value <= 1 ? value * 100 : value));
}
