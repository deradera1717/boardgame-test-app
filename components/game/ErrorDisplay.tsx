/**
 * エラーメッセージ表示コンポーネント
 * ユーザーに分かりやすい形でエラー情報を表示
 */

import React from 'react';
import { GameError } from '../../types/game';
import { getErrorSeverity, getLocalizedErrorMessage } from '../../utils/errorHandling';

interface ErrorDisplayProps {
  error: GameError | null;
  onDismiss?: () => void;
  className?: string;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ error, onDismiss, className = '' }) => {
  if (!error) return null;

  const severity = getErrorSeverity(error);
  const message = getLocalizedErrorMessage(error);

  // 重要度に応じたスタイリング
  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 border-red-500 text-red-800';
      case 'high':
        return 'bg-red-50 border-red-400 text-red-700';
      case 'medium':
        return 'bg-yellow-50 border-yellow-400 text-yellow-700';
      case 'low':
        return 'bg-blue-50 border-blue-400 text-blue-700';
      default:
        return 'bg-gray-50 border-gray-400 text-gray-700';
    }
  };

  // 重要度に応じたアイコン
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return '🚨';
      case 'high':
        return '⚠️';
      case 'medium':
        return '⚡';
      case 'low':
        return 'ℹ️';
      default:
        return '📝';
    }
  };

  return (
    <div className={`border-l-4 p-4 mb-4 rounded-r-lg ${getSeverityStyles(severity)} ${className}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0 mr-3 text-lg">
          {getSeverityIcon(severity)}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">
              {severity === 'critical' && 'システムエラー'}
              {severity === 'high' && 'エラー'}
              {severity === 'medium' && '警告'}
              {severity === 'low' && '情報'}
            </h3>
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="ml-4 text-sm underline hover:no-underline focus:outline-none"
                aria-label="エラーメッセージを閉じる"
              >
                ✕
              </button>
            )}
          </div>
          <p className="mt-1 text-sm">{message}</p>
          
          {/* デバッグ情報（開発環境でのみ表示） */}
          {process.env.NODE_ENV === 'development' && error.context && (
            <details className="mt-2">
              <summary className="text-xs cursor-pointer hover:underline">
                詳細情報（開発用）
              </summary>
              <pre className="mt-1 text-xs bg-white bg-opacity-50 p-2 rounded overflow-auto">
                {JSON.stringify(error.context, null, 2)}
              </pre>
            </details>
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrorDisplay;