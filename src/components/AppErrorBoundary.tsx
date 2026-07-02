import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
};

export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('App crashed:', error, info);
  }

  private handleReload = () => {
    window.location.reload();
  };

  override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
          <div className="max-w-lg w-full rounded-3xl border border-slate-200 bg-white shadow-xl p-6 sm:p-8 text-center">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-[#1A6B8A]/10 text-[#1A6B8A] flex items-center justify-center text-2xl font-black">
              K
            </div>
            <h1 className="mt-4 text-2xl font-black text-slate-900">Something went wrong</h1>
            <p className="mt-2 text-slate-600 leading-relaxed">
              The app hit a startup error, so we stopped the blank screen and showed this recovery page instead.
              Reloading usually clears stale cached state in offline-ready apps.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleReload}
                className="px-5 py-3 rounded-2xl bg-[#1A6B8A] text-white font-bold hover:bg-[#14556e] transition-colors"
              >
                Reload app
              </button>
              <button
                onClick={() => {
                  try {
                    localStorage.clear();
                    sessionStorage.clear();
                  } finally {
                    window.location.reload();
                  }
                }}
                className="px-5 py-3 rounded-2xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-colors"
              >
                Clear saved state
              </button>
            </div>
            <p className="mt-4 text-xs text-slate-400">
              If you still see this, the browser may need a hard refresh to drop an old service worker cache.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
