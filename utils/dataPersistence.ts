/**
 * データ永続化とログ記録システム
 * ゲーム状態のシリアライゼーション、ローカルストレージ管理、ログ記録機能を提供
 */

import { GameSession, Player, RoundResult, GameState, GameLogEntry } from '../types/game';

// ローカルストレージのキー定義
export const STORAGE_KEYS = {
  CURRENT_GAME: 'oshi-game-current-session',
  GAME_HISTORY: 'oshi-game-history',
  GAME_LOGS: 'oshi-game-logs',
  GAME_STATISTICS: 'oshi-game-statistics'
} as const;

// ログエントリの型定義は types/game.ts から import

// ゲーム履歴の型定義
export interface GameHistoryEntry {
  gameId: string;
  startTime: Date;
  endTime?: Date;
  players: { id: string; name: string }[];
  finalScores?: { playerId: string; playerName: string; totalPoints: number; totalMoney: number }[];
  totalRounds: number;
  gameStatus: 'in-progress' | 'completed' | 'abandoned';
}

// 統計データの型定義
export interface GameStatistics {
  totalGamesPlayed: number;
  totalGamesCompleted: number;
  averageGameDuration: number; // 分単位
  playerStats: {
    [playerId: string]: {
      gamesPlayed: number;
      gamesWon: number;
      averageScore: number;
      totalPoints: number;
    };
  };
  roundStats: {
    averagePointsPerRound: number;
    mostCommonWinningScore: number;
    laborPhaseStats: {
      [cardName: string]: {
        timesSelected: number;
        averageReward: number;
      };
    };
  };
}

/**
 * ゲーム状態をJSON形式でシリアライズ
 */
