import { useMemo, useCallback } from 'react';
import { GameSession, Player } from '../types/game';

/**
 * Performance optimization hook for game state
 * Memoizes expensive calculations and provides optimized selectors
 */
export const useOptimizedGameState = (gameSession: GameSession | null) => {
  // Memoize current player calculation
  const currentPlayer = useMemo(() => {
    if (!gameSession) return null;
    return gameSession.players[gameSession.activePlayerIndex] || null;
  }, [gameSession?.players, gameSession?.activePlayerIndex]);

  // Memoize waiting players calculation
  const waitingPlayers = useMemo(() => {
    if (!gameSession) return [];
    return gameSession.players.filter(player => 
      !gameSession.turnManager.phaseActions[player.id]
    );
  }, [gameSession?.players, gameSession?.turnManager.phaseActions]);

  // Memoize players with completed actions
  const completedPlayers = useMemo(() => {
    if (!gameSession) return [];
    return gameSession.players.filter(player => 
      gameSession.turnManager.phaseActions[player.id]
    );
  }, [gameSession?.players, gameSession?.turnManager.phaseActions]);

  // Memoize all players ready status
  const areAllPlayersReady = useMemo(() => {
    if (!gameSession) return false;
    return gameSession.players.every(player => 
      gameSession.turnManager.phaseActions[player.id]
    );
  }, [gameSession?.players, gameSession?.turnManager.phaseActions]);

  // Memoize board state calculations
  const boardStats = useMemo(() => {
    if (!gameSession) return { totalPieces: 0, occupiedSpots: 0, fullSpots: 0 };
    
    const spots = gameSession.gameState.hanamichiBoardState.spots;
    const totalPieces = spots.reduce((sum, spot) => sum + spot.otakuPieces.length, 0);
    const occupiedSpots = spots.filter(spot => spot.otakuPieces.length > 0).length;
    const fullSpots = spots.filter(spot => spot.otakuPieces.length >= 3).length;
    
    return { totalPieces, occupiedSpots, fullSpots };
  }, [gameSession?.gameState.hanamichiBoardState.spots]);

  // Memoize player statistics
  const playerStats = useMemo(() => {
    if (!gameSession) return [];
    
    return gameSession.players.map(player => ({
      id: player.id,
      name: player.name,
      money: player.money,
      points: player.points,
      availablePieces: player.otakuPieces.filter(piece => !piece.boardSpotId).length,
      placedPieces: player.otakuPieces.filter(piece => piece.boardSpotId).length,
      hasGoods: player.otakuPieces.some(piece => piece.goods),
      isCurrentPlayer: gameSession.activePlayerIndex === gameSession.players.indexOf(player),
      hasCompletedAction: gameSession.turnManager.phaseActions[player.id] || false
    }));
  }, [
    gameSession?.players,
    gameSession?.activePlayerIndex,
    gameSession?.turnManager.phaseActions
  ]);

  // Optimized selector functions
  const getPlayerById = useCallback((playerId: string): Player | null => {
    if (!gameSession) return null;
    return gameSession.players.find(p => p.id === playerId) || null;
  }, [gameSession?.players]);

  const isPlayerTurn = useCallback((playerId: string): boolean => {
    if (!gameSession || !currentPlayer) return false;
    return currentPlayer.id === playerId;
  }, [currentPlayer]);

  const getSpotById = useCallback((spotId: number) => {
    if (!gameSession) return null;
    return gameSession.gameState.hanamichiBoardState.spots.find(s => s.id === spotId) || null;
  }, [gameSession?.gameState.hanamichiBoardState.spots]);

  return {
    // Memoized values
    currentPlayer,
    waitingPlayers,
    completedPlayers,
    areAllPlayersReady,
    boardStats,
    playerStats,
    
    // Optimized selectors
    getPlayerById,
    isPlayerTurn,
    getSpotById,
    
    // Game state checks
    isGameActive: !!gameSession,
    currentRound: gameSession?.currentRound || 0,
    currentPhase: gameSession?.currentPhase || 'setup',
    totalPlayers: gameSession?.players.length || 0
  };
};

/**
 * Hook for optimizing component re-renders based on specific player data
 */
export const usePlayerOptimization = (playerId: string, gameSession: GameSession | null) => {
  const player = useMemo(() => {
    if (!gameSession) return null;
    return gameSession.players.find(p => p.id === playerId) || null;
  }, [gameSession?.players, playerId]);

  const playerState = useMemo(() => {
    if (!player || !gameSession) return null;
    
    return {
      ...player,
      isCurrentPlayer: gameSession.players[gameSession.activePlayerIndex]?.id === playerId,
      hasCompletedAction: gameSession.turnManager.phaseActions[playerId] || false,
      availablePieces: player.otakuPieces.filter(piece => !piece.boardSpotId),
      placedPieces: player.otakuPieces.filter(piece => piece.boardSpotId)
    };
  }, [player, gameSession?.activePlayerIndex, gameSession?.turnManager.phaseActions, playerId]);

  return playerState;
};