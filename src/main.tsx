import { Component, StrictMode, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { initNativeShell } from "./native/initNative";

void initNativeShell();

class HomeBootBoundary extends Component<{ children: ReactNode }, { message: string | null }> {
  state = { message: null as string | null };

  static getDerivedStateFromError(error: unknown) {
    const message = error instanceof Error ? error.message : "unknown error";
    return { message };
  }

  render() {
    if (this.state.message) {
      return (
        <p id="plainstep-boot" style={{ margin: 0, padding: "48px 24px", color: "#f3f4f5", fontSize: 17 }}>
          Plainstep could not draw the home screen: {this.state.message}
        </p>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HomeBootBoundary>
      <App />
    </HomeBootBoundary>
  </StrictMode>,
);
