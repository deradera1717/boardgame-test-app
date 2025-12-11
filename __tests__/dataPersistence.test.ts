/**
 * データ永続化とログ記録システムのプロパティベーステスト
 * Feature: oshi-game-testplay
 */

import * as fc from 'fast-check';
import { GameSession, Player, GameState, OtakuPiece, GamePhase, PlayerColor, GoodsType, OshikatsuDecision } from '../types/game';
import { 
  serializeGameState, 
  deserializeGameState,
  logGameAction,
  getGameLogs,
  updateGameStatistics,
  getGameStatistics,
  validateGameState,
  clearAllGameData
} from '../utils/dataPersistence';

// テスト用のアービトラリ生成
const playerColorArbitrary = fc.constantFrom('red', 'blue', 'green', 'yellow');
const gamePhaseArbitrary = fc.constantFrom(
  'setup', 'labor', 'oshikatsu-decision', 'oshikatsu-goods', 
  'oshikatsu-placement', 'fansa-time', 'round-end', 'game-end'
);
const goodsTypeArbitrary = fc.constantFrom('uchiwa', 'penlight', 'sashiire');
const oshikatsuDecisionArbitrary = fc.constantFrom('participate', 'rest');

// プレイヤーID生成（英数字とハイフン、アンダースコアのみ）
const playerIdArbitrary = fc.string({ minLength: 1, maxLength: 10 })
  .filter(s => /^[a-zA-Z0-9_-]+$/.test(s));

// オタクコマ生成
const otakuPieceArbitrary = fc.record({
  id: fc.string({ minLength: 1, maxLength: 15 }),
  playerId: playerIdArbitrary,
  boardSpotId: fc.option(fc.integer({ min: 0, max: 7 })),
  goods: fc.option(goodsTypeArbitrary),
  isKagebunshin: fc.boolean()
});

// プレイヤー生成
const playerArbitrary = fc.record({
  id: playerIdArbitrary,
  name: fc.string({ minLength: 1, maxLength: 20 }),
  color: playerColorArbitrary,
  money: fc.integer({ min: 0, max: 100 }),
  points: fc.integer({ min: 0, max: 200 }),
  otakuPieces: fc.array(otakuPieceArbitrary, { minLength: 1, maxLength: 6 }),
  selectedRewardCard: fc.option(fc.record({
    id: fc.string({ minLength: 1, maxLength: 10 }),
    name: fc.constantFrom('A', 'B', 'C', 'D', 'E', 'F'),
    rewards: fc.record({
      1: fc.integer({ min: 0, max: 5 }),
      2: fc.integer({ min: 0, max: 5 }),
      3: fc.integer({ min: 0, max: 5 }),
      4: fc.integer({ min: 0, max: 5 }),
      5: fc.integer({ min: 0, max: 5 }),
      6: fc.integer({ min: 0, max: 5 })
    })
  })),
  oshikatsuDecision: fc.option(oshikatsuDecisionArbitrary)
});

// ボードスポット生成
const boardSpotArbitrary = fc.record({
  id: fc.integer({ min: 0, max: 7 }),
  position: fc.record({
    row: fc.integer({ min: 0, max: 1 }),
    col: fc.integer({ min: 0, max: 3 })
  }),
  otakuPieces: fc.array(otakuPieceArbitrary, { maxLength: 3 }),
  oshiPiece: fc.option(fc.record({
    id: fc.constantFrom('A', 'B', 'C'),
    currentSpotId: fc.option(fc.integer({ min: 0, max: 7 }))
  }))
});

// ファンサスポットカード生成
const fanserviceSpotCardArbitrary = fc.record({
  id: fc.string({ minLength: 1, maxLength: 20 }),
  spots: fc.tuple(
    fc.integer({ min: 0, max: 7 }),
    fc.integer({ min: 0, max: 7 }),
    fc.integer({ min: 0, max: 7 })
  ).filter(([a, b, c]) => a < b && b < c).map(([a, b, c]) => [a, b, c] as [number, number, number]),
  orientation: fc.constantFrom('front', 'back'),
  rotation: fc.constantFrom(0, 90, 180, 270)
});

