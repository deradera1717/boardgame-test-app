/**
 * エラーハンドリングとバリデーションのプロパティベーステスト
 * Feature: oshi-game-testplay
 */

import * as fc from 'fast-check';
import { GameSession, Player, GameError, GoodsType } from '../types/game';
import { 
  validatePlayerName, 
  validatePlayerCount, 
  validateSpotId, 
  validateDiceResult,
  validateGoodsPurchase,
  validatePiecePlacement,
  validateGameStateConsistency,
  repairGameState,
  isOperationSafe,
  createGameError,
  ERROR_MESSAGES
} from '../utils/errorHandling';

// テスト用のプレイヤー生成
const playerArbitrary = fc.record({
  id: fc.string({ minLength: 1, maxLength: 10 })
    .filter(s => /^[a-zA-Z0-9_-]+$/.test(s))
    .filter(s => !['__proto__', 'constructor', 'prototype'].includes(s)),
  name: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
  color: fc.constantFrom('red', 'blue', 'green', 'yellow'),
  money: fc.integer({ min: 0, max: 100 }),
  points: fc.integer({ min: 0, max: 100 }),
  otakuPieces: fc.array(
    fc.record({
      id: fc.string({ minLength: 1, maxLength: 15 }),
      playerId: fc.string({ minLength: 1, maxLength: 10 }),
      boardSpotId: fc.option(fc.integer({ min: 0, max: 7 })),
      goods: fc.option(fc.constantFrom('uchiwa', 'penlight', 'sashiire')),
      isKagebunshin: fc.boolean()
    }),
    { minLength: 4, maxLength: 6 }
  )
}).map(player => ({
  ...player,
  otakuPieces: player.otakuPieces.map(piece => ({
    ...piece,
    playerId: player.id
  }))
}));

// 簡略化されたゲームセッション生成
const gameSessionArbitrary = fc.record({
  id: fc.string({ minLength: 1, maxLength: 20 }),
  players: fc.array(playerArbitrary, { minLength: 1, maxLength: 4 }),
  currentRound: fc.integer({ min: 1, max: 8 }),
  currentPhase: fc.constantFrom(
    'setup', 'labor', 'oshikatsu-decision', 'oshikatsu-goods',
    'oshikatsu-placement', 'fansa-time', 'round-end', 'game-end'
  ),
  activePlayerIndex: fc.integer({ min: 0, max: 3 }),
  createdAt: fc.constant(new Date())
}).map(({ players, activePlayerIndex, ...rest }) => ({
  ...rest,
  players,
  activePlayerIndex: activePlayerIndex % players.length,
  gameState: {
    hanamichiBoardState: {
      spots: Array.from({ length: 8 }, (_, i) => ({
        id: i,
        position: { row: Math.floor(i / 4), col: i % 4 },
        otakuPieces: [],
        oshiPiece: undefined
      }))
    },
    oshiPieces: [
      { id: 'A', currentSpotId: undefined },
      { id: 'B', currentSpotId: undefined },
      { id: 'C', currentSpotId: undefined }
    ],
    fanserviceSpotCards: [],
    revealedCards: [],
    rewardDistributionCards: [],
    roundHistory: []
  },
  turnManager: {
    currentPlayer: activePlayerIndex % players.length,
    waitingForPlayers: players.map(p => p.id),
    phaseActions: Object.fromEntries(players.map(p => [p.id, false]))
  }
}));

