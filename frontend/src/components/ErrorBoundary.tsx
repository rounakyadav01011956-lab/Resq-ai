import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallbackTitle?: string
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo)
    this.setState({ errorInfo })
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
    window.location.reload()
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
          <div className="max-w-xl w-full bg-slate-900 border border-red-500/30 rounded-2xl p-8 shadow-2xl shadow-red-950/40">
            <div className="flex items-center gap-4 text-red-400 mb-4">
              <div className="p-3 bg-red-950/60 border border-red-500/40 rounded-xl">
                <AlertTriangle className="w-8 h-8 text-red-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  {this.props.fallbackTitle || 'Emergency System Error Intercepted'}
                </h2>
                <p className="text-xs text-red-300">
                  ResQ AI runtime boundary caught a visual or script exception without crashing the page.
                </p>
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 my-4 font-mono text-xs text-slate-300 overflow-x-auto max-h-48">
              <div className="text-red-400 font-semibold mb-1">
                {this.state.error?.name}: {this.state.error?.message}
              </div>
              <div className="text-slate-500 whitespace-pre-wrap">
                {this.state.errorInfo?.componentStack || this.state.error?.stack}
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={this.handleReset}
                className="flex items-center gap-2 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-medium transition cursor-pointer shadow-lg shadow-cyan-900/30"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Application
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
