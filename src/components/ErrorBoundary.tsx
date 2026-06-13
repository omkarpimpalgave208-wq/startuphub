import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from './ui/Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleRefresh = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center px-4 bg-zinc-50 dark:bg-zinc-950">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-10 h-10 sm:w-12 sm:h-12 text-red-500" />
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white mb-2">
              Something Went Wrong
            </h1>
            
            <p className="text-zinc-600 dark:text-zinc-400 mb-2">
              We&apos;re sorry, but an unexpected error occurred.
            </p>
            
            {this.state.error && (
              <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/10 rounded-lg text-left">
                <p className="text-xs sm:text-sm text-red-600 dark:text-red-400 font-mono break-words">
                  {this.state.error.message}
                </p>
              </div>
            )}
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="outline" onClick={this.handleRefresh}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
              <a href="/">
                <Button variant="primary">
                  <Home className="w-4 h-4 mr-2" />
                  Go Home
                </Button>
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}