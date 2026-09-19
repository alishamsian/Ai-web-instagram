"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import Link from "next/link";

type Props = {
  children: ReactNode;
  locale: string;
  websiteId: string;
};

type State = { error: Error | null };

export class VisualEditorErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[visual-editor]", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    const { locale, websiteId } = this.props;
    return (
      <div className="ve-error" role="alert">
        <h1 style={{ fontSize: 18, margin: 0 }}>Visual editor failed to initialize</h1>
        <p style={{ color: "#8a8a93", maxWidth: 420, margin: 0 }}>
          {this.state.error.message || "An unexpected error occurred."}
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
          <button
            type="button"
            className="ve-btn ve-btn--primary"
            onClick={() => this.setState({ error: null })}
          >
            Retry
          </button>
          <Link
            href={`/${locale}/editor/${websiteId}`}
            className="ve-btn"
            style={{ textDecoration: "none" }}
          >
            Open Classic Editor
          </Link>
        </div>
      </div>
    );
  }
}
