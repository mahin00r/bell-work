import { t } from '../i18n';
import { Component, type ReactNode } from 'react';
export class ErrorBoundary extends Component<
  {
    children: ReactNode;
  },
  {
    failed: boolean;
  }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <main className="empty-state" role="alert">
          <h2>{t('Let\u2019s get back on track.')}</h2>
          <p>
            {t('The interface couldn\u2019t finish loading. Your saved plans stay on this device.')}
          </p>
          <button className="button primary" onClick={() => location.reload()}>
            {t('Reopen Bell Work')}
          </button>
        </main>
      );
    return this.props.children;
  }
}
