"use client";

import React, { useRef, useState } from "react";
import { getT } from "@/lib/i18n";
import Icon from "@/components/Icon";
import { readProject, saveProject, validateDoc } from "@/lib/project";
import { shareLink } from "@/lib/share";
import type { Editor } from "@/lib/store";

/* Top bar: brand, history, tidy, theme popover trigger, share, files, language, preview, prompt. */

interface Props {
  editor: Editor;
  onAddScreen: () => void;
  onTidy: () => void;
  onPreview: () => void;
  onPrompt: () => void;
  onTheme: () => void;
  /** called when a file load repairs or drops something, to surface why */
  onLoaded?: (warnings: string[]) => void;
}

export default function Toolbar({ editor, onAddScreen, onTidy, onPreview, onPrompt, onTheme, onLoaded }: Props) {
  const { doc, lang, setLang, undo, redo, canUndo, canRedo, replaceDoc } = editor;
  const t = getT(lang);
  const fileRef = useRef<HTMLInputElement>(null);
  const [toast, setToast] = useState("");

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 1600);
  };

  const onShare = async () => {
    const link = await shareLink(doc);
    try {
      await navigator.clipboard.writeText(link);
      flash(t("shared.copied"));
    } catch {
      setManualLink(link); // clipboard blocked; show the link to copy by hand
    }
  };

  const [manualLink, setManualLink] = useState<string | null>(null);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const next = await readProject(f);
    if (next) {
      replaceDoc(next);
      onLoaded?.([]);
    } else {
      // try the tolerant path before giving up
      try {
        const v = validateDoc(JSON.parse(await f.text()), lang === "zh" ? "文件" : "File", lang);
        if (v.doc) {
          replaceDoc(v.doc);
          onLoaded?.(v.warnings);
        } else {
          flash(lang === "zh" ? v.errors.join("；") : v.errors.join("; "));
        }
      } catch {
        flash(lang === "zh" ? "无法识别的文件" : "Unrecognized file");
      }
    }
    e.target.value = "";
  };

  return (
    <header className="toolbar">
      <div className="brand">
        <span className="brand-mark">{`{S}`}</span>
        <span className="brand-name">SwiftUI Canvas</span>
        <span className="brand-doc">{doc.title}</span>
      </div>

      <div className="tool-groups">
        <div className="tool-group">
          <button className="tb" onClick={onAddScreen} title={t("action.addScreen")}>
            <Icon name="plus.rectangle.on.rectangle" size={15} /> {t("action.addScreen")}
          </button>
          <button className="tb icon-only" onClick={undo} disabled={!canUndo} title={t("action.undo")} aria-label={t("action.undo")}>
            <Icon name="arrow.uturn.backward" size={16} />
          </button>
          <button className="tb icon-only" onClick={redo} disabled={!canRedo} title={t("action.redo")} aria-label={t("action.redo")}>
            <Icon name="arrow.uturn.forward" size={16} />
          </button>
          <button className="tb" onClick={onTidy} title={t("action.tidy")}>
            <Icon name="wand.and.stars" size={15} /> {t("action.tidy")}
          </button>
        </div>

        <div className="tool-group">
          <button className="tb" onClick={onShare} title={t("action.share")}>
            <Icon name="square.and.arrow.up" size={15} /> {t("action.share")}
          </button>
          <button className="tb" onClick={() => saveProject(doc)} title={t("action.save")}>
            <Icon name="square.and.arrow.down" size={15} /> {t("action.save")}
          </button>
          <button className="tb" onClick={() => fileRef.current?.click()} title={t("action.open")}>
            <Icon name="folder" size={15} /> {t("action.open")}
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={onFile} />
        </div>

        <div className="tool-group">
          <button className="tb" onClick={() => setLang(lang === "zh" ? "en" : "zh")} title={t("field.language")}>
            <Icon name="globe" size={15} /> {lang === "zh" ? "EN" : "中文"}
          </button>
          <button className="tb" onClick={onPreview} title={t("action.preview")}>
            <Icon name="play" size={15} /> {t("action.preview")}
          </button>
          <button className="tb primary" onClick={onPrompt} title={t("action.prompt")}>
            <Icon name="text.bubble" size={15} /> {t("action.prompt")}
          </button>
        </div>
      </div>

      {toast ? <div className="toast">{toast}</div> : null}
      {manualLink ? (
        <div className="overlay" onPointerDown={(e) => e.target === e.currentTarget && setManualLink(null)}>
          <div className="modal">
            <div className="modal-head"><strong>{t("share.manualTitle")}</strong></div>
            <p className="modal-p">{t("share.manualBody")}</p>
            <textarea className="prompt-text share-link" readOnly value={manualLink} onFocus={(e) => e.currentTarget.select()} rows={4} />
            <div className="row-btns">
              <button className="mini primary" onClick={() => setManualLink(null)}>{t("action.close")}</button>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
