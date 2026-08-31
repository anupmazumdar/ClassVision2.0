import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[ClassVision ErrorBoundary Caught Exception]:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    sessionStorage.clear();
    localStorage.removeItem("cv_token");
    localStorage.removeItem("cv_user");
    window.location.href = "/login";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4 text-center">
          <div className="card max-w-md w-full border-red-800/60 bg-red-950/20 p-6 space-y-4">
            <div className="flex justify-center">
              <div className="p-3 bg-red-900/30 rounded-2xl border border-red-700/50 text-red-400">
                <AlertCircle size={36} />
              </div>
            </div>
            <h1 className="text-xl font-bold text-gray-100">Something went wrong</h1>
            <p className="text-sm text-gray-400 leading-relaxed">
              An unexpected client error occurred while rendering the page.
            </p>
            {this.state.error?.message && (
              <div className="p-3 bg-gray-900/80 border border-gray-800 rounded-lg text-xs font-mono text-red-300 text-left overflow-x-auto max-h-32">
                {this.state.error.message}
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <button
                onClick={this.handleReload}
                className="btn-primary flex-1 flex items-center justify-center gap-1.5 text-xs py-2"
              >
                <RefreshCw size={14} /> Reload Page
              </button>
              <button
                onClick={this.handleReset}
                className="btn-secondary flex-1 text-xs py-2"
              >
                Go to Login
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
