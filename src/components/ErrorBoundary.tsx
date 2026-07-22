import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-zinc-900 border border-gold/30 rounded-2xl p-6 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 bg-amber-500/10 border border-gold/40 rounded-full flex items-center justify-center mx-auto text-gold">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>
            
            <div className="space-y-1">
              <h2 className="text-base font-black uppercase tracking-wider text-gold">
                Recuperação Automática de Interface
              </h2>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Ocorreu uma oscilação na renderização. Seus dados e análises foram preservados em segurança.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-800 text-[10px] font-mono text-zinc-500 max-h-24 overflow-y-auto text-left">
                {this.state.error.message}
              </div>
            )}

            <button
              onClick={this.handleReset}
              className="w-full py-2.5 px-4 bg-gold text-black font-black text-xs uppercase tracking-wider rounded-xl hover:bg-gold-hover transition-all cursor-pointer shadow-lg flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Recarregar Aplicativo
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
