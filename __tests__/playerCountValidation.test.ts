/**
 * プレイヤー数制限の遵守のプロパティベーステスト
 * Feature: oshi-game-testplay
 */

import * as fc from 'fast-check';
import { validatePlayerCount } from '../utils/errorHandling';
import { Player, PlayerColor } from '../types/game';

// テスト用のプレイヤー生成
const playerArbitrary = fc.record({
  id: fc.string({ minLength: 1, maxLength: 10 })
    .filter(s => /^[a-zA-Z0-9_-]+$/.test(s))
    .filter(s => !['__proto__', 'constructor', 'prototype', 'toString', 'valueOf'].includes(s)),
  name: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
  color: fc.constantFrom('red', 'blue', 'green', 'yellow') as fc.Arbitrary<PlayerColor>,
  money: fc.constant(3), // 初期資金は3金
  points: fc.constant(0), // 初期ポイントは0
  otakuPieces: fc.constant([]), // 初期化時は空配列
  selectedRewardCard: fc.constant(undefined),
  oshikatsuDecision: fc.constant(undefined)
});

describe('プレイヤー数制限の遵守 プロパティベーステスト', () => {
  /**
   * **Feature: oshi-game-testplay, Property 1: プレイヤー数制限の遵守**
   * **Validates: Requirements 1.2**
   */
  test('プロパティ1: プレイヤー数制限の遵守', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10 }), // 0から10人までのプレイヤー数をテスト
        (playerCount) => {
          const validationResult = validatePlayerCount(playerCount);
          
          if (playerCount >= 1 && playerCount <= 4) {
            // 1-4人の場合はエラーなし
            expect(validationResult).toBeNull();
          } else {
            // 0人または5人以上の場合はエラーあり
            expect(validationResult).not.toBeNull();
            expect(validationResult?.type).toBe('user-input');
            expect(validationResult?.message).toBe('プレイヤー数は1人から4人までです');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * 補完テスト: 実際のプレイヤー配列での制限テスト
   */
  test('プロパティ1補完: 実際のプレイヤー配列での制限テスト', () => {
    fc.assert(
      fc.property(
        fc.array(playerArbitrary, { minLength: 0, maxLength: 8 }),
        (players) => {
          // プレイヤー名の重複を排除
          const uniquePlayers = players.filter((player, index, arr) => 
            arr.findIndex(p => p.name.toLowerCase() === player.name.toLowerCase()) === index
          );
          
          const playerCount = uniquePlayers.length;
          const validationResult = validatePlayerCount(playerCount);
          
          if (playerCount >= 1 && playerCount <= 4) {
            // 有効なプレイヤー数の場合
            expect(validationResult).toBeNull();
            
            // プレイヤー配列の長さが制限内であることを確認
            expect(uniquePlayers.length).toBeGreaterThanOrEqual(1);
            expect(uniquePlayers.length).toBeLessThanOrEqual(4);
            
            // 各プレイヤーが有効な初期状態であることを確認
            uniquePlayers.forEach(player => {
              expect(player.money).toBe(3); // 初期資金3金
              expect(player.points).toBe(0); // 初期ポイント0
              expect(player.otakuPieces).toEqual([]); // 初期オタクコマは空
              expect(['red', 'blue', 'green', 'yellow']).toContain(player.color);
            });
          } else {
            // 無効なプレイヤー数の場合
            expect(validationResult).not.toBeNull();
            expect(validationResult?.type).toBe('user-input');
            expect(validationResult?.message).toBe('プレイヤー数は1人から4人までです');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * エッジケース: 境界値テスト
   */
  test('プロパティ1エッジケース: 境界値での動作確認', () => {
    // 0人の場合
    const zeroPlayersResult = validatePlayerCount(0);
    expect(zeroPlayersResult).not.toBeNull();
    expect(zeroPlayersResult?.message).toBe('プレイヤー数は1人から4人までです');

    // 1人の場合（最小有効値）
    const onePlayerResult = validatePlayerCount(1);
    expect(onePlayerResult).toBeNull();

    // 4人の場合（最大有効値）
    const fourPlayersResult = validatePlayerCount(4);
    expect(fourPlayersResult).toBeNull();

    // 5人の場合（最小無効値）
    const fivePlayersResult = validatePlayerCount(5);
    expect(fivePlayersResult).not.toBeNull();
    expect(fivePlayersResult?.message).toBe('プレイヤー数は1人から4人までです');

    // 負の値の場合
    const negativeResult = validatePlayerCount(-1);
    expect(negativeResult).not.toBeNull();
    expect(negativeResult?.message).toBe('プレイヤー数は1人から4人までです');
  });
});