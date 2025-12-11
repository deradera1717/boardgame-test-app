/**
 * ゲーム永続化フック
 * ゲーム状態の自動保存、ログ記録、統計更新を管理
 */

import { useEffect, useCallback } from 'react';
import { GameSession } from '../types/game';
import {
  saveGameToLocalStorage,
  loadGameFromLocalStorage,
  logGameAction,
  updateGameStatistics,
  validateGameState,
  exportGameDataForAnalysis
} from '../utils/dataPersistence';

export interface UseGamePersistenceOptions {
  autoSave?: boolean;
  logActions?: boolean;
  updateStats?: boolean;
}

export const useGamePersistence = (
  gameSession: GameSession | null,
  options: UseGamePersistenceOptions = {}
) => {
  const {
    autoSave = true,
    logActions = true,
    updateStats = true
  } = options;

  // ゲーム状態の自動保存
  useEffect(() => {
    if (autoSave && gameSession && validateGameState(gameSession)) {
      try {
        saveGameToLocalStorage(gameSession);
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    }
  }, [gameSession, autoSave]);

  // 統計の自動更新
  useEffect(() => {
    if (updateStats && gameSession) {
      try {
        updateGameStatistics(gameSession);
      } catch (error) {
        console.error('Statistics update failed:', error);
      }
    }
  }, [gameSession?.currentPhase, gameSession?.currentRound, updateStats]);

  // 保存されたゲームを読み込み
  const loadSavedGame = useCallback((): GameSession | null => {
    try {
      return loadGameFromLocalStorage();
    } catch (error) {
      console.error('Failed to load saved game:', error);
      return null;
    }
  }, []);

  // 手動保存
  const saveGame = useCallback((session: GameSession): boolean => {
    try {
      if (!validateGameState(session)) {
        console.error('Invalid game state, cannot save');
        return false;
      }
      
      saveGameToLocalStorage(session);
      return true;
    } catch (error) {
      console.error('Manual save failed:', error);
      return false;
    }
  }, []);

  // アクションログ記録
  const logAction = useCallback((
    action: string,
    details: any,
    playerId?: string,
    result?: any
  ) => {
    if (logActions && gameSession) {
      try {
        logGameAction(
          gameSession.id,
          gameSession.currentRound,
          gameSession.currentPhase,
          action,
          details,
          playerId,
          result
        );
      } catch (error) {
        console.error('Action logging failed:', error);
      }
    }
  }, [gameSession, logActions]);

  // データエクスポート
  const exportGameData = useCallback((gameId?: string): string | null => {
    try {
      return exportGameDataForAnalysis(gameId);
    } catch (error) {
      console.error('Data export failed:', error);
      return null;
    }
  }, []);

  // ゲーム状態の検証
  const isGameStateValid = useCallback((session: GameSession): boolean => {
    return validateGameState(session);
  }, []);

  return {
    loadSavedGame,
    saveGame,
    logAction,
    exportGameData,
    isGameStateValid
  };
};