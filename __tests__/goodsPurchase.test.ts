/**
 * **Feature: oshi-game-testplay, Property 11: グッズ購入処理の整合性**
 * **Validates: Requirements 5.3**
 * 
 * Property-based tests for goods purchase system consistency
 */

import fc from 'fast-check';
import { GameSession, Player, GoodsType, OtakuPiece } from '../types/game';
import { GameProvider, useGame } from '../contexts/GameContext';
import { renderHook, act } from '@testing-library/react';
import React from 'react';

// Test wrapper component for GameProvider
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return React.createElement(GameProvider, null, children);
};

// Helper function to create a test player with specified money and otaku pieces
const createTestPlayer = (id: string, money: number, availablePieces: number): Player => {
  const otakuPieces: OtakuPiece[] = [];
  
  // Create available pieces (without goods, not on board)
  for (let i = 0; i < availablePieces; i++) {
    otakuPieces.push({
      id: `${id}-otaku${i + 1}`,
      playerId: id,
      boardSpotId: undefined,
      goods: undefined,
      isKagebunshin: false
    });
  }
  
  // Add some pieces with goods or on board to test edge cases
  for (let i = availablePieces; i < 4; i++) {
    otakuPieces.push({
      id: `${id}-otaku${i + 1}`,
      playerId: id,
      boardSpotId: i % 2 === 0 ? 0 : undefined, // Some on board
      goods: i % 2 === 1 ? 'uchiwa' : undefined, // Some with goods
      isKagebunshin: false
    });
  }

  return {
    id,
    name: `Player ${id}`,
    color: 'red',
    money,
    points: 0,
    otakuPieces
  };
};

// Arbitraries for property-based testing
const goodsTypeArb = fc.constantFrom<GoodsType>('uchiwa', 'penlight', 'sashiire');
const moneyArb = fc.integer({ min: 0, max: 10 });
const availablePiecesArb = fc.integer({ min: 0, max: 4 });