export const serializeGameState = (gameSession: GameSession): string => {
  try {
    // Date オブジェクトの有効性をチェック
    if (!gameSession.createdAt || isNaN(gameSession.createdAt.getTime())) {
      throw new Error('Invalid createdAt date');
    }

    // Date オブジェクトを ISO 文字列に変換
    const serializable = {
      ...gameSession,
      createdAt: gameSession.createdAt.toISOString(),
      // ネストされた Date オブジェクトがあれば変換
      gameState: {
        ...gameSession.gameState,
        roundHistory: gameSession.gameState.roundHistory.map(round => ({
          ...round,
          // 必要に応じて Date フィールドを変換
        }))
      }
    };

    return JSON.stringify(serializable, null, 2);
  } catch (error) {
    throw new Error(`Failed to serialize game state: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * JSON文字列からゲーム状態をデシリアライズ
 */
export const deserializeGameState = (jsonString: string): GameSession => {
  try {
    if (!jsonString || typeof jsonString !== 'string') {
      throw new Error('Invalid input: expected non-empty string');
    }
    
    const parsed = JSON.parse(jsonString);
    
    // 必須フィールドの存在チェック
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid JSON: expected object');
    }
    
    if (!parsed.id || !parsed.players || !parsed.gameState || !parsed.createdAt) {
      throw new Error('Invalid game session: missing required fields');
    }
    
    // ISO 文字列を Date オブジェクトに変換
    return {
      ...parsed,
      createdAt: new Date(parsed.createdAt),
      // 必要に応じて他の Date フィールドも変換
    };
  } catch (error) {
    throw new Error(`Failed to deserialize game state: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * ローカルストレージにゲーム状態を保存
 */
export const saveGameToLocalStorage = (gameSession: GameSession): void => {
  try {
    const serializedGame = serializeGameState(gameSession);
    localStorage.setItem(STORAGE_KEYS.CURRENT_GAME, serializedGame);
    
    // ゲーム履歴も更新
    updateGameHistory(gameSession);
  } catch (error) {
    console.error('Failed to save game to localStorage:', error);
    throw new Error('ゲームの保存に失敗しました');
  }
};

/**
 * ローカルストレージからゲーム状態を読み込み
 */
export const loadGameFromLocalStorage = (): GameSession | null => {
  try {
    const savedGame = localStorage.getItem(STORAGE_KEYS.CURRENT_GAME);
    if (!savedGame) {
      return null;
    }
    
    return deserializeGameState(savedGame);
  } catch (error) {
    console.error('Failed to load game from localStorage:', error);
    // 破損したデータをクリア
    localStorage.removeItem(STORAGE_KEYS.CURRENT_GAME);
    return null;
  }
};

/**
 * ゲーム履歴を更新
 */
export const updateGameHistory = (gameSession: GameSession): void => {
  try {
    const existingHistory = getGameHistory();
    const existingEntryIndex = existingHistory.findIndex(entry => entry.gameId === gameSession.id);
    
    const historyEntry: GameHistoryEntry = {
      gameId: gameSession.id,
      startTime: gameSession.createdAt,
      endTime: gameSession.currentPhase === 'game-end' ? new Date() : undefined,
      players: gameSession.players.map(p => ({ id: p.id, name: p.name })),
      totalRounds: gameSession.currentRound,
      gameStatus: gameSession.currentPhase === 'game-end' ? 'completed' : 'in-progress'
    };
    
    if (existingEntryIndex >= 0) {
      existingHistory[existingEntryIndex] = historyEntry;
    } else {
      existingHistory.push(historyEntry);
    }
    
    // 最新の50ゲームのみ保持
    const trimmedHistory = existingHistory.slice(-50);
    
    localStorage.setItem(STORAGE_KEYS.GAME_HISTORY, JSON.stringify(trimmedHistory));
  } catch (error) {
    console.error('Failed to update game history:', error);
  }
};

/**
 * ゲーム履歴を取得
 */
export const getGameHistory = (): GameHistoryEntry[] => {
  try {
    const historyJson = localStorage.getItem(STORAGE_KEYS.GAME_HISTORY);
    if (!historyJson) {
      return [];
    }
    
    const history = JSON.parse(historyJson);
    // Date オブジェクトを復元
    return history.map((entry: any) => ({
      ...entry,
      startTime: new Date(entry.startTime),
      endTime: entry.endTime ? new Date(entry.endTime) : undefined
    }));
  } catch (error) {
    console.error('Failed to get game history:', error);
    return [];
  }
};

/**
 * ゲームログエントリを記録
 */
export const logGameAction = (
  gameId: string,
  roundNumber: number,
  phase: string,
  action: string,
  details: any,
  playerId?: string | null,
  result?: any
): void => {
  try {
    const logEntry: GameLogEntry = {
      timestamp: new Date(),
      action,
      playerId,
      data: { details, result, gameId },
      roundNumber,
      phase: phase as any // GamePhase type conversion
    };
    
    const existingLogs = getGameLogs(gameId);
    existingLogs.push(logEntry);
    
    // ゲームごとにログを保存
    const gameLogsKey = `${STORAGE_KEYS.GAME_LOGS}-${gameId}`;
    localStorage.setItem(gameLogsKey, JSON.stringify(existingLogs));
    
    // 全体のログインデックスも更新
    updateLogIndex(gameId);
  } catch (error) {
    console.error('Failed to log game action:', error);
  }
};

/**
 * 特定ゲームのログを取得
 */
export const getGameLogs = (gameId: string): GameLogEntry[] => {
  try {
    const gameLogsKey = `${STORAGE_KEYS.GAME_LOGS}-${gameId}`;
    const logsJson = localStorage.getItem(gameLogsKey);
    if (!logsJson) {
      return [];
    }
    
    const logs = JSON.parse(logsJson);
    // Date オブジェクトを復元
    return logs.map((log: any) => ({
      ...log,
      timestamp: new Date(log.timestamp)
    }));
  } catch (error) {
    console.error('Failed to get game logs:', error);
    return [];
  }
};

/**
 * ログインデックスを更新（どのゲームにログがあるかを管理）
 */
const updateLogIndex = (gameId: string): void => {
  try {
    const indexKey = `${STORAGE_KEYS.GAME_LOGS}-index`;
    const existingIndex = JSON.parse(localStorage.getItem(indexKey) || '[]');
    
    if (!existingIndex.includes(gameId)) {
      existingIndex.push(gameId);
      localStorage.setItem(indexKey, JSON.stringify(existingIndex));
    }
  } catch (error) {
    console.error('Failed to update log index:', error);
  }
};

/**
 * 統計データを計算・更新
 */
export const updateGameStatistics = (gameSession: GameSession): void => {
  try {
    const existingStats = getGameStatistics();
    
    // 基本統計を更新
    existingStats.totalGamesPlayed += 1;
    if (gameSession.currentPhase === 'game-end') {
      existingStats.totalGamesCompleted += 1;
    }
    
    // プレイヤー統計を更新
    gameSession.players.forEach(player => {
      if (!existingStats.playerStats[player.id]) {
        existingStats.playerStats[player.id] = {
          gamesPlayed: 0,
          gamesWon: 0,
          averageScore: 0,
          totalPoints: 0
        };
      }
      
      const playerStats = existingStats.playerStats[player.id];
      playerStats.gamesPlayed += 1;
      playerStats.totalPoints += player.points;
      playerStats.averageScore = playerStats.totalPoints / playerStats.gamesPlayed;
    });
    
    // ラウンド統計を更新
    if (gameSession.gameState.roundHistory.length > 0) {
      const totalPoints = gameSession.players.reduce((sum, p) => sum + p.points, 0);
      const currentAverage = existingStats.roundStats.averagePointsPerRound;
      const gamesCount = existingStats.totalGamesPlayed;
      
      existingStats.roundStats.averagePointsPerRound = 
        (currentAverage * (gamesCount - 1) + totalPoints) / gamesCount;
      
      // 労働フェーズ統計を更新
      gameSession.gameState.roundHistory.forEach(round => {
        round.laborResults.forEach(result => {
          const cardName = result.selectedCard;
          if (!existingStats.roundStats.laborPhaseStats[cardName]) {
            existingStats.roundStats.laborPhaseStats[cardName] = {
              timesSelected: 0,
              averageReward: 0
            };
          }
          
          const cardStats = existingStats.roundStats.laborPhaseStats[cardName];
          const newTotal = cardStats.averageReward * cardStats.timesSelected + result.reward;
          cardStats.timesSelected += 1;
          cardStats.averageReward = newTotal / cardStats.timesSelected;
        });
      });
    }
    
    localStorage.setItem(STORAGE_KEYS.GAME_STATISTICS, JSON.stringify(existingStats));
  } catch (error) {
    console.error('Failed to update game statistics:', error);
  }
};

/**
 * 統計データを取得
 */
export const getGameStatistics = (): GameStatistics => {
  try {
    const statsJson = localStorage.getItem(STORAGE_KEYS.GAME_STATISTICS);
    if (!statsJson) {
      return {
        totalGamesPlayed: 0,
        totalGamesCompleted: 0,
        averageGameDuration: 0,
        playerStats: {},
        roundStats: {
          averagePointsPerRound: 0,
          mostCommonWinningScore: 0,
          laborPhaseStats: {}
        }
      };
    }
    
    return JSON.parse(statsJson);
  } catch (error) {
    console.error('Failed to get game statistics:', error);
    return {
      totalGamesPlayed: 0,
      totalGamesCompleted: 0,
      averageGameDuration: 0,
      playerStats: {},
      roundStats: {
        averagePointsPerRound: 0,
        mostCommonWinningScore: 0,
        laborPhaseStats: {}
      }
    };
  }
};

/**
 * データ分析用のJSON出力を生成
 */
export const exportGameDataForAnalysis = (gameId?: string): string => {
  try {
    const exportData = {
      timestamp: new Date().toISOString(),
      gameHistory: getGameHistory(),
      statistics: getGameStatistics(),
      logs: gameId ? getGameLogs(gameId) : undefined,
      currentGame: gameId ? null : loadGameFromLocalStorage()
    };
    
    return JSON.stringify(exportData, null, 2);
  } catch (error) {
    throw new Error(`Failed to export game data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * ローカルストレージをクリア（開発・テスト用）
 */
export const clearAllGameData = (): void => {
  try {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
    
    // ゲーム固有のログも削除
    const indexKey = `${STORAGE_KEYS.GAME_LOGS}-index`;
    const gameIds = JSON.parse(localStorage.getItem(indexKey) || '[]');
    gameIds.forEach((gameId: string) => {
      localStorage.removeItem(`${STORAGE_KEYS.GAME_LOGS}-${gameId}`);
    });
    localStorage.removeItem(indexKey);
    
    console.log('All game data cleared from localStorage');
  } catch (error) {
    console.error('Failed to clear game data:', error);
  }
};

/**
 * ゲーム状態の整合性をチェック
 */
export const validateGameState = (gameSession: GameSession): boolean => {
  try {
    // 基本的な構造チェック
    if (!gameSession.id || !gameSession.players || !gameSession.gameState) {
      return false;
    }
    
    // プレイヤー数チェック
    if (gameSession.players.length < 1 || gameSession.players.length > 4) {
      return false;
    }
    
    // ラウンド数チェック
    if (gameSession.currentRound < 1 || gameSession.currentRound > 8) {
      return false;
    }
    
    // フェーズチェック
    const validPhases = ['setup', 'labor', 'oshikatsu-decision', 'oshikatsu-goods', 'oshikatsu-placement', 'fansa-time', 'round-end', 'game-end'];
    if (!validPhases.includes(gameSession.currentPhase)) {
      return false;
    }
    
    // プレイヤーデータの整合性チェック
    for (const player of gameSession.players) {
      if (!player.id || !player.name) {
        return false;
      }
      
      if (player.money < 0 || player.points < 0) {
        return false;
      }
      
      if (!player.otakuPieces || player.otakuPieces.length === 0) {
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error validating game state:', error);
    return false;
  }
};