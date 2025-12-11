/**
 * ファンサタイムとポイント計算システムのプロパティベーステスト
 * Feature: oshi-game-testplay
 */

import * as fc from 'fast-check';
import { FanserviceSpotCard, OtakuPiece, BoardSpot } from '../types/game';
import { 
  placeFansaOshiPieces,
  getAdjacentSpots,
  getOppositeSpot,
  calculateBasicPoints,
  calculateUchiwaBonus,
  calculatePenlightBonus,
  applySashiireBonus,
  calculateFansaPoints,
  processFansaTime,
  mapDiceToFanserviceSpot
} from '../utils/gameLogic';

// テスト用のアービトラリ生成
const spotIdArbitrary = fc.integer({ min: 0, max: 7 });
const diceResultArbitrary = fc.integer({ min: 1, max: 6 });
const goodsTypeArbitrary = fc.constantFrom('uchiwa', 'penlight', 'sashiire');
const playerIdArbitrary = fc.string({ minLength: 1, maxLength: 10 }).filter(s => /^[a-zA-Z0-9_-]+$/.test(s));

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

// オタクコマ生成
const otakuPieceArbitrary = fc.record({
  id: fc.string({ minLength: 1, maxLength: 15 }),
  playerId: playerIdArbitrary,
  boardSpotId: fc.option(spotIdArbitrary),
  goods: fc.option(goodsTypeArbitrary),
  isKagebunshin: fc.boolean()
});

// ボードスポット生成
const boardSpotArbitrary = fc.record({
  id: spotIdArbitrary,
  position: fc.record({
    row: fc.integer({ min: 0, max: 1 }),
    col: fc.integer({ min: 0, max: 3 })
  }),
  otakuPieces: fc.array(otakuPieceArbitrary, { maxLength: 3 }),
  oshiPiece: fc.option(fc.record({
    id: fc.constantFrom('A', 'B', 'C'),
    currentSpotId: fc.option(spotIdArbitrary)
  }))
});

// ボード状態生成
const boardStateArbitrary = fc.record({
  spots: fc.array(boardSpotArbitrary, { minLength: 8, maxLength: 8 }).map(spots => 
    spots.map((spot, index) => ({ ...spot, id: index }))
  )
});