describe('Goods Purchase Property Tests', () => {
  /**
   * Property 11: グッズ購入処理の整合性
   * For any goods purchase, the required funds are consumed and the corresponding goods chip is accurately granted
   */
  test('Property 11: Goods purchase processing consistency', () => {
    fc.assert(
      fc.property(
        goodsTypeArb,
        moneyArb,
        availablePiecesArb,
        (goodsType, initialMoney, availablePieces) => {
          const { result } = renderHook(() => useGame(), { wrapper: TestWrapper });
          
          // Initialize game with test player
          const testPlayer = createTestPlayer('test-player', initialMoney, availablePieces);
          
          act(() => {
            result.current.initializeGame([testPlayer]);
          });

          const gameSession = result.current.gameSession;
          if (!gameSession) return false;

          // Get initial state
          const initialPlayer = gameSession.players.find(p => p.id === 'test-player');
          if (!initialPlayer) return false;

          const initialPlayerMoney = initialPlayer.money;
          const initialAvailablePieces = initialPlayer.otakuPieces.filter(
            piece => !piece.goods && piece.boardSpotId === undefined
          );

          // Define goods prices
          const goodsPrices = {
            uchiwa: 1,
            penlight: 1,
            sashiire: 2
          };

          const price = goodsPrices[goodsType];
          const canAfford = initialPlayerMoney >= price;
          const hasAvailablePiece = initialAvailablePieces.length > 0;
          const shouldSucceed = canAfford && hasAvailablePiece;

          // Attempt purchase
          let purchaseResult: boolean;
          act(() => {
            purchaseResult = result.current.purchaseGoods('test-player', goodsType);
          });

          const finalGameSession = result.current.gameSession;
          if (!finalGameSession) return false;

          const finalPlayer = finalGameSession.players.find(p => p.id === 'test-player');
          if (!finalPlayer) return false;

          if (shouldSucceed) {
            // Purchase should succeed
            if (!purchaseResult!) return false;

            // Money should be reduced by the price
            if (finalPlayer.money !== initialPlayerMoney - price) return false;

            // One more piece should now have the goods (compared to initial state)
            const initialPiecesWithGoods = initialPlayer.otakuPieces.filter(piece => piece.goods === goodsType).length;
            const finalPiecesWithGoods = finalPlayer.otakuPieces.filter(piece => piece.goods === goodsType).length;
            if (finalPiecesWithGoods !== initialPiecesWithGoods + 1) return false;

            // The newly equipped piece should be one that was previously available
            const newlyEquippedPieces = finalPlayer.otakuPieces.filter(piece => 
              piece.goods === goodsType && 
              !initialPlayer.otakuPieces.some(initialPiece => 
                initialPiece.id === piece.id && initialPiece.goods === goodsType
              )
            );
            if (newlyEquippedPieces.length !== 1) return false;
            
            const newlyEquippedPiece = newlyEquippedPieces[0];
            const wasAvailable = initialAvailablePieces.some(piece => piece.id === newlyEquippedPiece.id);
            if (!wasAvailable) return false;

          } else {
            // Purchase should fail
            if (purchaseResult!) return false;

            // Money should remain unchanged
            if (finalPlayer.money !== initialPlayerMoney) return false;

            // No new pieces should have goods of this type
            const initialPiecesWithGoods = initialPlayer.otakuPieces.filter(piece => piece.goods === goodsType).length;
            const finalPiecesWithGoods = finalPlayer.otakuPieces.filter(piece => piece.goods === goodsType).length;
            if (finalPiecesWithGoods !== initialPiecesWithGoods) return false;
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Goods purchase respects price differences', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 5 }),
        fc.constantFrom<'uchiwa' | 'penlight' | 'sashiire'>('uchiwa', 'penlight', 'sashiire'),
        (money, goodsType) => {
          const { result } = renderHook(() => useGame(), { wrapper: TestWrapper });
          
          // Create player with specified money and one available piece
          const testPlayer = createTestPlayer('test-player', money, 1);
          
          act(() => {
            result.current.initializeGame([testPlayer]);
          });

          const goodsPrices = {
            uchiwa: 1,
            penlight: 1,
            sashiire: 2
          };

          const price = goodsPrices[goodsType];
          const canAfford = money >= price;

          let purchaseResult: boolean;
          act(() => {
            purchaseResult = result.current.purchaseGoods('test-player', goodsType);
          });

          // Purchase should succeed if and only if player can afford it
          return purchaseResult! === canAfford;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Kagebunshin creation only works with sashiire', () => {
    fc.assert(
      fc.property(
        goodsTypeArb,
        (goodsType) => {
          const { result } = renderHook(() => useGame(), { wrapper: TestWrapper });
          
          // Create player with piece that has the specified goods
          const testPlayer = createTestPlayer('test-player', 5, 1);
          testPlayer.otakuPieces[0].goods = goodsType;
          
          act(() => {
            result.current.initializeGame([testPlayer]);
          });

          let kagebunshinId: string | null = null;
          act(() => {
            kagebunshinId = result.current.createKagebunshin('test-player', testPlayer.otakuPieces[0].id);
          });

          const finalGameSession = result.current.gameSession;
          if (!finalGameSession) return false;

          const finalPlayer = finalGameSession.players.find(p => p.id === 'test-player');
          if (!finalPlayer) return false;

          if (goodsType === 'sashiire') {
            // Should succeed - kagebunshin created
            if (!kagebunshinId) return false;
            
            // Should have one more otaku piece (the kagebunshin)
            if (finalPlayer.otakuPieces.length !== testPlayer.otakuPieces.length + 1) return false;
            
            // The new piece should be a kagebunshin with sashiire
            const kagebunshin = finalPlayer.otakuPieces.find(piece => piece.id === kagebunshinId);
            if (!kagebunshin || !kagebunshin.isKagebunshin || kagebunshin.goods !== 'sashiire') return false;
            
          } else {
            // Should fail - no kagebunshin created
            if (kagebunshinId !== null) return false;
            
            // Should have same number of pieces
            if (finalPlayer.otakuPieces.length !== testPlayer.otakuPieces.length) return false;
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});