// ラウンド結果生成
const roundResultArbitrary = fc.record({
  roundNumber: fc.integer({ min: 1, max: 8 }),
  laborResults: fc.array(fc.record({
    playerId: playerIdArbitrary,
    selectedCard: fc.constantFrom('A', 'B', 'C', 'D', 'E', 'F'),
    diceResult: fc.integer({ min: 1, max: 6 }),
    reward: fc.integer({ min: 0, max: 5 })
  }), { maxLength: 4 }),
  oshikatsuDecisions: fc.array(fc.record({
    playerId: playerIdArbitrary,
    decision: oshikatsuDecisionArbitrary
  }), { maxLength: 4 }),
  fansaResults: fc.array(fc.record({
    playerId: playerIdArbitrary,
    pointsEarned: fc.integer({ min: 0, max: 20 }),
    breakdown: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 5 })
  }), { maxLength: 4 })
});

// ゲーム状態生成
const gameStateArbitrary = fc.record({
  hanamichiBoardState: fc.record({
    spots: fc.array(boardSpotArbitrary, { minLength: 8, maxLength: 8 }).map(spots => 
      spots.map((spot, index) => ({ ...spot, id: index }))
    )
  }),
  oshiPieces: fc.array(fc.record({
    id: fc.constantFrom('A', 'B', 'C'),
    currentSpotId: fc.option(fc.integer({ min: 0, max: 7 }))
  }), { minLength: 3, maxLength: 3 }),
  fanserviceSpotCards: fc.array(fanserviceSpotCardArbitrary, { maxLength: 28 }),
  revealedCards: fc.array(fanserviceSpotCardArbitrary, { maxLength: 3 }),
  rewardDistributionCards: fc.array(fc.record({
    id: fc.string({ minLength: 1, maxLength: 10 }),
    name: fc.constantFrom('A', 'B', 'C', 'D', 'E', 'F'),
    rewards: fc.record({
      1: fc.integer({ min: 0, max: 5 }),
      2: fc.integer({ min: 0, max: 5 }),
      3: fc.integer({ min: 0, max: 5 }),
      4: fc.integer({ min: 0, max: 5 }),
      5: fc.integer({ min: 0, max: 5 }),
      6: fc.integer({ min: 0, max: 5 })
    })
  }), { minLength: 6, maxLength: 6 }),
  currentDiceResult: fc.option(fc.integer({ min: 1, max: 6 })),
  roundHistory: fc.array(roundResultArbitrary, { maxLength: 8 })
});

// ターンマネージャー生成
const turnManagerArbitrary = fc.record({
  currentPlayer: fc.integer({ min: 0, max: 3 }),
  waitingForPlayers: fc.array(playerIdArbitrary, { maxLength: 4 }),
  phaseActions: fc.dictionary(playerIdArbitrary, fc.boolean())
});

// ゲームセッション生成
const gameSessionArbitrary = fc.array(playerArbitrary, { minLength: 1, maxLength: 4 })
  .map(players => players.map((player, index) => ({ ...player, id: `player-${index}` })))
  .chain(players => 
    fc.record({
      id: fc.string({ minLength: 1, maxLength: 30 }),
      players: fc.constant(players),
      currentRound: fc.integer({ min: 1, max: 8 }),
      currentPhase: gamePhaseArbitrary,
      activePlayerIndex: fc.integer({ min: 0, max: Math.max(0, players.length - 1) }),
      gameState: gameStateArbitrary,
      turnManager: turnManagerArbitrary,
      createdAt: fc.date({ min: new Date('2020-01-01T00:00:00.000Z'), max: new Date('2030-12-31T23:59:59.999Z') }).filter(date => !isNaN(date.getTime()))
    })
  );

