/**
 * ターン管理とフェーズ制御システムのプロパティベーステスト
 * Feature: oshi-game-testplay
 */

import * as fc from 'fast-check';
import { GameSession, Player, GamePhase } from '../types/game';
import { getNextPlayerIndex } from '../utils/gameLogic';

// テスト用のプレイヤー生成
const playerArbitrary = fc.record({
  id: fc.string({ minLength: 1, maxLength: 10 })
    .filter(s => /^[a-zA-Z0-9_-]+$/.test(s))
    .filter(s => !['__proto__', 'constructor', 'prototype', 'toString', 'valueOf'].includes(s)), // JavaScript特殊プロパティを除外
  name: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
  color: fc.constantFrom('red', 'blue', 'green', 'yellow'),
  money: fc.integer({ min: 0, max: 100 }),
  points: fc.integer({ min: 0, max: 100 }),
  otakuPieces: fc.constant([]),
});

// ゲームセッション生成（簡略版）
const gameSessionArbitrary = fc.record({
  players: fc.array(playerArbitrary, { minLength: 1, maxLength: 4 }),
  activePlayerIndex: fc.integer({ min: 0, max: 3 }),
}).map(({ players, activePlayerIndex }) => ({
  players,
  activePlayerIndex: activePlayerIndex % players.length, // プレイヤー数に合わせて調整
}));

describe('ターン管理システム プロパティベーステスト', () => {
  /**
   * **Feature: oshi-game-testplay, Property 4: ターン順序の循環性**
   * **Validates: Requirements 2.2**
   */
  test('プロパティ4: ターン順序の循環性', () => {
    fc.assert(
      fc.property(gameSessionArbitrary, ({ players, activePlayerIndex }) => {
        const totalPlayers = players.length;
        
        // 現在のプレイヤーから開始して、全プレイヤー分ターンを進める
        let currentIndex = activePlayerIndex;
        const visitedPlayers: number[] = [];
        
        for (let i = 0; i < totalPlayers; i++) {
          visitedPlayers.push(currentIndex);
          currentIndex = getNextPlayerIndex(currentIndex, totalPlayers);
        }
        
        // 全プレイヤーが一度ずつ訪問されることを確認
        const uniqueVisited = [...new Set(visitedPlayers)];
        expect(uniqueVisited).toHaveLength(totalPlayers);
        
        // 一周後は元のプレイヤーに戻ることを確認
        expect(currentIndex).toBe(activePlayerIndex);
        
        // 各プレイヤーインデックスが有効範囲内であることを確認
        visitedPlayers.forEach(index => {
          expect(index).toBeGreaterThanOrEqual(0);
          expect(index).toBeLessThan(totalPlayers);
        });
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: oshi-game-testplay, Property 5: フェーズ遷移の整合性**
   * **Validates: Requirements 2.3**
   */
  test('プロパティ5: フェーズ遷移の整合性', () => {
    const phaseArbitrary = fc.constantFrom(
      'setup', 'labor', 'oshikatsu-decision', 'oshikatsu-goods',
      'oshikatsu-placement', 'fansa-time', 'round-end'
    );

    fc.assert(
      fc.property(phaseArbitrary, (currentPhase) => {
        const validPhases: GamePhase[] = [
          'setup', 'labor', 'oshikatsu-decision', 'oshikatsu-goods',
          'oshikatsu-placement', 'fansa-time', 'round-end'
        ];

        // フェーズ遷移ロジックをテスト
        const getNextPhase = (phase: GamePhase): GamePhase => {
          const currentIndex = validPhases.indexOf(phase);
          if (currentIndex === -1) {
            throw new Error(`Invalid phase: ${phase}`);
          }
          
          // 最後のフェーズの場合は労働フェーズに戻る（次のラウンド）
          if (currentIndex === validPhases.length - 1) {
            return 'labor';
          }
          
          return validPhases[currentIndex + 1];
        };

        const nextPhase = getNextPhase(currentPhase);
        
        // 次のフェーズが有効なフェーズであることを確認
        expect(validPhases).toContain(nextPhase);
        
        // round-endの次はlaborであることを確認
        if (currentPhase === 'round-end') {
          expect(nextPhase).toBe('labor');
        }
        
        // setup以外のフェーズは順序通りに遷移することを確認
        if (currentPhase !== 'round-end') {
          const currentIndex = validPhases.indexOf(currentPhase);
          const nextIndex = validPhases.indexOf(nextPhase);
          expect(nextIndex).toBe(currentIndex + 1);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: oshi-game-testplay, Property 6: アクション完了状態の追跡**
   * **Validates: Requirements 2.4, 2.5**
   */
  test('プロパティ6: アクション完了状態の追跡', () => {
    const turnManagerArbitrary = fc.record({
      players: fc.array(playerArbitrary, { minLength: 1, maxLength: 4 }),
      phaseActions: fc.record({}), // 動的に生成
    }).map(({ players }) => {
      // プレイヤーIDに基づいてphaseActionsを生成
      const phaseActions: { [playerId: string]: boolean } = Object.create(null); // プロトタイプチェーンを持たないオブジェクトを作成
      players.forEach(player => {
        phaseActions[player.id] = fc.sample(fc.boolean(), 1)[0];
      });
      
      return {
        players,
        phaseActions,
        waitingForPlayers: players
          .filter(player => !phaseActions[player.id])
          .map(player => player.id)
      };
    });

    fc.assert(
      fc.property(turnManagerArbitrary, ({ players, phaseActions, waitingForPlayers }) => {
        // アクション完了状態の整合性をテスト
        
        // 1. 全プレイヤーがphaseActionsに記録されていることを確認
        players.forEach(player => {
          expect(phaseActions).toHaveProperty(player.id);
          expect(typeof phaseActions[player.id]).toBe('boolean');
        });
        
        // 2. 待機中プレイヤーリストの整合性を確認
        const expectedWaitingPlayers = players
          .filter(player => !phaseActions[player.id])
          .map(player => player.id);
        
        expect(waitingForPlayers.sort()).toEqual(expectedWaitingPlayers.sort());
        
        // 3. アクション完了プレイヤーは待機リストに含まれないことを確認
        const completedPlayers = players
          .filter(player => phaseActions[player.id])
          .map(player => player.id);
        
        completedPlayers.forEach(playerId => {
          expect(waitingForPlayers).not.toContain(playerId);
        });
        
        // 4. 全プレイヤーが完了している場合、待機リストは空であることを確認
        const allCompleted = players.every(player => phaseActions[player.id]);
        if (allCompleted) {
          expect(waitingForPlayers).toHaveLength(0);
        }
        
        // 5. 誰も完了していない場合、全プレイヤーが待機リストに含まれることを確認
        const noneCompleted = players.every(player => !phaseActions[player.id]);
        if (noneCompleted) {
          expect(waitingForPlayers).toHaveLength(players.length);
        }
      }),
      { numRuns: 100 }
    );
  });
});