/**
 * エラーハンドリングとバリデーション機能
 * 無効操作の検出、エラーメッセージ表示、ゲーム状態の整合性チェック、回復機能を提供
 */

import { GameSession, Player, GameState, GamePhase, GameError, OtakuPiece, GoodsType } from '../types/game';

/**
 * エラータイプの定義
 */
export type ErrorType = 'user-input' | 'system' | 'validation';

/**
 * エラーメッセージの定義
 */
export const ERROR_MESSAGES = {
  // ユーザー入力エラー
  INVALID_PLAYER_COUNT: 'プレイヤー数は1人から4人までです',
  DUPLICATE_PLAYER_NAME: '同じ名前のプレイヤーが既に存在します',
  EMPTY_PLAYER_NAME: 'プレイヤー名を入力してください',
  INSUFFICIENT_FUNDS: '資金が不足しています',
  NO_AVAILABLE_PIECES: '利用可能なオタクコマがありません',
  SPOT_FULL: 'このスポットは満員です（最大3個まで）',
  INVALID_PIECE_PLACEMENT: 'グッズを持っていないオタクコマは配置できません',
  NOT_PLAYER_TURN: 'あなたのターンではありません',
  ACTION_ALREADY_COMPLETED: 'このアクションは既に完了しています',
  PHASE_MISMATCH: '現在のフェーズでは実行できない操作です',
  
  // システムエラー
  GAME_STATE_CORRUPTION: 'ゲーム状態が破損しています',
  INVALID_GAME_PHASE: '無効なゲームフェーズです',
  MISSING_REQUIRED_DATA: '必要なデータが不足しています',
  SERIALIZATION_ERROR: 'データの保存に失敗しました',
  DESERIALIZATION_ERROR: 'データの読み込みに失敗しました',
  
  // バリデーションエラー
  INVALID_DICE_RESULT: 'サイコロの結果が無効です（1-6の範囲外）',
  INVALID_SPOT_ID: '無効なスポットIDです（0-7の範囲外）',
  INVALID_PLAYER_ID: '無効なプレイヤーIDです',
  INVALID_CARD_SELECTION: '無効なカード選択です',
  GAME_STATE_INCONSISTENCY: 'ゲーム状態に不整合があります'
} as const;

/**
 * ゲームエラーを作成
 */
export const createGameError = (
  type: ErrorType,
  message: string,
  playerId?: string,
  context?: any
): GameError => ({
  type,
  message,
  playerId,
  context
});

/**
 * プレイヤー名のバリデーション
 */
export const validatePlayerName = (name: string, existingPlayers: Player[]): GameError | null => {
  // 空文字チェック
  if (!name || name.trim().length === 0) {
    return createGameError('user-input', ERROR_MESSAGES.EMPTY_PLAYER_NAME);
  }
  
  // 重複チェック
  const isDuplicate = existingPlayers.some(player => 
    player.name.toLowerCase() === name.toLowerCase()
  );
  
  if (isDuplicate) {
    return createGameError('user-input', ERROR_MESSAGES.DUPLICATE_PLAYER_NAME);
  }
  
  return null;
};

/**
 * プレイヤー数のバリデーション
 */
export const validatePlayerCount = (playerCount: number): GameError | null => {
  if (playerCount < 1 || playerCount > 4) {
    return createGameError('user-input', ERROR_MESSAGES.INVALID_PLAYER_COUNT);
  }
  
  return null;
};

/**
 * スポットIDのバリデーション
 */
export const validateSpotId = (spotId: number): GameError | null => {
  if (spotId < 0 || spotId > 7) {
    return createGameError('validation', ERROR_MESSAGES.INVALID_SPOT_ID, undefined, { spotId });
  }
  
  return null;
};

/**
 * サイコロ結果のバリデーション
 */