describe('データ永続化とログ記録システム プロパティベーステスト', () => {
  // 各テスト前にローカルストレージをクリア
  beforeEach(() => {
    clearAllGameData();
  });

  // 各テスト後もクリア
  afterEach(() => {
    clearAllGameData();
  });

  /**
   * **Feature: oshi-game-testplay, Property 17: ゲーム状態のラウンドトリップ一貫性**
   * **Validates: Requirements 9.4, 9.5**
   */
  test('プロパティ17: ゲーム状態のラウンドトリップ一貫性', () => {
    fc.assert(
      fc.property(
        gameSessionArbitrary,
        (originalGameSession) => {
          // ゲーム状態をシリアライズ
          const serialized = serializeGameState(originalGameSession);
          
          // シリアライズ結果が有効なJSON文字列であることを確認
          expect(typeof serialized).toBe('string');
          expect(serialized.length).toBeGreaterThan(0);
          
          // JSON形式として解析可能であることを確認
          expect(() => JSON.parse(serialized)).not.toThrow();
          
          // デシリアライズして元の状態を復元
          const deserialized = deserializeGameState(serialized);
          
          // 基本的な構造が保持されていることを確認
          expect(deserialized.id).toBe(originalGameSession.id);
          expect(deserialized.players).toHaveLength(originalGameSession.players.length);
          expect(deserialized.currentRound).toBe(originalGameSession.currentRound);
          expect(deserialized.currentPhase).toBe(originalGameSession.currentPhase);
          expect(deserialized.activePlayerIndex).toBe(originalGameSession.activePlayerIndex);
          
          // プレイヤーデータの一貫性確認
          deserialized.players.forEach((player, index) => {
            const originalPlayer = originalGameSession.players[index];
            expect(player.id).toBe(originalPlayer.id);
            expect(player.name).toBe(originalPlayer.name);
            expect(player.color).toBe(originalPlayer.color);
            expect(player.money).toBe(originalPlayer.money);
            expect(player.points).toBe(originalPlayer.points);
            expect(player.otakuPieces).toHaveLength(originalPlayer.otakuPieces.length);
            
            // オタクコマの詳細確認
            player.otakuPieces.forEach((piece, pieceIndex) => {
              const originalPiece = originalPlayer.otakuPieces[pieceIndex];
              expect(piece.id).toBe(originalPiece.id);
              expect(piece.playerId).toBe(originalPiece.playerId);
              expect(piece.boardSpotId).toBe(originalPiece.boardSpotId);
              expect(piece.goods).toBe(originalPiece.goods);
              expect(piece.isKagebunshin).toBe(originalPiece.isKagebunshin);
            });
          });
          
          // ゲーム状態の一貫性確認
          expect(deserialized.gameState.hanamichiBoardState.spots).toHaveLength(
            originalGameSession.gameState.hanamichiBoardState.spots.length
          );
          expect(deserialized.gameState.oshiPieces).toHaveLength(
            originalGameSession.gameState.oshiPieces.length
          );
          expect(deserialized.gameState.roundHistory).toHaveLength(
            originalGameSession.gameState.roundHistory.length
          );
          
          // ラウンド履歴の詳細確認
          deserialized.gameState.roundHistory.forEach((round, roundIndex) => {
            const originalRound = originalGameSession.gameState.roundHistory[roundIndex];
            expect(round.roundNumber).toBe(originalRound.roundNumber);
            expect(round.laborResults).toHaveLength(originalRound.laborResults.length);
            expect(round.oshikatsuDecisions).toHaveLength(originalRound.oshikatsuDecisions.length);
            expect(round.fansaResults).toHaveLength(originalRound.fansaResults.length);
          });
          
          // Date オブジェクトの復元確認
          expect(deserialized.createdAt).toBeInstanceOf(Date);
          expect(deserialized.createdAt.getTime()).toBe(originalGameSession.createdAt.getTime());
          
          // ターンマネージャーの一貫性確認
          expect(deserialized.turnManager.currentPlayer).toBe(originalGameSession.turnManager.currentPlayer);
          expect(deserialized.turnManager.waitingForPlayers).toEqual(originalGameSession.turnManager.waitingForPlayers);
          
          // 再シリアライズして一貫性を確認（二重ラウンドトリップテスト）
          const reserializedJson = serializeGameState(deserialized);
          const reredeserialized = deserializeGameState(reserializedJson);
          
          expect(reredeserialized.id).toBe(originalGameSession.id);
          expect(reredeserialized.currentRound).toBe(originalGameSession.currentRound);
          expect(reredeserialized.currentPhase).toBe(originalGameSession.currentPhase);
          expect(reredeserialized.createdAt.getTime()).toBe(originalGameSession.createdAt.getTime());
        }
      ),
      { numRuns: 100 }
    );
  });

  // 補助テスト: シリアライゼーション関数の個別テスト
  test('serializeGameState 関数の正確性', () => {
    fc.assert(
      fc.property(
        gameSessionArbitrary,
        (gameSession) => {
          const serialized = serializeGameState(gameSession);
          
          // 有効なJSON文字列であることを確認
          expect(typeof serialized).toBe('string');
          expect(() => JSON.parse(serialized)).not.toThrow();
          
          // 基本的な内容が含まれていることを確認
          const parsed = JSON.parse(serialized);
          expect(parsed.id).toBeDefined();
          expect(parsed.players).toBeDefined();
          expect(parsed.gameState).toBeDefined();
          expect(parsed.createdAt).toBeDefined();
          
          // Date が ISO 文字列として保存されていることを確認
          expect(typeof parsed.createdAt).toBe('string');
          expect(new Date(parsed.createdAt).toISOString()).toBe(parsed.createdAt);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('deserializeGameState 関数の正確性', () => {
    fc.assert(
      fc.property(
        gameSessionArbitrary,
        (originalGameSession) => {
          const serialized = serializeGameState(originalGameSession);
          const deserialized = deserializeGameState(serialized);
          
          // 基本的な型が正しく復元されていることを確認
          expect(typeof deserialized.id).toBe('string');
          expect(Array.isArray(deserialized.players)).toBe(true);
          expect(typeof deserialized.currentRound).toBe('number');
          expect(typeof deserialized.currentPhase).toBe('string');
          expect(typeof deserialized.activePlayerIndex).toBe('number');
          expect(deserialized.createdAt).toBeInstanceOf(Date);
          
          // 数値の範囲チェック
          expect(deserialized.currentRound).toBeGreaterThanOrEqual(1);
          expect(deserialized.currentRound).toBeLessThanOrEqual(8);
          expect(deserialized.activePlayerIndex).toBeGreaterThanOrEqual(0);
          // activePlayerIndex は players.length - 1 以下であるべき（0-indexed）
          if (deserialized.players.length > 0) {
            expect(deserialized.activePlayerIndex).toBeLessThanOrEqual(deserialized.players.length - 1);
          }
          
          // プレイヤー数の制限チェック
          expect(deserialized.players.length).toBeGreaterThanOrEqual(1);
          expect(deserialized.players.length).toBeLessThanOrEqual(4);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('validateGameState 関数の正確性', () => {
    fc.assert(
      fc.property(
        gameSessionArbitrary,
        (gameSession) => {
          // 有効なゲーム状態の検証
          const isValid = validateGameState(gameSession);
          
          if (isValid) {
            // 有効と判定された場合の基本チェック
            expect(gameSession.id).toBeTruthy();
            expect(gameSession.players.length).toBeGreaterThanOrEqual(1);
            expect(gameSession.players.length).toBeLessThanOrEqual(4);
            expect(gameSession.currentRound).toBeGreaterThanOrEqual(1);
            expect(gameSession.currentRound).toBeLessThanOrEqual(8);
            
            // プレイヤーデータの基本チェック
            gameSession.players.forEach(player => {
              expect(player.id).toBeTruthy();
              expect(player.name).toBeTruthy();
              expect(player.money).toBeGreaterThanOrEqual(0);
              expect(player.points).toBeGreaterThanOrEqual(0);
              expect(player.otakuPieces.length).toBeGreaterThan(0);
            });
          }
          
          // 検証結果はブール値であること
          expect(typeof isValid).toBe('boolean');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: oshi-game-testplay, Property 18: 包括的ログ記録システム**
   * **Validates: Requirements 7.1, 7.2, 7.3**
   */
  test('プロパティ18: 包括的ログ記録システム', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }), // gameId
        fc.integer({ min: 1, max: 8 }), // roundNumber
        gamePhaseArbitrary, // phase
        fc.string({ minLength: 1, maxLength: 30 }), // action
        fc.anything(), // details
        fc.option(playerIdArbitrary), // playerId
        fc.option(fc.anything()), // result
        (gameId, roundNumber, phase, action, details, playerId, result) => {
          // 各プロパティテスト実行前にローカルストレージをクリア
          clearAllGameData();
          
          // ログエントリを記録
          logGameAction(gameId, roundNumber, phase, action, details, playerId, result);
          
          // 記録されたログを取得
          const logs = getGameLogs(gameId);
          
          // ログが記録されていることを確認
          expect(logs.length).toBeGreaterThan(0);
          
          // 最新のログエントリを取得
          const latestLog = logs[logs.length - 1];
          
          // ログエントリの構造検証
          expect(latestLog.gameId).toBe(gameId);
          expect(latestLog.roundNumber).toBe(roundNumber);
          expect(latestLog.phase).toBe(phase);
          expect(latestLog.action).toBe(action);
          // JSON serialization converts undefined to null, so we need to handle this
          const expectedDetails = details === undefined ? undefined : JSON.parse(JSON.stringify(details));
          const expectedResult = result === undefined ? undefined : JSON.parse(JSON.stringify(result));
          expect(latestLog.details).toEqual(expectedDetails);
          expect(latestLog.playerId).toBe(playerId);
          expect(latestLog.result).toEqual(expectedResult);
          
          // タイムスタンプが有効なDateオブジェクトであることを確認
          expect(latestLog.timestamp).toBeInstanceOf(Date);
          expect(latestLog.timestamp.getTime()).not.toBeNaN();
          
          // タイムスタンプが現在時刻に近いことを確認（1秒以内）
          const now = new Date();
          const timeDiff = Math.abs(now.getTime() - latestLog.timestamp.getTime());
          expect(timeDiff).toBeLessThan(1000);
          
          // 複数のログエントリを追加して順序を確認
          const secondAction = `${action}-second`;
          logGameAction(gameId, roundNumber, phase, secondAction, details, playerId, result);
          
          const updatedLogs = getGameLogs(gameId);
          expect(updatedLogs.length).toBe(logs.length + 1);
          
          // ログの順序が保持されていることを確認
          const secondLatestLog = updatedLogs[updatedLogs.length - 1];
          expect(secondLatestLog.action).toBe(secondAction);
          expect(secondLatestLog.timestamp.getTime()).toBeGreaterThanOrEqual(latestLog.timestamp.getTime());
          
          // 異なるゲームIDのログが分離されていることを確認
          const differentGameId = `${gameId}-different`;
          logGameAction(differentGameId, roundNumber, phase, action, details, playerId, result);
          
          const originalGameLogs = getGameLogs(gameId);
          const differentGameLogs = getGameLogs(differentGameId);
          
          expect(originalGameLogs.length).toBe(updatedLogs.length);
          expect(differentGameLogs.length).toBe(1);
          expect(differentGameLogs[0].gameId).toBe(differentGameId);
          
          // ログエントリの完全性確認（全ての選択、結果、詳細が記録されている）
          const allRequiredFields = ['timestamp', 'gameId', 'roundNumber', 'phase', 'action', 'details'];
          allRequiredFields.forEach(field => {
            expect(latestLog).toHaveProperty(field);
          });
          
          // オプションフィールドの適切な処理確認
          expect(latestLog.playerId).toBe(playerId);
          expect(latestLog.result).toEqual(expectedResult);
        }
      ),
      { numRuns: 100 }
    );
  });

  // 補助テスト: ログ記録の詳細機能テスト
  test('ログ記録システムの詳細機能', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 15 }),
        fc.array(fc.record({
          roundNumber: fc.integer({ min: 1, max: 8 }),
          phase: gamePhaseArbitrary,
          action: fc.string({ minLength: 1, maxLength: 20 }),
          details: fc.record({
            playerCount: fc.option(fc.integer({ min: 1, max: 4 })),
            cardId: fc.option(fc.string({ minLength: 1, maxLength: 10 })),
            decision: fc.option(oshikatsuDecisionArbitrary),
            pointsEarned: fc.option(fc.integer({ min: 0, max: 50 }))
          }),
          playerId: fc.option(playerIdArbitrary)
        }), { minLength: 1, maxLength: 10 }),
        (gameId, logEntries) => {
          // 各プロパティテスト実行前にローカルストレージをクリア
          clearAllGameData();
          
          // 複数のログエントリを順次記録
          logEntries.forEach(entry => {
            logGameAction(
              gameId,
              entry.roundNumber,
              entry.phase,
              entry.action,
              entry.details,
              entry.playerId
            );
          });
          
          // 記録されたログを取得
          const logs = getGameLogs(gameId);
          
          // ログ数が一致することを確認
          expect(logs.length).toBeGreaterThanOrEqual(logEntries.length);
          
          // 各ログエントリの詳細確認
          const recentLogs = logs.slice(-logEntries.length);
          recentLogs.forEach((log, index) => {
            const originalEntry = logEntries[index];
            
            expect(log.gameId).toBe(gameId);
            expect(log.roundNumber).toBe(originalEntry.roundNumber);
            expect(log.phase).toBe(originalEntry.phase);
            expect(log.action).toBe(originalEntry.action);
            expect(log.details).toEqual(originalEntry.details);
            expect(log.playerId).toBe(originalEntry.playerId);
            
            // タイムスタンプの順序確認
            if (index > 0) {
              expect(log.timestamp.getTime()).toBeGreaterThanOrEqual(
                recentLogs[index - 1].timestamp.getTime()
              );
            }
          });
          
          // ログの永続性確認（再取得しても同じデータが得られる）
          const reloadedLogs = getGameLogs(gameId);
          expect(reloadedLogs.length).toBe(logs.length);
          
          reloadedLogs.forEach((reloadedLog, index) => {
            const originalLog = logs[index];
            expect(reloadedLog.gameId).toBe(originalLog.gameId);
            expect(reloadedLog.action).toBe(originalLog.action);
            expect(reloadedLog.timestamp.getTime()).toBe(originalLog.timestamp.getTime());
          });
        }
      ),
      { numRuns: 50 }
    );
  });

  // エラーハンドリングのテスト
  test('無効なJSON文字列のデシリアライゼーション', () => {
    const invalidJsonStrings = [
      '',
      'invalid json',
      '{"incomplete": ',
      'null',
      '[]',
      '{"missing": "required fields"}'
    ];
    
    invalidJsonStrings.forEach(invalidJson => {
      expect(() => deserializeGameState(invalidJson)).toThrow();
    });
  });

  test('循環参照を含むオブジェクトのシリアライゼーション', () => {
    // 循環参照を作成（実際のゲームでは発生しないが、堅牢性のテスト）
    const gameSession: any = {
      id: 'test-game',
      players: [],
      currentRound: 1,
      currentPhase: 'setup',
      activePlayerIndex: 0,
      gameState: {
        hanamichiBoardState: { spots: [] },
        oshiPieces: [],
        fanserviceSpotCards: [],
        revealedCards: [],
        rewardDistributionCards: [],
        roundHistory: []
      },
      turnManager: {
        currentPlayer: 0,
        waitingForPlayers: [],
        phaseActions: {}
      },
      createdAt: new Date()
    };
    
    // 循環参照を作成
    gameSession.self = gameSession;
    
    // シリアライゼーションがエラーを適切に処理することを確認
    expect(() => serializeGameState(gameSession)).toThrow();
  });
});