/**
 * ファンサスポットカードシステムのプロパティベーステスト
 * Feature: oshi-game-testplay
 */

import * as fc from 'fast-check';
import { FanserviceSpotCard } from '../types/game';
import { 
  generateAllFanserviceSpotCombinations,
  createAllFanserviceSpotCards,
  selectRandomFanserviceSpotCards,
  randomizeCardOrientation,
  randomizeCardRotation,
  applyRandomCardProperties,
  prepareOshikatsuPhaseCards,
  mapDiceToFanserviceSpot
} from '../utils/gameLogic';

describe('ファンサスポットカードシステム プロパティベーステスト', () => {
  /**
   * **Feature: oshi-game-testplay, Property 10: ファンサスポットカードのランダム生成**
   * **Validates: Requirements 5.1, 5.2**
   */
  test('プロパティ10: ファンサスポットカードのランダム生成', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }), // テスト実行回数
        (testRun) => {
          // 推し活フェーズ用のカード3枚を準備
          const revealedCards = prepareOshikatsuPhaseCards();
          
          // 基本的な構造検証
          expect(revealedCards).toHaveLength(3);
          
          revealedCards.forEach((card, index) => {
            // カードの基本構造を確認
            expect(card.id).toBeDefined();
            expect(typeof card.id).toBe('string');
            expect(card.spots).toHaveLength(3);
            expect(card.orientation).toMatch(/^(front|back)$/);
            expect([0, 90, 180, 270]).toContain(card.rotation);
            
            // スポットが有効な範囲内（0-7）であることを確認
            card.spots.forEach(spot => {
              expect(spot).toBeGreaterThanOrEqual(0);
              expect(spot).toBeLessThanOrEqual(7);
            });
            
            // スポットが昇順でソートされていることを確認（重複なし）
            const sortedSpots = [...card.spots].sort((a, b) => a - b);
            expect(card.spots).toEqual(sortedSpots);
            
            // スポットに重複がないことを確認
            const uniqueSpots = [...new Set(card.spots)];
            expect(uniqueSpots).toHaveLength(3);
          });
          
          // カード間で重複がないことを確認（同じ組み合わせが選ばれていない）
          const cardCombinations = revealedCards.map(card => 
            card.spots.join(',')
          );
          const uniqueCombinations = [...new Set(cardCombinations)];
          expect(uniqueCombinations).toHaveLength(revealedCards.length);
          
          // 表裏と向きがランダムに決定されていることを確認
          // （複数回実行して異なる結果が出ることを期待）
          const orientations = revealedCards.map(card => card.orientation);
          const rotations = revealedCards.map(card => card.rotation);
          
          // 少なくとも有効な値が設定されていることを確認
          orientations.forEach(orientation => {
            expect(['front', 'back']).toContain(orientation);
          });
          
          rotations.forEach(rotation => {
            expect([0, 90, 180, 270]).toContain(rotation);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: oshi-game-testplay, Property 16: ファンサスポット組み合わせの完全性**
   * **Validates: Requirements 9.1**
   */
  test('プロパティ16: ファンサスポット組み合わせの完全性', () => {
    fc.assert(
      fc.property(
        fc.constant(true), // ダミープロパティ（組み合わせ生成は決定的）
        () => {
          // 全28通りの組み合わせを生成
          const combinations = generateAllFanserviceSpotCombinations();
          
          // 組み合わせ数の確認（8C3 = 56通りではなく、28通りが正しい）
          // 実際は8マス中3マスの組み合わせは8!/(3!*5!) = 56通り
          expect(combinations).toHaveLength(56);
          
          // 各組み合わせの検証
          combinations.forEach(combination => {
            // 3つのスポットが含まれていることを確認
            expect(combination).toHaveLength(3);
            
            // スポットが0-7の範囲内であることを確認
            combination.forEach(spot => {
              expect(spot).toBeGreaterThanOrEqual(0);
              expect(spot).toBeLessThanOrEqual(7);
            });
            
            // スポットが昇順でソートされていることを確認
            expect(combination[0]).toBeLessThan(combination[1]);
            expect(combination[1]).toBeLessThan(combination[2]);
            
            // 重複がないことを確認
            const uniqueSpots = [...new Set(combination)];
            expect(uniqueSpots).toHaveLength(3);
          });
          
          // 組み合わせに重複がないことを確認
          const combinationStrings = combinations.map(combo => combo.join(','));
          const uniqueCombinationStrings = [...new Set(combinationStrings)];
          expect(uniqueCombinationStrings).toHaveLength(combinations.length);
          
          // 全ての可能な組み合わせが含まれていることを確認
          // 手動で一部の組み合わせをチェック
          const expectedCombinations = [
            [0, 1, 2], [0, 1, 3], [0, 1, 4], [0, 1, 5], [0, 1, 6], [0, 1, 7],
            [0, 2, 3], [0, 2, 4], [0, 2, 5], [0, 2, 6], [0, 2, 7],
            [0, 3, 4], [0, 3, 5], [0, 3, 6], [0, 3, 7],
            [0, 4, 5], [0, 4, 6], [0, 4, 7],
            [0, 5, 6], [0, 5, 7],
            [0, 6, 7]
          ];
          
          expectedCombinations.forEach(expected => {
            const found = combinations.find(combo => 
              combo[0] === expected[0] && 
              combo[1] === expected[1] && 
              combo[2] === expected[2]
            );
            expect(found).toBeDefined();
          });
        }
      ),
      { numRuns: 1 } // 決定的な処理なので1回のみ実行
    );
  });

  // 補助テスト: 個別関数の動作確認
  test('createAllFanserviceSpotCards 関数の正確性', () => {
    const allCards = createAllFanserviceSpotCards();
    
    // カード数の確認
    expect(allCards).toHaveLength(56); // 8C3 = 56
    
    // 各カードの構造確認
    allCards.forEach((card, index) => {
      expect(card.id).toBe(`fanservice-card-${index + 1}`);
      expect(card.spots).toHaveLength(3);
      expect(card.orientation).toBe('front'); // デフォルト値
      expect(card.rotation).toBe(0); // デフォルト値
      
      // スポットの有効性確認
      card.spots.forEach(spot => {
        expect(spot).toBeGreaterThanOrEqual(0);
        expect(spot).toBeLessThanOrEqual(7);
      });
      
      // スポットの順序確認
      expect(card.spots[0]).toBeLessThan(card.spots[1]);
      expect(card.spots[1]).toBeLessThan(card.spots[2]);
    });
  });

  test('selectRandomFanserviceSpotCards 関数の正確性', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }), // 選択するカード数
        (count) => {
          const allCards = createAllFanserviceSpotCards();
          
          // カード数が利用可能数を超えない場合のみテスト
          if (count <= allCards.length) {
            const selectedCards = selectRandomFanserviceSpotCards(allCards, count);
            
            // 選択されたカード数の確認
            expect(selectedCards).toHaveLength(count);
            
            // 選択されたカードが元のカードセットに含まれていることを確認
            selectedCards.forEach(selectedCard => {
              const found = allCards.find(card => card.id === selectedCard.id);
              expect(found).toBeDefined();
            });
            
            // 重複がないことを確認
            const cardIds = selectedCards.map(card => card.id);
            const uniqueIds = [...new Set(cardIds)];
            expect(uniqueIds).toHaveLength(count);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('randomizeCardOrientation 関数の正確性', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }), // テスト実行回数
        () => {
          const orientation = randomizeCardOrientation();
          expect(['front', 'back']).toContain(orientation);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('randomizeCardRotation 関数の正確性', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }), // テスト実行回数
        () => {
          const rotation = randomizeCardRotation();
          expect([0, 90, 180, 270]).toContain(rotation);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('applyRandomCardProperties 関数の正確性', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.string({ minLength: 1, maxLength: 20 }),
          spots: fc.tuple(
            fc.integer({ min: 0, max: 7 }),
            fc.integer({ min: 0, max: 7 }),
            fc.integer({ min: 0, max: 7 })
          ).filter(([a, b, c]) => a < b && b < c), // 昇順で重複なし
          orientation: fc.constantFrom('front', 'back'),
          rotation: fc.constantFrom(0, 90, 180, 270)
        }),
        (originalCard) => {
          const updatedCard = applyRandomCardProperties(originalCard);
          
          // 基本属性が保持されていることを確認
          expect(updatedCard.id).toBe(originalCard.id);
          expect(updatedCard.spots).toEqual(originalCard.spots);
          
          // ランダム属性が有効な値に設定されていることを確認
          expect(['front', 'back']).toContain(updatedCard.orientation);
          expect([0, 90, 180, 270]).toContain(updatedCard.rotation);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('mapDiceToFanserviceSpot 関数の正確性', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 6 }), // サイコロの出目
        (diceResult) => {
          const spotIndex = mapDiceToFanserviceSpot(diceResult);
          
          // 正しいマッピングルールの確認
          if (diceResult <= 2) {
            expect(spotIndex).toBe(0); // スポット1
          } else if (diceResult <= 4) {
            expect(spotIndex).toBe(1); // スポット2
          } else {
            expect(spotIndex).toBe(2); // スポット3
          }
          
          // 結果が有効範囲内であることを確認
          expect(spotIndex).toBeGreaterThanOrEqual(0);
          expect(spotIndex).toBeLessThanOrEqual(2);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('mapDiceToFanserviceSpot エラーハンドリング', () => {
    // 無効なサイコロの出目でエラーが発生することを確認
    expect(() => mapDiceToFanserviceSpot(0)).toThrow('Invalid dice result: 0');
    expect(() => mapDiceToFanserviceSpot(7)).toThrow('Invalid dice result: 7');
    expect(() => mapDiceToFanserviceSpot(-1)).toThrow('Invalid dice result: -1');
  });
});