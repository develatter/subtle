import { Component, type ErrorInfo, type ReactNode } from "react";
import { translate } from "../../../i18n";

type Props = { children: ReactNode };
type State = { error: Error | null };

/**
 * Last line of defence: a render error shows a message instead of a blank
 * window. The project is autosaved on every change, so reloading is safe.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="crash" role="alert">
        <h1>{translate("crash.title")}</h1>
        <p>{translate("crash.help")}</p>
        <pre>{String(this.state.error)}</pre>
        <button className="primary" onClick={() => location.reload()}>
          {translate("crash.reload")}
        </button>
      </div>
    );
  }
}
