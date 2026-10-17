import { Component, type ReactNode } from 'react';
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <main className="empty-state" role="alert">
          <h2>Let’s get back on track.</h2>
          <p>The interface couldn’t finish loading. Your saved plans stay on this device.</p>
          <button className="button primary" onClick={() => location.reload()}>
            Reopen Bell Work
          </button>
        </main>
      );
    return this.props.children;
  }
}