export const validateDiceResult = (diceResult: number): GameError | null => {
  if (diceResult < 1 || diceResult > 6) {
    return createGameError('validation', ERROR_MESSAGES.INVALID_DICE_RESULT, undefined, { diceResult });
  }
  
  return null;
};

/**
 * プレイヤーIDのバリデーション
 */
export const validatePlayerId = (playerId: string, players: Player[]): GameError | null => {
  const playerExists = players.some(player => player.id === playerId);
  
  if (!playerExists) {
    return createGameError('validation', ERROR_MESSAGES.INVALID_PLAYER_ID, playerId);
  }
  
  return null;
};

/**
 * ターン権限のバリデーション
 */
export const validatePlayerTurn = (
  playerId: string, 
  gameSession: GameSession
): GameError | null => {
  const currentPlayer = gameSession.players[gameSession.activePlayerIndex];
  
  if (currentPlayer.id !== playerId) {
    return createGameError('user-input', ERROR_MESSAGES.NOT_PLAYER_TURN, playerId);
  }
  
  return null;
};

/**
 * フェーズ適合性のバリデーション
 */
export const validatePhaseAction = (
  action: string,
  currentPhase: GamePhase
): GameError | null => {
  const phaseActionMap: Record<string, GamePhase[]> = {
    'selectRewardCard': ['labor'],
    'selectOshikatsuDecision': ['oshikatsu-decision'],
    'purchaseGoods': ['oshikatsu-goods'],
    'placePiece': ['oshikatsu-placement'],
    'processFansaTime': ['fansa-time']
  };
  
  const validPhases = phaseActionMap[action];
  
  if (validPhases && !validPhases.includes(currentPhase)) {
    return createGameError(
      'user-input', 
      ERROR_MESSAGES.PHASE_MISMATCH, 
      undefined, 
      { action, currentPhase, validPhases }
    );
  }
  
  return null;
};

/**
 * グッズ購入のバリデーション
 */
export const validateGoodsPurchase = (
  playerId: string,
  goodsType: GoodsType,
  gameSession: GameSession
): GameError | null => {
  const player = gameSession.players.find(p => p.id === playerId);
  
  if (!player) {
    return createGameError('validation', ERROR_MESSAGES.INVALID_PLAYER_ID, playerId);
  }
  
  // 価格設定
  const goodsPrices = {
    uchiwa: 1,
    penlight: 1,
    sashiire: 2
  };
  
  const price = goodsPrices[goodsType];
  
  // 資金チェック
  if (player.money < price) {
    return createGameError(
      'user-input', 
      ERROR_MESSAGES.INSUFFICIENT_FUNDS, 
      playerId, 
      { required: price, available: player.money }
    );
  }
  
  // 利用可能なオタクコマチェック
  const availablePiece = player.otakuPieces.find(piece => 
    !piece.goods && piece.boardSpotId === undefined
  );
  
  if (!availablePiece) {
    return createGameError('user-input', ERROR_MESSAGES.NO_AVAILABLE_PIECES, playerId);
  }
  
  return null;
};

/**
 * オタクコマ配置のバリデーション
 */
export const validatePiecePlacement = (
  pieceId: string,
  spotId: number,
  gameSession: GameSession
): GameError | null => {
  // スポットIDの基本バリデーション
  const spotError = validateSpotId(spotId);
  if (spotError) return spotError;
  
  // ピースの存在確認
  const piece = gameSession.players
    .flatMap(player => player.otakuPieces)
    .find(p => p.id === pieceId);
  
  if (!piece) {
    return createGameError('validation', ERROR_MESSAGES.INVALID_PLAYER_ID, undefined, { pieceId });
  }
  
  // グッズを持っているかチェック
  if (!piece.goods) {
    return createGameError('user-input', ERROR_MESSAGES.INVALID_PIECE_PLACEMENT, piece.playerId);
  }
  
  // スポットの空き状況チェック
  const targetSpot = gameSession.gameState.hanamichiBoardState.spots.find(spot => spot.id === spotId);
  
  if (!targetSpot) {
    return createGameError('system', ERROR_MESSAGES.MISSING_REQUIRED_DATA, undefined, { spotId });
  }
  
  if (targetSpot.otakuPieces.length >= 3) {
    return createGameError('user-input', ERROR_MESSAGES.SPOT_FULL, piece.playerId, { spotId });
  }
  
  return null;
};

