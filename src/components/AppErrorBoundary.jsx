import React from 'react';
import { RotateCcw } from 'lucide-react';

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 flex items-center justify-center p-6 bg-background">
          <div className="max-w-sm text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto">
              <RotateCcw className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <p className="font-serif text-2xl font-light tracking-wide">Something went wrong</p>
              <p className="text-sm text-muted-foreground mt-2">{this.state.error?.message || 'An unexpected error occurred'}</p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors min-h-[44px]"
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}