describe('ファンサタイムとポイント計算システム プロパティベーステスト', () => {
  /**
   * **Feature: oshi-game-testplay, Property 13: 包括的ポイント計算システム**
   * **Validates: Requirements 6.2, 6.3, 6.4, 6.5**
   */
  test('プロパティ13: 包括的ポイント計算システム', () => {
    fc.assert(
      fc.property(
        fc.array(fanserviceSpotCardArbitrary, { minLength: 3, maxLength: 3 }),
        boardStateArbitrary,
        fc.array(otakuPieceArbitrary, { maxLength: 16 }),
        (revealedCards, boardState, allOtakuPieces) => {
          // サイコロ結果を固定で生成（テスト用）
          const diceResults: [number, number, number] = [2, 4, 6]; // 各推しに対応
          
          // 推しコマの配置を決定
          const oshiPlacements = placeFansaOshiPieces(revealedCards, diceResults);
          
          // ポイント計算を実行
          const pointResults = calculateFansaPoints(oshiPlacements, boardState, allOtakuPieces);
          
          // 基本的な構造検証
          expect(Array.isArray(pointResults)).toBe(true);
          
          pointResults.forEach(result => {
            // 結果の構造検証
            expect(typeof result.playerId).toBe('string');
            expect(typeof result.totalPoints).toBe('number');
            expect(Array.isArray(result.breakdown)).toBe(true);
            
            // ポイントは非負数であること
            expect(result.totalPoints).toBeGreaterThanOrEqual(0);
            
            // 内訳が存在する場合、ポイントも存在すること
            if (result.breakdown.length > 0) {
              expect(result.totalPoints).toBeGreaterThan(0);
            }
            
            // 内訳の各項目が文字列であること
            result.breakdown.forEach(item => {
              expect(typeof item).toBe('string');
              expect(item.length).toBeGreaterThan(0);
            });
          });
          
          // 推しコマの配置検証
          expect(oshiPlacements).toHaveLength(3);
          oshiPlacements.forEach((placement, index) => {
            expect(['A', 'B', 'C']).toContain(placement.oshiId);
            expect(placement.spotId).toBeGreaterThanOrEqual(0);
            expect(placement.spotId).toBeLessThanOrEqual(7);
            
            // サイコロマッピングルールの確認
            const expectedSpotIndex = mapDiceToFanserviceSpot(diceResults[index]);
            const expectedSpotId = revealedCards[index].spots[expectedSpotIndex];
            expect(placement.spotId).toBe(expectedSpotId);
          });
          
          // 基本ポイント計算の検証（6ポイント山分け）
          oshiPlacements.forEach(({ spotId }) => {
            const spot = boardState.spots.find(s => s.id === spotId);
            if (spot && spot.otakuPieces.length > 0) {
              const basicPoints = calculateBasicPoints(spotId, spot.otakuPieces);
              const totalBasicPoints = basicPoints.reduce((sum, p) => sum + p.points, 0);
              
              // 山分けの合計は6ポイント以下であること（端数処理により）
              expect(totalBasicPoints).toBeLessThanOrEqual(6);
              expect(totalBasicPoints).toBeGreaterThan(0);
              
              // 各プレイヤーのポイントは正数であること
              basicPoints.forEach(p => {
                expect(p.points).toBeGreaterThan(0);
                expect(typeof p.playerId).toBe('string');
              });
            }
          });
          
          // 特殊ポイント計算の検証
          oshiPlacements.forEach(({ spotId }) => {
            // うちわボーナス検証
            const uchiwaBonus = calculateUchiwaBonus(spotId, allOtakuPieces);
            uchiwaBonus.forEach(bonus => {
              expect(bonus.points).toBe(1); // うちわボーナスは1ポイント固定
              expect(typeof bonus.playerId).toBe('string');
            });
            
            // ペンライトボーナス検証
            const penlightBonus = calculatePenlightBonus(spotId, allOtakuPieces);
            penlightBonus.forEach(bonus => {
              expect(bonus.points).toBe(1); // ペンライトボーナスは1ポイント固定
              expect(typeof bonus.playerId).toBe('string');
            });
          });
          
          // プレイヤーIDの一意性検証（同じプレイヤーが複数回カウントされていないか）
          const playerIds = pointResults.map(r => r.playerId);
          const uniquePlayerIds = [...new Set(playerIds)];
          expect(uniquePlayerIds).toHaveLength(playerIds.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  // 補助テスト: 個別関数の動作確認
  test('placeFansaOshiPieces 関数の正確性', () => {
    fc.assert(
      fc.property(
        fc.array(fanserviceSpotCardArbitrary, { minLength: 3, maxLength: 3 }),
        fc.tuple(diceResultArbitrary, diceResultArbitrary, diceResultArbitrary),
        (revealedCards, diceResults) => {
          const placements = placeFansaOshiPieces(revealedCards, diceResults);
          
          expect(placements).toHaveLength(3);
          
          placements.forEach((placement, index) => {
            expect(['A', 'B', 'C']).toContain(placement.oshiId);
            expect(placement.oshiId).toBe(['A', 'B', 'C'][index]);
            
            // スポットIDが有効範囲内であること
            expect(placement.spotId).toBeGreaterThanOrEqual(0);
            expect(placement.spotId).toBeLessThanOrEqual(7);
            
            // サイコロマッピングが正しいこと
            const expectedSpotIndex = mapDiceToFanserviceSpot(diceResults[index]);
            const expectedSpotId = revealedCards[index].spots[expectedSpotIndex];
            expect(placement.spotId).toBe(expectedSpotId);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  test('getAdjacentSpots 関数の正確性', () => {
    fc.assert(
      fc.property(
        spotIdArbitrary,
        (spotId) => {
          const adjacentSpots = getAdjacentSpots(spotId);
          
          // 隣接スポットは最大4個、最小2個（角の場合）
          expect(adjacentSpots.length).toBeGreaterThanOrEqual(2);
          expect(adjacentSpots.length).toBeLessThanOrEqual(4);
          
          // 全ての隣接スポットが有効範囲内であること
          adjacentSpots.forEach(adjSpot => {
            expect(adjSpot).toBeGreaterThanOrEqual(0);
            expect(adjSpot).toBeLessThanOrEqual(7);
            expect(adjSpot).not.toBe(spotId); // 自分自身は含まれない
          });
          
          // 重複がないこと
          const uniqueSpots = [...new Set(adjacentSpots)];
          expect(uniqueSpots).toHaveLength(adjacentSpots.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('getOppositeSpot 関数の正確性', () => {
    fc.assert(
      fc.property(
        spotIdArbitrary,
        (spotId) => {
          const oppositeSpot = getOppositeSpot(spotId);
          
          if (oppositeSpot !== null) {
            // 向かい側スポットが有効範囲内であること
            expect(oppositeSpot).toBeGreaterThanOrEqual(0);
            expect(oppositeSpot).toBeLessThanOrEqual(7);
            expect(oppositeSpot).not.toBe(spotId);
            
            // 行が反対であること（0 <-> 1）
            const originalRow = Math.floor(spotId / 4);
            const oppositeRow = Math.floor(oppositeSpot / 4);
            expect(originalRow + oppositeRow).toBe(1); // 0+1=1 または 1+0=1
            
            // 列が同じであること
            const originalCol = spotId % 4;
            const oppositeCol = oppositeSpot % 4;
            expect(originalCol).toBe(oppositeCol);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('calculateBasicPoints 山分け計算の正確性', () => {
    fc.assert(
      fc.property(
        spotIdArbitrary,
        fc.array(otakuPieceArbitrary, { minLength: 1, maxLength: 5 }),
        (spotId, otakuPieces) => {
          const basicPoints = calculateBasicPoints(spotId, otakuPieces);
          
          // 結果の数がオタクコマの数と一致すること
          expect(basicPoints).toHaveLength(otakuPieces.length);
          
          // 合計ポイントが6であること
          const totalPoints = basicPoints.reduce((sum, p) => sum + p.points, 0);
          expect(totalPoints).toBe(6);
          
          // 各プレイヤーのポイントが正数であること
          basicPoints.forEach(result => {
            expect(result.points).toBeGreaterThan(0);
            expect(typeof result.playerId).toBe('string');
          });
          
          // プレイヤーIDがオタクコマのプレイヤーIDと一致すること
          const resultPlayerIds = basicPoints.map(r => r.playerId).sort();
          const expectedPlayerIds = otakuPieces.map(p => p.playerId).sort();
          expect(resultPlayerIds).toEqual(expectedPlayerIds);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: oshi-game-testplay, Property 14: サイコロマッピングルールの適用**
   * **Validates: Requirements 9.2**
   */
  test('プロパティ14: サイコロマッピングルールの適用', () => {
    fc.assert(
      fc.property(
        diceResultArbitrary,
        (diceResult) => {
          const spotIndex = mapDiceToFanserviceSpot(diceResult);
          
          // サイコロマッピングルールの検証
          if (diceResult <= 2) {
            expect(spotIndex).toBe(0); // スポット1 (インデックス0)
          } else if (diceResult <= 4) {
            expect(spotIndex).toBe(1); // スポット2 (インデックス1)
          } else {
            expect(spotIndex).toBe(2); // スポット3 (インデックス2)
          }
          
          // スポットインデックスが有効範囲内であること
          expect(spotIndex).toBeGreaterThanOrEqual(0);
          expect(spotIndex).toBeLessThanOrEqual(2);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('applySashiireBonus 差し入れ倍化の正確性', () => {
    fc.assert(
      fc.property(
        spotIdArbitrary,
        fc.array(otakuPieceArbitrary, { minLength: 1, maxLength: 3 }),
        fc.array(fc.record({
          playerId: playerIdArbitrary,
          points: fc.integer({ min: 1, max: 10 })
        }), { minLength: 1, maxLength: 3 }),
        (spotId, otakuPieces, basicPointResults) => {
          const sashiireResults = applySashiireBonus(spotId, otakuPieces, basicPointResults);
          
          // 結果の数が基本ポイント結果と一致すること
          expect(sashiireResults).toHaveLength(basicPointResults.length);
          
          sashiireResults.forEach((result, index) => {
            const originalResult = basicPointResults[index];
            const hasSashiire = otakuPieces.some(piece => 
              piece.playerId === result.playerId && piece.goods === 'sashiire'
            );
            
            if (hasSashiire) {
              // 差し入れを持っている場合は2倍
              expect(result.points).toBe(originalResult.points * 2);
            } else {
              // 差し入れを持っていない場合は元のまま
              expect(result.points).toBe(originalResult.points);
            }
            
            expect(result.playerId).toBe(originalResult.playerId);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: oshi-game-testplay, Property 15: 山分け計算の端数処理**
   * **Validates: Requirements 9.3**
   */
  test('プロパティ15: 山分け計算の端数処理', () => {
    fc.assert(
      fc.property(
        spotIdArbitrary,
        fc.array(otakuPieceArbitrary, { minLength: 1, maxLength: 10 }).map(pieces => 
          // プレイヤーIDを一意にするため、インデックスを使用
          pieces.map((piece, index) => ({ ...piece, playerId: `player-${index}` }))
        ),
        (spotId, otakuPieces) => {
          const basicPoints = calculateBasicPoints(spotId, otakuPieces);
          
          // 山分け計算の端数処理検証
          const totalPoints = basicPoints.reduce((sum, p) => sum + p.points, 0);
          
          // 合計ポイントは常に6であること（端数処理により）
          expect(totalPoints).toBe(6);
          
          // 各プレイヤーのポイントは非負の整数であること
          basicPoints.forEach(result => {
            expect(result.points).toBeGreaterThanOrEqual(0);
            expect(Number.isInteger(result.points)).toBe(true);
          });
          
          // 端数処理の正確性検証
          const expectedPointsPerPiece = Math.floor(6 / otakuPieces.length);
          const remainder = 6 % otakuPieces.length;
          
          // 端数がある場合、最初のremainder個のピースは1ポイント多く受け取る
          basicPoints.forEach((result, index) => {
            if (index < remainder) {
              expect(result.points).toBe(expectedPointsPerPiece + 1);
            } else {
              expect(result.points).toBe(expectedPointsPerPiece);
            }
          });
          
          // プレイヤーIDの一意性（同じプレイヤーが複数回カウントされていないか）
          const playerIds = basicPoints.map(r => r.playerId);
          const uniquePlayerIds = [...new Set(playerIds)];
          expect(uniquePlayerIds).toHaveLength(playerIds.length);
          
          // 結果の数がオタクコマの数と一致すること
          expect(basicPoints).toHaveLength(otakuPieces.length);
        }
      ),
      { numRuns: 100 }
    );
  });
});