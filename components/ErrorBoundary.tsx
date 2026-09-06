"use client";

import React from "react";

/* Last-resort error boundary: a rendering crash (from a bad file, a share
 * link, anything) shows a readable panel instead of a white screen. */

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    // keep the console signal; the UI stays alive
    console.error("SwiftUI Canvas crashed while rendering:", error);
  }

  render() {
    if (this.state.error) {
      // the editor's React tree is down, so read the language pref directly
      const zh = (() => {
        try {
          return localStorage.getItem("swiftui-canvas.lang") === "zh";
        } catch {
          return false;
        }
      })();
      return (
        <div className="crash" role="alert">
          <h1>{zh ? "编辑器遇到了意外错误" : "The editor hit an unexpected error"}</h1>
          <p>
            {zh
              ? "你的工作仍保存在此浏览器（localStorage）中，这次错误没有造成任何丢失。"
              : "Your work is still in this browser (localStorage) and nothing was lost by this error."}
          </p>
          <pre>{this.state.error.message}</pre>
          <button
            onClick={() => {
              this.setState({ error: null });
              location.reload();
            }}
          >
            {zh ? "重新载入" : "Reload"}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
