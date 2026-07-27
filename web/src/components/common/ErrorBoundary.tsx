import { Component, ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Custom fallback UI. Defaults to a full-page "something went wrong" screen. */
  fallback?: (error: Error) => ReactNode;
  /** When this value changes, a previously-tripped boundary resets and retries rendering
   *  its children — used so a single bad camera tile can recover on its own (e.g. once the
   *  camera comes back online) instead of staying dead until a full page reload. */
  resetKey?: unknown;
}

interface ErrorBoundaryState {
  error: Error | null;
}

// Without this, any uncaught render error anywhere in the tree unmounts the whole app to a
// blank white page with nothing in the UI explaining why. This catches it and offers a reload
// instead, and logs the error so it's visible in the browser console for debugging.
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("Unhandled UI error:", error, info.componentStack);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback(this.state.error);
      return (
        <div className="flex h-screen w-screen flex-col items-center justify-center gap-4 bg-surface-950 p-6 text-center">
          <h1 className="text-lg font-semibold text-surface-100">Something went wrong</h1>
          <p className="max-w-md text-sm text-surface-400">
            The page hit an unexpected error and couldn't continue rendering. Reloading usually fixes it.
          </p>
          <pre className="max-w-lg overflow-x-auto rounded-md border border-surface-800 bg-surface-900 p-3 text-left text-xs text-danger-soft">
            {this.state.error.message}
          </pre>
          <button className="btn-primary" onClick={() => window.location.reload()}>
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
