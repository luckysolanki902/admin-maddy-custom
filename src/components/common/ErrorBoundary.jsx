// A lightweight React Error Boundary to isolate errors to a single widget/component
// Usage:
// <ErrorBoundary fallbackRender={({ error, resetErrorBoundary }) => (
//   <YourFallback onRetry={resetErrorBoundary} error={error} />
// )}>
//   <PossiblyBuggyChart />
// </ErrorBoundary>

import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Optionally log error to a monitoring service
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line no-console
      console.error('[ErrorBoundary] component error:', error, info);
    }
  }

  componentDidUpdate(prevProps) {
    // Reset on resetKeys change (mimics react-error-boundary behavior)
    const { resetKeys } = this.props;
    if (
      this.state.hasError &&
      resetKeys &&
      prevProps.resetKeys &&
      (resetKeys.length !== prevProps.resetKeys.length ||
        resetKeys.some((item, index) => item !== prevProps.resetKeys[index]))
    ) {
      this.resetErrorBoundary();
    }
  }

  resetErrorBoundary = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    const { hasError, error } = this.state;
    const { children, fallbackRender } = this.props;

    if (hasError) {
      if (typeof fallbackRender === 'function') {
        return fallbackRender({ error, resetErrorBoundary: this.resetErrorBoundary });
      }
      // Basic fallback if none provided
      return (
        <div style={{ padding: 16, border: '1px solid rgba(255,0,0,0.2)', borderRadius: 8, background: 'rgba(255,0,0,0.06)' }}>
          <strong>Something went wrong in this widget.</strong>
          <div style={{ marginTop: 8 }}>
            <button onClick={this.resetErrorBoundary} style={{ padding: '6px 10px', cursor: 'pointer' }}>Retry</button>
          </div>
        </div>
      );
    }

    return children;
  }
}