/**
 * ゲーム状態の整合性チェック
 */
export const validateGameStateConsistency = (gameSession: GameSession): GameError[] => {
  const errors: GameError[] = [];
  
  // プレイヤー数チェック
  if (gameSession.players.length < 1 || gameSession.players.length > 4) {
    errors.push(createGameError('validation', ERROR_MESSAGES.INVALID_PLAYER_COUNT));
  }
  
  // アクティブプレイヤーインデックスチェック
  if (gameSession.activePlayerIndex < 0 || gameSession.activePlayerIndex >= gameSession.players.length) {
    errors.push(createGameError('validation', ERROR_MESSAGES.GAME_STATE_INCONSISTENCY, undefined, {
      activePlayerIndex: gameSession.activePlayerIndex,
      playerCount: gameSession.players.length
    }));
  }
  
  // ラウンド数チェック
  if (gameSession.currentRound < 1 || gameSession.currentRound > 8) {
    errors.push(createGameError('validation', ERROR_MESSAGES.GAME_STATE_INCONSISTENCY, undefined, {
      currentRound: gameSession.currentRound
    }));
  }
  
  // ボードスポット数チェック
  if (gameSession.gameState.hanamichiBoardState.spots.length !== 8) {
    errors.push(createGameError('validation', ERROR_MESSAGES.GAME_STATE_INCONSISTENCY, undefined, {
      spotCount: gameSession.gameState.hanamichiBoardState.spots.length
    }));
  }
  
  // 各プレイヤーのオタクコマ数チェック（影分身を除く）
  gameSession.players.forEach(player => {
    const regularPieces = player.otakuPieces.filter(piece => !piece.isKagebunshin);
    if (regularPieces.length !== 4) {
      errors.push(createGameError('validation', ERROR_MESSAGES.GAME_STATE_INCONSISTENCY, player.id, {
        expectedPieces: 4,
        actualPieces: regularPieces.length
      }));
    }
  });
  
  // ターンマネージャーの整合性チェック
  const expectedPhaseActions = Object.keys(gameSession.turnManager.phaseActions);
  const playerIds = gameSession.players.map(p => p.id);
  
  if (expectedPhaseActions.length !== playerIds.length) {
    errors.push(createGameError('validation', ERROR_MESSAGES.GAME_STATE_INCONSISTENCY, undefined, {
      phaseActionCount: expectedPhaseActions.length,
      playerCount: playerIds.length
    }));
  }
  
  return errors;
};

/**
 * ゲーム状態の自動修復
 */
export const repairGameState = (gameSession: GameSession): GameSession => {
  const repairedSession = { ...gameSession };
  
  // アクティブプレイヤーインデックスの修復
  if (repairedSession.activePlayerIndex >= repairedSession.players.length) {
    repairedSession.activePlayerIndex = 0;
  }
  
  if (repairedSession.activePlayerIndex < 0) {
    repairedSession.activePlayerIndex = 0;
  }
  
  // ターンマネージャーのphaseActionsを修復
  const validPhaseActions: { [playerId: string]: boolean } = {};
  repairedSession.players.forEach(player => {
    validPhaseActions[player.id] = repairedSession.turnManager.phaseActions[player.id] || false;
  });
  
  repairedSession.turnManager = {
    ...repairedSession.turnManager,
    phaseActions: validPhaseActions,
    waitingForPlayers: repairedSession.players
      .filter(player => !validPhaseActions[player.id])
      .map(player => player.id)
  };
  
  // ボードスポットの修復（8個に調整）
  if (repairedSession.gameState.hanamichiBoardState.spots.length !== 8) {
    const spots = [];
    for (let i = 0; i < 8; i++) {
      const existingSpot = repairedSession.gameState.hanamichiBoardState.spots.find(s => s.id === i);
      spots.push(existingSpot || {
        id: i,
        position: { row: Math.floor(i / 4), col: i % 4 },
        otakuPieces: [],
        oshiPiece: undefined
      });
    }
    
    repairedSession.gameState.hanamichiBoardState.spots = spots;
  }
  
  return repairedSession;
};

