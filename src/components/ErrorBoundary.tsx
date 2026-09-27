/**
 * Error Boundary Component
 * Catches and displays errors with user-friendly messages
 */

import React, { ReactNode, useState } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, retry: () => void) => ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleRetry);
      }

      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-lg border border-gray-200 p-8">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
              <div className="flex-1">
                <h2 className="font-heading text-lg text-foreground mb-2">
                  Something went wrong
                </h2>
                <p className="font-paragraph text-sm text-muted-grey-foreground mb-4">
                  {this.state.error.message || 'An unexpected error occurred'}
                </p>
                <div className="flex gap-3">
                  <Button
                    onClick={this.handleRetry}
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    Try Again
                  </Button>
                  <Button
                    onClick={() => window.location.href = '/'}
                    variant="outline"
                  >
                    Go Home
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Error Alert Component for inline errors
 */
export function ErrorAlert({
  error,
  onDismiss,
}: {
  error: Error | string | null;
  onDismiss?: () => void;
}) {
  if (!error) return null;

  const message = typeof error === 'string' ? error : error.message;

  return (
    <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4 flex items-start gap-3 mb-4">
      <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="font-paragraph text-sm text-destructive">{message}</p>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="flex-shrink-0 text-destructive hover:text-destructive/80"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