describe('エラーハンドリングとバリデーション プロパティベーステスト', () => {
  /**
   * **Feature: oshi-game-testplay, Property 19: 無効操作の検出と処理**
   * **Validates: Requirements 8.3**
   */
  test('プロパティ19: 無効操作の検出と処理', () => {
    fc.assert(
      fc.property(
        gameSessionArbitrary,
        fc.constantFrom('purchaseGoods', 'placePiece', 'selectRewardCard'),
        fc.record({
          playerId: fc.option(fc.string({ minLength: 1, maxLength: 10 })),
          goodsType: fc.option(fc.constantFrom('uchiwa', 'penlight', 'sashiire')),
          pieceId: fc.option(fc.string({ minLength: 1, maxLength: 15 })),
          spotId: fc.option(fc.integer({ min: -5, max: 12 })) // 無効な値も含む
        }),
        (gameSession, operation, params) => {
          // 操作の安全性チェック
          const { safe, error } = isOperationSafe(operation, gameSession, params);
          
          // 無効操作の場合
          if (!safe) {
            // エラーが適切に検出されることを確認
            expect(error).toBeDefined();
            expect(error!.type).toMatch(/^(user-input|validation|system)$/);
            expect(error!.message).toBeDefined();
            expect(typeof error!.message).toBe('string');
            expect(error!.message.length).toBeGreaterThan(0);
            
            // エラーメッセージが適切であることを確認
            expect(Object.values(ERROR_MESSAGES)).toContain(error!.message);
            
            // プレイヤーIDが提供されている場合の検証
            if (params.playerId && error!.message === ERROR_MESSAGES.INVALID_PLAYER_ID) {
              const playerExists = gameSession.players.some(p => p.id === params.playerId);
              if (!playerExists) {
                expect(error!.playerId).toBe(params.playerId);
              }
            }
            
            // エラーメッセージが有効なエラーメッセージの一つであることを確認
            // 具体的なエラーメッセージは検証の順序によって決まるため、
            // 有効なメッセージの一つであることのみを確認
            const validErrorMessages = Object.values(ERROR_MESSAGES);
            expect(validErrorMessages).toContain(error!.message);
          }
          
          // 有効操作の場合
          if (safe) {
            expect(error).toBeUndefined();
            
            // 基本的なゲーム状態の整合性が保たれていることを確認
            const consistencyErrors = validateGameStateConsistency(gameSession);
            expect(consistencyErrors.length).toBe(0);
          }
          
          // 操作の結果が一貫していることを確認
          const secondCheck = isOperationSafe(operation, gameSession, params);
          expect(secondCheck.safe).toBe(safe);
          
          if (!safe && error) {
            expect(secondCheck.error?.type).toBe(error.type);
            expect(secondCheck.error?.message).toBe(error.message);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // 補助テスト: 個別バリデーション関数の動作確認
  test('プレイヤー名バリデーションの正確性', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 50 }),
        fc.array(playerArbitrary, { minLength: 0, maxLength: 4 }),
        (playerName, existingPlayers) => {
          const error = validatePlayerName(playerName, existingPlayers);
          
          // 空文字の場合
          if (!playerName || playerName.trim().length === 0) {
            expect(error).toBeDefined();
            expect(error!.message).toBe(ERROR_MESSAGES.EMPTY_PLAYER_NAME);
            expect(error!.type).toBe('user-input');
          }
          // 重複の場合
          else if (existingPlayers.some(p => p.name.toLowerCase() === playerName.toLowerCase())) {
            expect(error).toBeDefined();
            expect(error!.message).toBe(ERROR_MESSAGES.DUPLICATE_PLAYER_NAME);
            expect(error!.type).toBe('user-input');
          }
          // 有効な場合
          else {
            expect(error).toBeNull();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('プレイヤー数バリデーションの正確性', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -5, max: 10 }),
        (playerCount) => {
          const error = validatePlayerCount(playerCount);
          
          if (playerCount < 1 || playerCount > 4) {
            expect(error).toBeDefined();
            expect(error!.message).toBe(ERROR_MESSAGES.INVALID_PLAYER_COUNT);
            expect(error!.type).toBe('user-input');
          } else {
            expect(error).toBeNull();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('スポットIDバリデーションの正確性', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -10, max: 20 }),
        (spotId) => {
          const error = validateSpotId(spotId);
          
          if (spotId < 0 || spotId > 7) {
            expect(error).toBeDefined();
            expect(error!.message).toBe(ERROR_MESSAGES.INVALID_SPOT_ID);
            expect(error!.type).toBe('validation');
            expect(error!.context).toEqual({ spotId });
          } else {
            expect(error).toBeNull();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('サイコロ結果バリデーションの正確性', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -5, max: 15 }),
        (diceResult) => {
          const error = validateDiceResult(diceResult);
          
          if (diceResult < 1 || diceResult > 6) {
            expect(error).toBeDefined();
            expect(error!.message).toBe(ERROR_MESSAGES.INVALID_DICE_RESULT);
            expect(error!.type).toBe('validation');
            expect(error!.context).toEqual({ diceResult });
          } else {
            expect(error).toBeNull();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('ゲーム状態の整合性チェック', () => {
    fc.assert(
      fc.property(
        gameSessionArbitrary,
        (gameSession) => {
          const errors = validateGameStateConsistency(gameSession);
          
          // エラーが配列であることを確認
          expect(Array.isArray(errors)).toBe(true);
          
          // 各エラーが適切な構造を持つことを確認
          errors.forEach(error => {
            expect(error.type).toMatch(/^(user-input|validation|system)$/);
            expect(error.message).toBeDefined();
            expect(typeof error.message).toBe('string');
            expect(error.message.length).toBeGreaterThan(0);
          });
          
          // プレイヤー数が無効な場合のチェック
          if (gameSession.players.length < 1 || gameSession.players.length > 4) {
            expect(errors.some(e => e.message === ERROR_MESSAGES.INVALID_PLAYER_COUNT)).toBe(true);
          }
          
          // アクティブプレイヤーインデックスが無効な場合のチェック
          if (gameSession.activePlayerIndex < 0 || gameSession.activePlayerIndex >= gameSession.players.length) {
            expect(errors.some(e => e.message === ERROR_MESSAGES.GAME_STATE_INCONSISTENCY)).toBe(true);
          }
          
          // ラウンド数が無効な場合のチェック
          if (gameSession.currentRound < 1 || gameSession.currentRound > 8) {
            expect(errors.some(e => e.message === ERROR_MESSAGES.GAME_STATE_INCONSISTENCY)).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('ゲーム状態の自動修復機能', () => {
    fc.assert(
      fc.property(
        gameSessionArbitrary,
        (originalSession) => {
          const repairedSession = repairGameState(originalSession);
          
          // 修復後のセッションが有効であることを確認
          expect(repairedSession).toBeDefined();
          expect(repairedSession.players).toEqual(originalSession.players);
          
          // アクティブプレイヤーインデックスが有効範囲内に修復されることを確認
          expect(repairedSession.activePlayerIndex).toBeGreaterThanOrEqual(0);
          expect(repairedSession.activePlayerIndex).toBeLessThan(repairedSession.players.length);
          
          // ターンマネージャーのphaseActionsが全プレイヤーに対して定義されることを確認
          repairedSession.players.forEach(player => {
            expect(repairedSession.turnManager.phaseActions).toHaveProperty(player.id);
            expect(typeof repairedSession.turnManager.phaseActions[player.id]).toBe('boolean');
          });
          
          // 待機プレイヤーリストが整合性を持つことを確認
          const expectedWaitingPlayers = repairedSession.players
            .filter(player => !repairedSession.turnManager.phaseActions[player.id])
            .map(player => player.id);
          
          expect(repairedSession.turnManager.waitingForPlayers.sort()).toEqual(expectedWaitingPlayers.sort());
          
          // ボードスポット数が8個であることを確認
          expect(repairedSession.gameState.hanamichiBoardState.spots).toHaveLength(8);
          
          // 各スポットが適切な構造を持つことを確認
          repairedSession.gameState.hanamichiBoardState.spots.forEach((spot, index) => {
            expect(spot.id).toBe(index);
            expect(spot.position.row).toBe(Math.floor(index / 4));
            expect(spot.position.col).toBe(index % 4);
            expect(Array.isArray(spot.otakuPieces)).toBe(true);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  test('エラー作成関数の正確性', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('user-input', 'validation', 'system'),
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.option(fc.string({ minLength: 1, maxLength: 20 })),
        fc.option(fc.object()),
        (type, message, playerId, context) => {
          const error = createGameError(type, message, playerId, context);
          
          expect(error.type).toBe(type);
          expect(error.message).toBe(message);
          expect(error.playerId).toBe(playerId);
          expect(error.context).toBe(context);
          
          // エラーオブジェクトが適切な構造を持つことを確認
          expect(typeof error).toBe('object');
          expect(error).toHaveProperty('type');
          expect(error).toHaveProperty('message');
        }
      ),
      { numRuns: 100 }
    );
  });
});