/**
 * **Feature: oshi-game-testplay, Property 12: オタクコマ配置制限の適用**
 * **Validates: Requirements 5.5**
 * 
 * Property-based tests for otaku piece placement restrictions
 */

import fc from 'fast-check';
import { GameSession, Player, OtakuPiece, BoardSpot } from '../types/game';
import { GameProvider, useGame } from '../contexts/GameContext';
import { renderHook, act } from '@testing-library/react';
import React from 'react';

// Test wrapper component for GameProvider
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return React.createElement(GameProvider, null, children);
};

// Helper function to create a test player with otaku pieces
const createTestPlayer = (id: string, numPieces: number): Player => {
  const otakuPieces: OtakuPiece[] = [];
  
  for (let i = 0; i < numPieces; i++) {
    otakuPieces.push({
      id: `${id}-otaku${i + 1}`,
      playerId: id,
      boardSpotId: undefined,
      goods: 'uchiwa', // Give them goods so they can be placed
      isKagebunshin: false
    });
  }

  return {
    id,
    name: `Player ${id}`,
    color: 'red',
    money: 10,
    points: 0,
    otakuPieces
  };
};

// Arbitraries for property-based testing
const spotIdArb = fc.integer({ min: 0, max: 7 }); // Board has 8 spots (0-7)
const numPiecesArb = fc.integer({ min: 1, max: 6 }); // 1-6 pieces to test

describe('Otaku Piece Placement Property Tests', () => {
  /**
   * Property 12: オタクコマ配置制限の適用
   * For any board spot, when 3 otaku pieces are placed, further placement should be restricted
   */
  test('Property 12: Otaku piece placement restriction enforcement', () => {
    fc.assert(
      fc.property(
        spotIdArb,
        numPiecesArb,
        (targetSpotId, numPiecesToPlace) => {
          const { result } = renderHook(() => useGame(), { wrapper: TestWrapper });
          
          // Create test player with enough pieces
          const testPlayer = createTestPlayer('test-player', Math.max(numPiecesToPlace, 4));
          
          act(() => {
            result.current.initializeGame([testPlayer]);
          });

          const gameSession = result.current.gameSession;
          if (!gameSession) return false;

          // Get initial state
          const initialPlayer = gameSession.players.find(p => p.id === 'test-player');
          if (!initialPlayer) return false;

          const piecesToPlace = initialPlayer.otakuPieces.slice(0, numPiecesToPlace);
          let successfulPlacements = 0;

          // Try to place pieces one by one
          for (const piece of piecesToPlace) {
            act(() => {
              result.current.movePiece(piece.id, targetSpotId);
            });
            
            // Check if the piece was actually placed
            const currentSession = result.current.gameSession;
            if (currentSession) {
              const targetSpot = currentSession.gameState.hanamichiBoardState.spots.find(s => s.id === targetSpotId);
              if (targetSpot && targetSpot.otakuPieces.some(p => p.id === piece.id)) {
                successfulPlacements++;
              }
            }
          }

          // Verify placement restrictions
          const finalSession = result.current.gameSession;
          if (!finalSession) return false;

          const targetSpot = finalSession.gameState.hanamichiBoardState.spots.find(s => s.id === targetSpotId);
          if (!targetSpot) return false;

          // Maximum 3 pieces should be placed on any spot
          if (targetSpot.otakuPieces.length > 3) return false;

          // If we tried to place more than 3 pieces, only 3 should succeed
          const expectedSuccessfulPlacements = Math.min(numPiecesToPlace, 3);
          if (successfulPlacements !== expectedSuccessfulPlacements) return false;

          // The number of pieces on the spot should equal successful placements
          if (targetSpot.otakuPieces.length !== successfulPlacements) return false;

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Placement restriction applies across different players', () => {
    fc.assert(
      fc.property(
        spotIdArb,
        fc.integer({ min: 1, max: 3 }),
        fc.integer({ min: 1, max: 3 }),
        (targetSpotId, player1Pieces, player2Pieces) => {
          const { result } = renderHook(() => useGame(), { wrapper: TestWrapper });
          
          // Create two test players
          const testPlayer1 = createTestPlayer('player1', player1Pieces);
          const testPlayer2 = createTestPlayer('player2', player2Pieces);
          
          act(() => {
            result.current.initializeGame([testPlayer1, testPlayer2]);
          });

          const gameSession = result.current.gameSession;
          if (!gameSession) return false;

          const allPieces = [
            ...gameSession.players[0].otakuPieces,
            ...gameSession.players[1].otakuPieces
          ];

          let successfulPlacements = 0;

          // Try to place all pieces on the same spot
          for (const piece of allPieces) {
            act(() => {
              result.current.movePiece(piece.id, targetSpotId);
            });
            
            // Check if placement was successful
            const currentSession = result.current.gameSession;
            if (currentSession) {
              const targetSpot = currentSession.gameState.hanamichiBoardState.spots.find(s => s.id === targetSpotId);
              if (targetSpot && targetSpot.otakuPieces.some(p => p.id === piece.id)) {
                successfulPlacements++;
              }
            }
          }

          const finalSession = result.current.gameSession;
          if (!finalSession) return false;

          const targetSpot = finalSession.gameState.hanamichiBoardState.spots.find(s => s.id === targetSpotId);
          if (!targetSpot) return false;

          // Should not exceed 3 pieces regardless of player ownership
          if (targetSpot.otakuPieces.length > 3) return false;

          // Should place at most 3 pieces
          const totalPieces = player1Pieces + player2Pieces;
          const expectedPlacements = Math.min(totalPieces, 3);
          
          if (successfulPlacements !== expectedPlacements) return false;
          if (targetSpot.otakuPieces.length !== expectedPlacements) return false;

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Pieces without goods cannot be placed', () => {
    fc.assert(
      fc.property(
        spotIdArb,
        (targetSpotId) => {
          const { result } = renderHook(() => useGame(), { wrapper: TestWrapper });
          
          // Create player with pieces without goods
          const testPlayer: Player = {
            id: 'test-player',
            name: 'Test Player',
            color: 'red',
            money: 10,
            points: 0,
            otakuPieces: [
              {
                id: 'piece-no-goods',
                playerId: 'test-player',
                boardSpotId: undefined,
                goods: undefined, // No goods
                isKagebunshin: false
              },
              {
                id: 'piece-with-goods',
                playerId: 'test-player',
                boardSpotId: undefined,
                goods: 'uchiwa', // Has goods
                isKagebunshin: false
              }
            ]
          };
          
          act(() => {
            result.current.initializeGame([testPlayer]);
          });

          // Try to place piece without goods
          act(() => {
            result.current.movePiece('piece-no-goods', targetSpotId);
          });

          // Try to place piece with goods
          act(() => {
            result.current.movePiece('piece-with-goods', targetSpotId);
          });

          const finalSession = result.current.gameSession;
          if (!finalSession) return false;

          const targetSpot = finalSession.gameState.hanamichiBoardState.spots.find(s => s.id === targetSpotId);
          if (!targetSpot) return false;

          // Only the piece with goods should be placed
          if (targetSpot.otakuPieces.length !== 1) return false;
          if (targetSpot.otakuPieces[0].id !== 'piece-with-goods') return false;

          // Piece without goods should still be unplaced
          const finalPlayer = finalSession.players.find(p => p.id === 'test-player');
          if (!finalPlayer) return false;
          
          const unplacedPiece = finalPlayer.otakuPieces.find(p => p.id === 'piece-no-goods');
          if (!unplacedPiece || unplacedPiece.boardSpotId !== undefined) return false;

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});