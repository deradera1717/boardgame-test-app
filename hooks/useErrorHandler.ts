/**
 * エラーハンドリング用カスタムフック
 * ゲーム内でのエラー管理、表示、回復機能を提供
 */

import { useState, useCallback, useRef } from 'react';
import { GameError, GameSession } from '../types/game';
import { 
  createGameError, 
  executeErrorRecovery, 
  isOperationSafe,
  validateGameStateConsistency 
} from '../utils/errorHandling';

interface UseErrorHandlerReturn {
  currentError: GameError | null;
  errorHistory: GameError[];
  showError: (error: GameError) => void;
  clearError: () => void;
  clearAllErrors: () => void;
  validateOperation: (operation: string, gameSession: GameSession, params?: any) => boolean;
  safeExecute: <T>(
    operation: () => T,
    fallback?: T,
    context?: any
  ) => T;
  recoverFromError: (gameSession: GameSession, error: GameError) => {
    recoveredSession: GameSession;
    recoveryAction: string;
  };
  validateGameState: (gameSession: GameSession) => GameError[];
}

export const useErrorHandler = (): UseErrorHandlerReturn => {
  const [currentError, setCurrentError] = useState<GameError | null>(null);
  const [errorHistory, setErrorHistory] = useState<GameError[]>([]);
  const errorTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * エラーを表示（自動消去タイマー付き）
   */
  const showError = useCallback((error: GameError) => {
    setCurrentError(error);
    setErrorHistory(prev => [...prev, error]);

    // 前のタイマーをクリア
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
    }

    // ユーザー入力エラーは5秒後に自動消去
    if (error.type === 'user-input') {
      errorTimeoutRef.current = setTimeout(() => {
        setCurrentError(null);
      }, 5000);
    }
  }, []);

  /**
   * 現在のエラーをクリア
   */
  const clearError = useCallback(() => {
    setCurrentError(null);
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = null;
    }
  }, []);

  /**
   * 全てのエラーをクリア
   */
  const clearAllErrors = useCallback(() => {
    setCurrentError(null);
    setErrorHistory([]);
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = null;
    }
  }, []);

  /**
   * 操作の安全性を検証
   */
  const validateOperation = useCallback((
    operation: string,
    gameSession: GameSession,
    params?: any
  ): boolean => {
    const { safe, error } = isOperationSafe(operation, gameSession, params);
    
    if (!safe && error) {
      showError(error);
      return false;
    }
    
    return true;
  }, [showError]);

  /**
   * 安全な実行（エラーハンドリング付き）
   */
  const safeExecute = useCallback(<T>(
    operation: () => T,
    fallback?: T,
    context?: any
  ): T => {
    try {
      return operation();
    } catch (error) {
      const gameError = createGameError(
        'system',
        error instanceof Error ? error.message : '不明なエラーが発生しました',
        undefined,
        { ...context, originalError: error }
      );
      
      showError(gameError);
      
      if (fallback !== undefined) {
        return fallback;
      }
      
      throw error;
    }
  }, [showError]);

  /**
   * エラーからの回復処理
   */
  const recoverFromError = useCallback((
    gameSession: GameSession,
    error: GameError
  ) => {
    return executeErrorRecovery(gameSession, error);
  }, []);

  /**
   * ゲーム状態の検証
   */
  const validateGameState = useCallback((gameSession: GameSession): GameError[] => {
    return validateGameStateConsistency(gameSession);
  }, []);

  return {
    currentError,
    errorHistory,
    showError,
    clearError,
    clearAllErrors,
    validateOperation,
    safeExecute,
    recoverFromError,
    validateGameState
  };
};