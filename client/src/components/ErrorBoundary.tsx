import React from 'react';

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#991b1b' }}>
          <h2>Что-то пошло не так</h2>
          <pre style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>{this.state.error?.message}</pre>
          <button
            style={{ marginTop: '1rem', padding: '0.5rem 1rem', cursor: 'pointer' }}
            onClick={() => this.setState({ hasError: false })}
          >
            Попробовать снова
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
