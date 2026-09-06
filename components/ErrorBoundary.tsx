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
      return (
        <div className="crash" role="alert">
          <h1>The editor hit an unexpected error</h1>
          <p>Your work is still in this browser (localStorage) and nothing was lost by this error.</p>
          <pre>{this.state.error.message}</pre>
          <button
            onClick={() => {
              this.setState({ error: null });
              location.reload();
            }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