/**
 * エラー回復戦略の実行
 */
export const executeErrorRecovery = (
  gameSession: GameSession,
  error: GameError
): { recoveredSession: GameSession; recoveryAction: string } => {
  let recoveredSession = { ...gameSession };
  let recoveryAction = 'no-action';
  
  switch (error.type) {
    case 'validation':
      // バリデーションエラーの場合は自動修復を試行
      recoveredSession = repairGameState(gameSession);
      recoveryAction = 'auto-repair';
      break;
      
    case 'system':
      // システムエラーの場合は前回の有効な状態に戻す
      // 実装では最小限の修復のみ行う
      recoveredSession = repairGameState(gameSession);
      recoveryAction = 'minimal-repair';
      break;
      
    case 'user-input':
      // ユーザー入力エラーの場合は状態を維持し、エラーメッセージのみ表示
      recoveryAction = 'display-error';
      break;
  }
  
  return { recoveredSession, recoveryAction };
};

/**
 * 操作の安全性チェック
 */
export const isOperationSafe = (
  operation: string,
  gameSession: GameSession,
  params?: any
): { safe: boolean; error?: GameError } => {
  // 基本的なゲーム状態の整合性チェック
  const consistencyErrors = validateGameStateConsistency(gameSession);
  if (consistencyErrors.length > 0) {
    return { safe: false, error: consistencyErrors[0] };
  }
  
  // フェーズ適合性チェック
  const phaseError = validatePhaseAction(operation, gameSession.currentPhase);
  if (phaseError) {
    return { safe: false, error: phaseError };
  }
  
  // 操作固有のバリデーション
  switch (operation) {
    case 'purchaseGoods':
      // パラメータが不完全な場合もエラーとして扱う
      if (params?.playerId && !params?.goodsType) {
        return { safe: false, error: createGameError('user-input', ERROR_MESSAGES.MISSING_REQUIRED_DATA, params.playerId) };
      }
      if (params?.playerId && params?.goodsType) {
        const purchaseError = validateGoodsPurchase(params.playerId, params.goodsType, gameSession);
        if (purchaseError) {
          return { safe: false, error: purchaseError };
        }
      }
      break;
      
    case 'placePiece':
      // パラメータが不完全な場合もエラーとして扱う
      if (params?.pieceId && params?.spotId === undefined) {
        return { safe: false, error: createGameError('user-input', ERROR_MESSAGES.MISSING_REQUIRED_DATA, undefined, { pieceId: params.pieceId }) };
      }
      if (params?.pieceId && params?.spotId !== undefined) {
        const placementError = validatePiecePlacement(params.pieceId, params.spotId, gameSession);
        if (placementError) {
          return { safe: false, error: placementError };
        }
      }
      break;
  }
  
  return { safe: true };
};

/**
 * エラーメッセージのローカライゼーション（日本語）
 */
export const getLocalizedErrorMessage = (error: GameError): string => {
  return error.message;
};

/**
 * エラーの重要度判定
 */
export const getErrorSeverity = (error: GameError): 'low' | 'medium' | 'high' | 'critical' => {
  switch (error.type) {
    case 'user-input':
      return 'low';
    case 'validation':
      return 'medium';
    case 'system':
      return error.message.includes('corruption') ? 'critical' : 'high';
    default:
      return 'medium';
  }
};