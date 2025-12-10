import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { GameSession, GameState, Player, HanamichiBoard, BoardSpot, OshiPiece } from '../types/game';

interface GameContextType {
  gameSession: GameSession | null;
  initializeGame: (players: Player[]) => void;
  updateGameState: (updates: Partial<GameState>) => void;
  movePiece: (pieceId: string, spotId: number) => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

type GameAction = 
  | { type: 'INITIALIZE_GAME'; payload: Player[] }
  | { type: 'UPDATE_GAME_STATE'; payload: Partial<GameState> }
  | { type: 'MOVE_PIECE'; payload: { pieceId: string; spotId: number } };

const createInitialBoard = (): HanamichiBoard => {
  const spots: BoardSpot[] = [];
  for (let i = 0; i < 8; i++) {
    spots.push({
      id: i,
      position: { row: Math.floor(i / 4), col: i % 4 },
      otakuPieces: [],
      oshiPiece: undefined
    });
  }
  return { spots };
};

const createInitialOshiPieces = (): OshiPiece[] => [
  { id: 'A', currentSpotId: undefined },
  { id: 'B', currentSpotId: undefined },
  { id: 'C', currentSpotId: undefined }
];

const gameReducer = (state: GameSession | null, action: GameAction): GameSession | null => {
  switch (action.type) {
    case 'INITIALIZE_GAME':
      return {
        id: `game-${Date.now()}`,
        players: action.payload,
        currentRound: 1,
        currentPhase: 'setup',
        activePlayerIndex: 0,
        gameState: {
          hanamichiBoardState: createInitialBoard(),
          oshiPieces: createInitialOshiPieces(),
          fanserviceSpotCards: [],
          revealedCards: [],
          rewardDistributionCards: [],
          roundHistory: []
        },
        createdAt: new Date()
      };

    case 'UPDATE_GAME_STATE':
      if (!state) return null;
      return {
        ...state,
        gameState: {
          ...state.gameState,
          ...action.payload
        }
      };

    case 'MOVE_PIECE':
      if (!state) return null;
      const { pieceId, spotId } = action.payload;
      
      // 現在のボード状態をコピー
      const newBoard = { ...state.gameState.hanamichiBoardState };
      const newSpots = newBoard.spots.map(spot => ({ ...spot, otakuPieces: [...spot.otakuPieces] }));
      
      // 移動先のスポットをチェック（3個制限）
      const targetSpot = newSpots.find(spot => spot.id === spotId);
      if (!targetSpot || targetSpot.otakuPieces.length >= 3) {
        return state; // 移動不可の場合は状態を変更しない
      }
      
      // プレイヤーのピースを見つける
      const piece = state.players
        .flatMap(player => player.otakuPieces)
        .find(p => p.id === pieceId);
      
      if (!piece) {
        return state; // ピースが見つからない場合は状態を変更しない
      }
      
      // 移動元からピースを削除
      newSpots.forEach(spot => {
        spot.otakuPieces = spot.otakuPieces.filter(p => p.id !== pieceId);
      });
      
      // 移動先にピースを追加
      const updatedPiece = { ...piece, boardSpotId: spotId };
      targetSpot.otakuPieces.push(updatedPiece);
      
      // プレイヤーのピース情報も更新
      const updatedPlayers = state.players.map(player => ({
        ...player,
        otakuPieces: player.otakuPieces.map(p => 
          p.id === pieceId ? updatedPiece : p
        )
      }));
      
      return {
        ...state,
        players: updatedPlayers,
        gameState: {
          ...state.gameState,
          hanamichiBoardState: { spots: newSpots }
        }
      };

    default:
      return state;
  }
};

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [gameSession, dispatch] = useReducer(gameReducer, null);

  const initializeGame = (players: Player[]) => {
    dispatch({ type: 'INITIALIZE_GAME', payload: players });
  };

  const updateGameState = (updates: Partial<GameState>) => {
    dispatch({ type: 'UPDATE_GAME_STATE', payload: updates });
  };

  const movePiece = (pieceId: string, spotId: number) => {
    dispatch({ type: 'MOVE_PIECE', payload: { pieceId, spotId } });
  };

  return (
    <GameContext.Provider value={{
      gameSession,
      initializeGame,
      updateGameState,
      movePiece
    }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};