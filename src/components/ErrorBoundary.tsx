'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
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
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-2xl border border-red-200 bg-red-50/60 p-6 text-center space-y-4 my-4 shadow-sm">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-red-900">
              {this.props.fallbackTitle || 'Une erreur est survenue lors de l’affichage de cet écran'}
            </h3>
            <p className="text-xs text-red-700 font-mono max-w-xl mx-auto break-words bg-red-100/50 p-2.5 rounded-lg">
              {this.state.error?.message || 'Erreur d’exécution du composant client'}
            </p>
          </div>
          <div>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                if (this.props.onReset) this.props.onReset();
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 transition shadow-sm cursor-pointer"
            >
              <RotateCw className="h-3.5 w-3.5" />
              <span>Réinitialiser la vue</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
