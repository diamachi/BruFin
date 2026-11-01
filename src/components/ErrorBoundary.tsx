import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Trash2 } from 'lucide-react';
import { clearAllData } from '../utils/storage';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = async () => {
    if (confirm('Reset BruFin and permanently delete its saved financial data on this device? Other sites’ data will be kept.')) {
      try {
        await clearAllData();
        window.location.reload();
      } catch (error) {
        console.error('Could not reset local data', error);
        alert('BruFin could not reset its local database. Please try again.');
      }
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F7F6F3] dark:bg-[#1B1E22] text-[#59171B] dark:text-[#F2F3F5] flex items-center justify-center p-6 font-sans">
          <div className="w-full max-w-md bg-white dark:bg-[#22252A] border-2 border-[#E8E1DB] dark:border-[#363B44] rounded-3xl p-6 shadow-2xl space-y-4 text-center">
            <div className="w-14 h-14 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                Something went wrong
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                An unexpected error prevented the page from rendering properly.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#1B1E22] border border-rose-200 dark:border-rose-900/60 text-left overflow-x-auto text-[11px] font-mono text-rose-600 dark:text-rose-400">
                <p className="font-bold">{this.state.error.name}: {this.state.error.message}</p>
                {this.state.error.stack && (
                  <p className="mt-1 text-[10px] text-slate-400 whitespace-pre-wrap truncate">
                    {this.state.error.stack.split('\n').slice(0, 4).join('\n')}
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-2.5 pt-2">
              <button
                onClick={this.handleReload}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#EF6448] hover:bg-[#E05338] text-white font-black text-xs shadow-md flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reload Page</span>
              </button>

              <button
                onClick={this.handleReset}
                className="py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-[#1B1E22] hover:bg-rose-50 text-slate-600 dark:text-slate-300 hover:text-rose-600 text-xs font-bold transition-all flex items-center gap-1"
                title="Reset cache and data"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
