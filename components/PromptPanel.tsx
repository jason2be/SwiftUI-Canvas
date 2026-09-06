"use client";

import React, { useMemo, useState } from "react";
import Icon from "@/components/Icon";
import { getT } from "@/lib/i18n";
import { buildPrompt, type PromptScope } from "@/lib/prompt";
import type { Editor } from "@/lib/store";

/* The prompt modal: the design as a SwiftUI brief, en/zh, whole design or one screen. */

interface Props {
  editor: Editor;
  onClose: () => void;
}

export default function PromptPanel({ editor, onClose }: Props) {
  const { doc, lang, activeScreen } = editor;
  const t = getT(lang);
  const [scope, setScope] = useState<PromptScope>({ kind: "all" });
  const [promptLang, setPromptLang] = useState<"en" | "zh">(doc.lang);
  const [copied, setCopied] = useState(false);

  const text = useMemo(
    () => buildPrompt(doc, activeScreen && scope.kind === "screen" ? { kind: "screen", id: activeScreen } : scope, promptLang),
    [doc, scope, promptLang, activeScreen]
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // clipboard blocked; the text stays selectable in the textarea
    }
  };

  return (
    <div className="overlay" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-prompt" role="dialog" aria-label={t("prompt.title")}>
        <div className="modal-head">
          <strong>{t("prompt.title")}</strong>
          <div className="seg">
            <button className={scope.kind === "all" ? "on" : ""} onClick={() => setScope({ kind: "all" })}>{t("prompt.scopeAll")}</button>
            <button
              className={scope.kind === "screen" ? "on" : ""}
              disabled={!activeScreen}
              onClick={() => activeScreen && setScope({ kind: "screen", id: activeScreen })}
            >
              {t("prompt.scopeScreen")}
            </button>
          </div>
          <div className="seg">
            {(["en", "zh"] as const).map((l) => (
              <button key={l} className={promptLang === l ? "on" : ""} onClick={() => setPromptLang(l)}>
                {l === "en" ? "English" : "中文"}
              </button>
            ))}
          </div>
          <button className="mini primary" onClick={copy}>{copied ? t("action.copied") : t("action.copy")}</button>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="xmark" size={14} /></button>
        </div>
        <textarea className="prompt-text" readOnly value={text} spellCheck={false} />
        <div className="modal-foot">
          <span className="hint">{t("prompt.hint")}</span>
        </div>
      </div>
    </div>
  );
}
