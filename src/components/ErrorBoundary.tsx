import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to your logging service
    console.error('Error caught by boundary:', error);
    console.error('Error info:', errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 border border-red-300 bg-red-50 rounded-md">
          <h2 className="text-red-800 font-bold">Something went wrong</h2>
          <p className="text-red-600">Please refresh the page and try again</p>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 