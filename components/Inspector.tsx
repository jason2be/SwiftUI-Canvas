"use client";

import React, { useState } from "react";
import { getT, KIND_TEXT, TRANSITION_TEXT, VARIANT_TEXT } from "@/lib/i18n";
import {
  BACK_TARGET,
  KIND_VARIANTS,
  duplicatePart,
  partsOf,
  screenById,
  type Part,
  type Transition,
} from "@/lib/tokens";
import Icon from "./Icon";
import type { Editor } from "@/lib/store";

/* Right panel: inspector for the selection (or the active screen), plus a
 * layers tab that shows z-order with reorder controls. */

/** which icon slot is being edited: a part's icon, trailing icon, or an option row's icon */
export type IconField = "icon" | "icon2" | `opt:${number}`;

interface Props {
  editor: Editor;
  onOpenIcon: (partId: string, field: IconField) => void;
}

const LINKABLE: Part["kind"][] = ["button", "iconButton", "card", "text", "image", "gauge", "box"];

export default function Inspector({ editor, onOpenIcon }: Props) {
  const { doc, lang, sel, setSel, activeScreen, mutate, beginBatch } = editor;
  const t = getT(lang);
  const [tab, setTab] = useState<"inspector" | "layers">("inspector");

  const part = sel.length === 1 ? doc.parts.find((p) => p.id === sel[0]) : undefined;

  const patch = (id: string, fields: Partial<Part>, key?: string) =>
    mutate((d) => ({ ...d, parts: d.parts.map((p) => (p.id === id ? { ...p, ...fields } : p)) }), key);

  const parts = activeScreen ? partsOf(doc, activeScreen) : [];

  return (
    <div className="inspector">
      <div className="seg seg-tabs">
        <button className={tab === "inspector" ? "on" : ""} onClick={() => setTab("inspector")}>{t("panel.inspector")}</button>
        <button className={tab === "layers" ? "on" : ""} onClick={() => setTab("layers")}>{t("panel.layers")}</button>
      </div>

      {tab === "layers" ? (
        <div className="layers">
          {activeScreen && parts.length > 0 ? (
            [...parts].reverse().map((p) => (
              <div key={p.id} className={`layer-row${sel.includes(p.id) ? " on" : ""}`} onClick={() => setSel([p.id])}>
                <span className="layer-glyph">{p.icon ? <Icon name={p.icon} size={13} /> : p.kind === "text" ? "T" : "▢"}</span>
                <span className="layer-name">{p.label || p.supporting || KIND_TEXT[lang][p.kind]}</span>
                <span className="layer-kind">{KIND_TEXT[lang][p.kind]}</span>
                <span className="layer-btns">
                  <button
                    title={t("action.forward")}
                    onClick={(e) => {
                      e.stopPropagation();
                      beginBatch();
                      mutate((d) => {
                        const arr = [...d.parts];
                        const i = arr.findIndex((x) => x.id === p.id);
                        if (i >= 0 && i < arr.length - 1) {
                          [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]];
                        }
                        return { ...d, parts: arr };
                      });
                    }}
                  >
                    ↑
                  </button>
                  <button
                    title={t("action.backward")}
                    onClick={(e) => {
                      e.stopPropagation();
                      beginBatch();
                      mutate((d) => {
                        const arr = [...d.parts];
                        const i = arr.findIndex((x) => x.id === p.id);
                        if (i > 0) {
                          [arr[i], arr[i - 1]] = [arr[i - 1], arr[i]];
                        }
                        return { ...d, parts: arr };
                      });
                    }}
                  >
                    ↓
                  </button>
                </span>
              </div>
            ))
          ) : (
            <div className="hint">{t("hint.dropParts")}</div>
          )}
        </div>
      ) : part ? (
        <div className="fields">
          <div className="field-head">
            <span className="field-kind">{KIND_TEXT[lang][part.kind]}</span>
          </div>

          {part.kind !== "divider" && part.kind !== "tabBar" && (
            <Field label={part.kind === "text" ? t("field.text") : part.kind === "textField" ? t("field.label") : t("field.title")}>
              <input
                value={part.label}
                onChange={(e) => patch(part.id, { label: e.target.value }, `label:${part.id}`)}
              />
            </Field>
          )}

          {["card", "alert", "sheet", "textField"].includes(part.kind) && (
            <Field label={part.kind === "textField" ? t("field.placeholder") : t("field.supporting")}>
              <input value={part.supporting ?? ""} onChange={(e) => patch(part.id, { supporting: e.target.value }, `sup:${part.id}`)} />
            </Field>
          )}

          {(["iconButton", "card", "textField", "image"] as const).includes(part.kind as never) && (
            <Field label={t("field.icon")}>
              <button className="icon-btn" onClick={() => onOpenIcon(part.id, "icon")}>
                {part.icon ? <Icon name={part.icon} size={15} /> : "—"} <span className="icon-name">{part.icon ?? ""}</span>
              </button>
            </Field>
          )}

          {part.kind === "navBar" && (
            <>
              <Field label={t("field.icon")}>
                <button className="icon-btn" onClick={() => onOpenIcon(part.id, "icon")}>
                  {part.icon ? <Icon name={part.icon} size={15} /> : "—"} <span className="icon-name">{part.icon ?? ""}</span>
                </button>
              </Field>
              <Field label={t("field.trailingIcon")}>
                <button className="icon-btn" onClick={() => onOpenIcon(part.id, "icon2")}>
                  {part.icon2 ? <Icon name={part.icon2} size={15} /> : "—"} <span className="icon-name">{part.icon2 ?? ""}</span>
                </button>
              </Field>
            </>
          )}

          {KIND_VARIANTS[part.kind].length > 1 && (
            <Field label={t("field.style")}>
              <div className="seg">
                {KIND_VARIANTS[part.kind].map((v) => (
                  <button key={v} className={part.variant === v ? "on" : ""} onClick={() => patch(part.id, { variant: v })}>
                    {VARIANT_TEXT[lang][v] ?? v}
                  </button>
                ))}
              </div>
            </Field>
          )}

          {part.kind === "toggle" && (
            <Field label={t("field.on")}>
              <button className={`switch${part.checked ? " on" : ""}`} onClick={() => patch(part.id, { checked: !part.checked })} role="switch" aria-checked={!!part.checked} />
            </Field>
          )}

          {["slider", "progress", "gauge"].includes(part.kind) && (
            <Field label={t("field.value")}>
              <input
                type="number"
                min={0}
                max={100}
                value={part.value ?? 40}
                onChange={(e) => patch(part.id, { value: clampN(e.target.value, 0, 100) }, `val:${part.id}`)}
              />
            </Field>
          )}

          {part.kind === "progress" && (
            <Field label=" ">
              <button className="mini" onClick={() => patch(part.id, { value: part.value === undefined ? 40 : undefined })}>
                {part.value === undefined ? (lang === "zh" ? "设为确定值" : "Make determinate") : lang === "zh" ? "设为不确定" : "Make indeterminate"}
              </button>
            </Field>
          )}

          {["segmented", "picker", "tabBar"].includes(part.kind) && (part.options?.length ?? 0) > 0 && (
            <Field label={t("field.selected")}>
              <select value={part.selected ?? 0} onChange={(e) => patch(part.id, { selected: Number(e.target.value) })}>
                {part.options?.map((o, i) => (
                  <option key={i} value={i}>{o.label || `#${i + 1}`}</option>
                ))}
              </select>
            </Field>
          )}

          {["segmented", "picker", "tabBar", "list", "alert"].includes(part.kind) && (
            <div className="options">
              <div className="field-label">{t("field.options")}</div>
              {part.options?.map((o, i) => (
                <div key={i} className="option-row">
                  <input
                    value={o.label}
                    onChange={(e) => {
                      const options = (part.options ?? []).map((oo, j) => (j === i ? { ...oo, label: e.target.value } : oo));
                      patch(part.id, { options }, `opt:${part.id}`);
                    }}
                  />
                  <button className="icon-btn sm" onClick={() => onOpenIcon(part.id, `opt:${i}`)}>
                    {o.icon ? <Icon name={o.icon} size={14} /> : "—"}
                  </button>
                  {part.kind === "tabBar" && (
                    <select
                      value={o.target ?? ""}
                      onChange={(e) => {
                        const options = (part.options ?? []).map((oo, j) => (j === i ? { ...oo, target: e.target.value || null } : oo));
                        patch(part.id, { options });
                      }}
                    >
                      <option value="">{t("field.linkNone")}</option>
                      {doc.screens.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  )}
                  <button
                    className="icon-btn sm"
                    onClick={() => patch(part.id, { options: (part.options ?? []).filter((_, j) => j !== i) })}
                    title={t("action.delete")}
                  >
                    ×
                  </button>
                </div>
              ))}
              <button className="mini" onClick={() => patch(part.id, { options: [...(part.options ?? []), { label: lang === "zh" ? "新选项" : "New item" }] })}>
                ＋ {t("field.addItem")}
              </button>
            </div>
          )}

          {LINKABLE.includes(part.kind) && (
            <>
              <Field label={t("field.link")}>
                <select
                  value={part.link?.target ?? ""}
                  onChange={(e) => {
                    const target = e.target.value;
                    patch(part.id, { link: target ? { target, transition: (part.link?.transition ?? "push") as Transition } : undefined });
                  }}
                >
                  <option value="">{t("field.linkNone")}</option>
                  <option value={BACK_TARGET}>{t("preview.back")}</option>
                  {doc.screens.filter((s) => s.id !== part.screen).map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </Field>
              {part.link && (
                <Field label={t("field.transition")}>
                  <select value={part.link.transition} onChange={(e) => patch(part.id, { link: { ...part.link!, transition: e.target.value as Transition } })}>
                    {(["push", "zoom", "sheet", "cover", "none"] as Transition[]).map((tr) => (
                      <option key={tr} value={tr}>{TRANSITION_TEXT[lang][tr]}</option>
                    ))}
                  </select>
                </Field>
              )}
            </>
          )}

          <Field label={t("field.note")}>
            <textarea
              rows={2}
              value={part.note ?? ""}
              placeholder={t("field.noteHint")}
              onChange={(e) => patch(part.id, { note: e.target.value }, `note:${part.id}`)}
            />
          </Field>

          <div className="pos-row">
            <NumField label="X" value={part.x} onChange={(v) => patch(part.id, { x: v })} />
            <NumField label="Y" value={part.y} onChange={(v) => patch(part.id, { y: v })} />
            <NumField label="W" value={part.w ?? 0} onChange={(v) => patch(part.id, { w: v || undefined })} />
            <NumField label="H" value={part.h ?? 0} onChange={(v) => patch(part.id, { h: v || undefined })} />
          </div>

          <div className="row-btns">
            <button className="mini" onClick={() => { beginBatch(); mutate((d) => { const np = duplicatePart(part); return { ...d, parts: [...d.parts, np] }; }); setSel([]); }}>
              {t("action.duplicate")}
            </button>
            <button className="mini danger" onClick={() => { mutate((d) => ({ ...d, parts: d.parts.filter((p) => p.id !== part.id) })); setSel([]); }}>
              {t("action.delete")}
            </button>
          </div>
        </div>
      ) : activeScreen && screenById(doc, activeScreen) ? (
        <div className="fields">
          {(() => {
            const s = screenById(doc, activeScreen)!;
            return (
              <>
                <div className="field-head">
                  <span className="field-kind">{t("field.screen")}</span>
                </div>
                <Field label={t("field.title")}>
                  <input
                    value={s.name}
                    onChange={(e) => mutate((d) => ({ ...d, screens: d.screens.map((x) => (x.id === s.id ? { ...x, name: e.target.value } : x)) }), `sname:${s.id}`)}
                  />
                </Field>
                <Field label={t("screen.note")}>
                  <textarea
                    rows={3}
                    value={s.note ?? ""}
                    onChange={(e) => mutate((d) => ({ ...d, screens: d.screens.map((x) => (x.id === s.id ? { ...x, note: e.target.value } : x)) }), `snote:${s.id}`)}
                  />
                </Field>
                <div className="row-btns">
                  <button
                    className="mini danger"
                    onClick={() => {
                      if (doc.screens.length > 1 && confirm(t("confirm.deleteScreen"))) {
                        mutate((d) => ({ ...d, screens: d.screens.filter((x) => x.id !== s.id), parts: d.parts.filter((p) => p.screen !== s.id) }));
                        editor.setActiveScreen(null);
                      }
                    }}
                  >
                    {t("action.delete")}
                  </button>
                </div>
              </>
            );
          })()}
        </div>
      ) : (
        <div className="hint">{t("hint.dropParts")}</div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="numfield">
      <span>{label}</span>
      <input
        type="number"
        value={value || ""}
        placeholder="auto"
        onChange={(e) => onChange(clampN(e.target.value, 0, 4000))}
      />
    </label>
  );
}

function clampN(raw: string, min: number, max: number): number {
  const n = Number(raw);
  if (Number.isNaN(n)) return min;
  return Math.min(max, Math.max(min, Math.round(n)));
}
