/**
 * 労働フェーズのプロパティベーステスト
 * Feature: oshi-game-testplay
 */

import * as fc from 'fast-check';
import { Player, RewardDistributionCard } from '../types/game';
import { 
  createRewardDistributionCards, 
  calculateLaborReward, 
  updatePlayerMoney, 
  processLaborPhase 
} from '../utils/gameLogic';

// テスト用のプレイヤー生成
const playerArbitrary = fc.record({
  id: fc.string({ minLength: 1, maxLength: 10 }).filter(s => /^[a-zA-Z0-9_-]+$/.test(s)),
  name: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
  color: fc.constantFrom('red', 'blue', 'green', 'yellow'),
  money: fc.integer({ min: 0, max: 100 }),
  points: fc.integer({ min: 0, max: 100 }),
  otakuPieces: fc.constant([] as any[]),
});

// 報酬配分カード選択済みプレイヤー生成
const playerWithCardArbitrary = fc.tuple(playerArbitrary, fc.constantFrom(...createRewardDistributionCards()))
  .map(([player, card]) => ({
    ...player,
    selectedRewardCard: card
  }));

// サイコロの目（1-6）
const diceResultArbitrary = fc.integer({ min: 1, max: 6 });

describe('労働フェーズ プロパティベーステスト', () => {
  /**
   * **Feature: oshi-game-testplay, Property 7: 報酬計算と資金更新の一貫性**
   * **Validates: Requirements 3.4, 3.5**
   */
  test('プロパティ7: 報酬計算と資金更新の一貫性', () => {
    fc.assert(
      fc.property(
        fc.array(playerWithCardArbitrary, { minLength: 1, maxLength: 4 }),
        diceResultArbitrary,
        (players, diceResult) => {
          // 各プレイヤーが有効な報酬配分カードを持っていることを確認
          players.forEach(player => {
            expect(player.selectedRewardCard).toBeDefined();
            expect(player.selectedRewardCard!.name).toMatch(/^[A-F]$/);
          });

          // 労働フェーズを処理
          const { updatedPlayers, laborResults } = processLaborPhase(players, diceResult);

          // 結果の検証
          expect(updatedPlayers).toHaveLength(players.length);
          expect(laborResults).toHaveLength(players.length);

          // 各プレイヤーについて検証
          for (let i = 0; i < players.length; i++) {
            const originalPlayer = players[i];
            const updatedPlayer = updatedPlayers[i];
            const laborResult = laborResults[i];

            // 報酬計算の正確性を検証
            const expectedReward = calculateLaborReward(originalPlayer.selectedRewardCard!, diceResult);
            expect(laborResult.reward).toBe(expectedReward);
            expect(laborResult.playerId).toBe(originalPlayer.id);
            expect(laborResult.selectedCard).toBe(originalPlayer.selectedRewardCard!.name);
            expect(laborResult.diceResult).toBe(diceResult);

            // 資金更新の正確性を検証
            const expectedMoney = Math.max(0, originalPlayer.money + expectedReward);
            expect(updatedPlayer.money).toBe(expectedMoney);

            // その他のプレイヤー属性が保持されていることを確認
            expect(updatedPlayer.id).toBe(originalPlayer.id);
            expect(updatedPlayer.name).toBe(originalPlayer.name);
            expect(updatedPlayer.color).toBe(originalPlayer.color);
            expect(updatedPlayer.points).toBe(originalPlayer.points);
            expect(updatedPlayer.otakuPieces).toEqual(originalPlayer.otakuPieces);
            expect(updatedPlayer.selectedRewardCard).toEqual(originalPlayer.selectedRewardCard);
          }

          // 報酬配分カードの有効性を検証
          const rewardCards = createRewardDistributionCards();
          players.forEach(player => {
            const card = player.selectedRewardCard!;
            const matchingCard = rewardCards.find(c => c.id === card.id);
            expect(matchingCard).toBeDefined();
            
            // カードの報酬値が有効範囲内であることを確認
            Object.values(card.rewards).forEach(reward => {
              expect(reward).toBeGreaterThanOrEqual(0);
              expect(reward).toBeLessThanOrEqual(10); // 合理的な上限
            });
          });

          // サイコロ結果が有効範囲内であることを確認
          expect(diceResult).toBeGreaterThanOrEqual(1);
          expect(diceResult).toBeLessThanOrEqual(6);

          // 資金が負の値にならないことを確認
          updatedPlayers.forEach(player => {
            expect(player.money).toBeGreaterThanOrEqual(0);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  // 補助テスト: 個別関数の動作確認
  test('calculateLaborReward 関数の正確性', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...createRewardDistributionCards()),
        diceResultArbitrary,
        (card, diceResult) => {
          const reward = calculateLaborReward(card, diceResult);
          const expectedReward = card.rewards[diceResult as keyof typeof card.rewards];
          
          expect(reward).toBe(expectedReward);
          expect(reward).toBeGreaterThanOrEqual(0);
          expect(typeof reward).toBe('number');
        }
      ),
      { numRuns: 100 }
    );
  });

  test('updatePlayerMoney 関数の正確性', () => {
    fc.assert(
      fc.property(
        playerArbitrary,
        fc.integer({ min: -50, max: 50 }), // 負の値も含む
        (player, amount) => {
          const updatedPlayer = updatePlayerMoney(player, amount);
          const expectedMoney = Math.max(0, player.money + amount);
          
          expect(updatedPlayer.money).toBe(expectedMoney);
          expect(updatedPlayer.money).toBeGreaterThanOrEqual(0);
          
          // その他の属性が変更されていないことを確認
          expect(updatedPlayer.id).toBe(player.id);
          expect(updatedPlayer.name).toBe(player.name);
          expect(updatedPlayer.color).toBe(player.color);
          expect(updatedPlayer.points).toBe(player.points);
          expect(updatedPlayer.otakuPieces).toEqual(player.otakuPieces);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('報酬配分カードの構造検証', () => {
    const cards = createRewardDistributionCards();
    
    // カード数の確認
    expect(cards).toHaveLength(6);
    
    // 各カードの構造確認
    cards.forEach(card => {
      expect(card.id).toBeDefined();
      expect(card.name).toMatch(/^[A-F]$/);
      expect(card.rewards).toBeDefined();
      
      // 全てのサイコロの目（1-6）に対する報酬が定義されていることを確認
      for (let dice = 1; dice <= 6; dice++) {
        expect(card.rewards[dice as keyof typeof card.rewards]).toBeDefined();
        expect(typeof card.rewards[dice as keyof typeof card.rewards]).toBe('number');
        expect(card.rewards[dice as keyof typeof card.rewards]).toBeGreaterThanOrEqual(0);
      }
    });
    
    // カード名の重複がないことを確認
    const cardNames = cards.map(card => card.name);
    const uniqueNames = [...new Set(cardNames)];
    expect(uniqueNames).toHaveLength(cardNames.length);
  });
});