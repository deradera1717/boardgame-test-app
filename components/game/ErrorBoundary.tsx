/**
 * エラーバウンダリーコンポーネント
 * React コンポーネントツリー内のエラーをキャッチし、フォールバックUIを表示
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { GameError } from '../../types/game';
import { createGameError } from '../../utils/errorHandling';
import ErrorDisplay from './ErrorDisplay';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: GameError) => void;
}

interface State {
  hasError: boolean;
  error: GameError | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    // エラーが発生した場合の状態更新
    const gameError = createGameError(
      'system',
      `予期しないエラーが発生しました: ${error.message}`,
      undefined,
      {
        originalError: error.name,
        stack: error.stack
      }
    );

    return {
      hasError: true,
      error: gameError
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // エラーログの記録
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // 親コンポーネントにエラーを通知
    if (this.props.onError && this.state.error) {
      this.props.onError(this.state.error);
    }
  }

  handleRetry = () => {
    // エラー状態をリセット
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // カスタムフォールバックUIが提供されている場合はそれを使用
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // デフォルトのエラー表示
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="max-w-md w-full">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="text-center mb-4">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  申し訳ございません
                </h1>
                <p className="text-gray-600">
                  アプリケーションでエラーが発生しました
                </p>
              </div>

              <ErrorDisplay 
                error={this.state.error}
                className="mb-4"
              />

              <div className="flex flex-col space-y-3">
                <button
                  onClick={this.handleRetry}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                >
                  再試行
                </button>
                
                <button
                  onClick={() => window.location.reload()}
                  className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                >
                  ページを再読み込み
                </button>
              </div>

              {/* 開発環境でのみ詳細情報を表示 */}
              {process.env.NODE_ENV === 'development' && (
                <details className="mt-4">
                  <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
                    技術的な詳細（開発用）
                  </summary>
                  <div className="mt-2 p-3 bg-gray-100 rounded text-xs font-mono overflow-auto max-h-40">
                    <div className="mb-2">
                      <strong>エラータイプ:</strong> {this.state.error.type}
                    </div>
                    <div className="mb-2">
                      <strong>メッセージ:</strong> {this.state.error.message}
                    </div>
                    {this.state.error.context && (
                      <div>
                        <strong>コンテキスト:</strong>
                        <pre className="mt-1 whitespace-pre-wrap">
                          {JSON.stringify(this.state.error.context, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;