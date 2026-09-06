"use client";

import React from "react";
import Icon from "@/components/Icon";
import { getT } from "@/lib/i18n";
import { ACCENT_PRESETS } from "@/lib/tokens";
import { accentHex } from "@/lib/theme";
import type { Editor } from "@/lib/store";

/* Theme popover: app name, accent, appearance, shape, font design. */

interface Props {
  editor: Editor;
  onClose: () => void;
}

export default function ThemePanel({ editor, onClose }: Props) {
  const { doc, lang, mutate } = editor;
  const t = getT(lang);
  const theme = doc.theme;

  return (
    <div className="popover" onPointerDown={(e) => e.stopPropagation()}>
      <div className="popover-head">
        <strong>{t("panel.theme")}</strong>
        <button className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="xmark" size={14} /></button>
      </div>

      <label className="field">
        <span className="field-label">{t("field.appTitle")}</span>
        <input value={doc.title} onChange={(e) => mutate((d) => ({ ...d, title: e.target.value }), `title`)} />
      </label>

      <div className="field">
        <span className="field-label">{t("theme.accent")}</span>
        <div className="swatches">
          {ACCENT_PRESETS.map((p) => (
            <button
              key={p.key}
              className={`swatch${theme.accent === p.key ? " on" : ""}`}
              style={{ background: accentHex({ ...theme, accent: p.key }) }}
              title={p.key}
              onClick={() => mutate((d) => ({ ...d, theme: { ...d.theme, accent: p.key } }))}
            />
          ))}
          <input
            type="color"
            className="swatch custom"
            value={theme.accent.startsWith("#") ? theme.accent : "#007AFF"}
            title="Custom"
            onChange={(e) => mutate((d) => ({ ...d, theme: { ...d.theme, accent: e.target.value } }))}
          />
        </div>
      </div>

      <div className="field">
        <span className="field-label">{t("theme.scheme")}</span>
        <div className="seg">
          {(["light", "dark"] as const).map((s) => (
            <button key={s} className={theme.scheme === s ? "on" : ""} onClick={() => mutate((d) => ({ ...d, theme: { ...d.theme, scheme: s } }))}>
              {s === "light" ? t("theme.light") : t("theme.dark")}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <span className="field-label">{t("theme.shape")}</span>
        <div className="seg">
          {(["default", "capsule"] as const).map((s) => (
            <button key={s} className={theme.shape === s ? "on" : ""} onClick={() => mutate((d) => ({ ...d, theme: { ...d.theme, shape: s } }))}>
              {s === "default" ? t("theme.shapeDefault") : t("theme.shapeCapsule")}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <span className="field-label">{t("theme.font")}</span>
        <div className="seg">
          {(["system", "rounded", "serif", "monospaced"] as const).map((f) => (
            <button key={f} className={theme.font === f ? "on" : ""} onClick={() => mutate((d) => ({ ...d, theme: { ...d.theme, font: f } }))}>
              {t(`theme.font${f[0].toUpperCase()}${f.slice(1)}` as string)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
