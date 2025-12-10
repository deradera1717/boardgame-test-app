import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { GameSession, GameState, Player, HanamichiBoard, BoardSpot, OshiPiece, GamePhase, TurnManager, RewardDistributionCard } from '../types/game';
import { createRewardDistributionCards, rollDice, processLaborPhase } from '../utils/gameLogic';

interface GameContextType {
  gameSession: GameSession | null;
  initializeGame: (players: Player[]) => void;
  updateGameState: (updates: Partial<GameState>) => void;
  movePiece: (pieceId: string, spotId: number) => void;
  nextTurn: () => void;
  nextPhase: () => void;
  setPlayerActionCompleted: (playerId: string, completed: boolean) => void;
  isPlayerTurn: (playerId: string) => boolean;
  areAllPlayersReady: () => boolean;
  getCurrentPlayer: () => Player | null;
  getWaitingPlayers: () => Player[];
  selectRewardCard: (playerId: string, cardId: string) => void;
  rollDiceAndProcessLabor: () => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

type GameAction = 
  | { type: 'INITIALIZE_GAME'; payload: Player[] }
  | { type: 'UPDATE_GAME_STATE'; payload: Partial<GameState> }
  | { type: 'MOVE_PIECE'; payload: { pieceId: string; spotId: number } }
  | { type: 'NEXT_TURN' }
  | { type: 'NEXT_PHASE' }
  | { type: 'SET_PLAYER_ACTION_COMPLETED'; payload: { playerId: string; completed: boolean } }
  | { type: 'RESET_PHASE_ACTIONS' }
  | { type: 'SELECT_REWARD_CARD'; payload: { playerId: string; cardId: string } }
  | { type: 'ROLL_DICE_AND_PROCESS_LABOR' };

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

const createInitialTurnManager = (players: Player[]): TurnManager => {
  const phaseActions: { [playerId: string]: boolean } = {};
  players.forEach(player => {
    phaseActions[player.id] = false;
  });

  return {
    currentPlayer: 0,
    waitingForPlayers: players.map(p => p.id),
    phaseActions
  };
};

const gameReducer = (state: GameSession | null, action: GameAction): GameSession | null => {
  switch (action.type) {
    case 'INITIALIZE_GAME':
      const players = action.payload;
      return {
        id: `game-${Date.now()}`,
        players,
        currentRound: 1,
        currentPhase: 'setup',
        activePlayerIndex: 0,
        gameState: {
          hanamichiBoardState: createInitialBoard(),
          oshiPieces: createInitialOshiPieces(),
          fanserviceSpotCards: [],
          revealedCards: [],
          rewardDistributionCards: createRewardDistributionCards(),
          roundHistory: []
        },
        turnManager: createInitialTurnManager(players),
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
      const updatedPlayersWithPiece = state.players.map(player => ({
        ...player,
        otakuPieces: player.otakuPieces.map(p => 
          p.id === pieceId ? updatedPiece : p
        )
      }));
      
      return {
        ...state,
        players: updatedPlayersWithPiece,
        gameState: {
          ...state.gameState,
          hanamichiBoardState: { spots: newSpots }
        }
      };

    case 'NEXT_TURN':
      if (!state) return null;
      const nextPlayerIndex = (state.activePlayerIndex + 1) % state.players.length;
      return {
        ...state,
        activePlayerIndex: nextPlayerIndex,
        turnManager: {
          ...state.turnManager,
          currentPlayer: nextPlayerIndex
        }
      };

    case 'NEXT_PHASE':
      if (!state) return null;
      // フェーズ遷移ロジックは後で実装
      const phaseOrder: GamePhase[] = [
        'setup', 'labor', 'oshikatsu-decision', 'oshikatsu-goods', 
        'oshikatsu-placement', 'fansa-time', 'round-end'
      ];
      const currentPhaseIndex = phaseOrder.indexOf(state.currentPhase);
      const nextPhase = currentPhaseIndex < phaseOrder.length - 1 
        ? phaseOrder[currentPhaseIndex + 1] 
        : 'labor'; // 次のラウンドに進む

      // フェーズアクションをリセット
      const resetPhaseActions: { [playerId: string]: boolean } = {};
      state.players.forEach(player => {
        resetPhaseActions[player.id] = false;
      });

      return {
        ...state,
        currentPhase: nextPhase,
        currentRound: nextPhase === 'labor' && state.currentPhase === 'round-end' 
          ? state.currentRound + 1 
          : state.currentRound,
        turnManager: {
          ...state.turnManager,
          phaseActions: resetPhaseActions,
          waitingForPlayers: state.players.map(p => p.id)
        }
      };

    case 'SET_PLAYER_ACTION_COMPLETED':
      if (!state) return null;
      const { playerId, completed } = action.payload;
      const updatedPhaseActions = {
        ...state.turnManager.phaseActions,
        [playerId]: completed
      };

      const waitingPlayers = completed 
        ? state.turnManager.waitingForPlayers.filter(id => id !== playerId)
        : [...state.turnManager.waitingForPlayers, playerId].filter((id, index, arr) => arr.indexOf(id) === index);

      return {
        ...state,
        turnManager: {
          ...state.turnManager,
          phaseActions: updatedPhaseActions,
          waitingForPlayers: waitingPlayers
        }
      };

    case 'RESET_PHASE_ACTIONS':
      if (!state) return null;
      const resetActions: { [playerId: string]: boolean } = {};
      state.players.forEach(player => {
        resetActions[player.id] = false;
      });

      return {
        ...state,
        turnManager: {
          ...state.turnManager,
          phaseActions: resetActions,
          waitingForPlayers: state.players.map(p => p.id)
        }
      };

    case 'SELECT_REWARD_CARD':
      if (!state) return null;
      const { playerId: selectingPlayerId, cardId } = action.payload;
      
      // 選択されたカードを見つける
      const selectedCard = state.gameState.rewardDistributionCards.find(card => card.id === cardId);
      if (!selectedCard) {
        return state; // カードが見つからない場合は状態を変更しない
      }

      // プレイヤーの選択を更新
      const updatedPlayersWithCard = state.players.map(player => 
        player.id === selectingPlayerId 
          ? { ...player, selectedRewardCard: selectedCard }
          : player
      );

      // プレイヤーのアクション完了状態を更新
      const updatedPhaseActionsForCard = {
        ...state.turnManager.phaseActions,
        [selectingPlayerId]: true
      };

      const updatedWaitingPlayersForCard = state.turnManager.waitingForPlayers.filter(
        id => id !== selectingPlayerId
      );

      return {
        ...state,
        players: updatedPlayersWithCard,
        turnManager: {
          ...state.turnManager,
          phaseActions: updatedPhaseActionsForCard,
          waitingForPlayers: updatedWaitingPlayersForCard
        }
      };

    case 'ROLL_DICE_AND_PROCESS_LABOR':
      if (!state) return null;
      
      // 全プレイヤーがカードを選択済みかチェック
      const allPlayersSelected = state.players.every(player => player.selectedRewardCard);
      if (!allPlayersSelected) {
        return state; // まだ選択していないプレイヤーがいる場合は処理しない
      }

      const diceResult = rollDice();
      const { updatedPlayers, laborResults } = processLaborPhase(state.players, diceResult);

      // ラウンド履歴を更新
      const currentRoundHistory = state.gameState.roundHistory.find(
        round => round.roundNumber === state.currentRound
      );

      const updatedRoundHistory = currentRoundHistory
        ? state.gameState.roundHistory.map(round =>
            round.roundNumber === state.currentRound
              ? { ...round, laborResults }
              : round
          )
        : [
            ...state.gameState.roundHistory,
            {
              roundNumber: state.currentRound,
              laborResults,
              oshikatsuDecisions: [],
              fansaResults: []
            }
          ];

      return {
        ...state,
        players: updatedPlayers,
        gameState: {
          ...state.gameState,
          currentDiceResult: diceResult,
          roundHistory: updatedRoundHistory
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

  const nextTurn = () => {
    dispatch({ type: 'NEXT_TURN' });
  };

  const nextPhase = () => {
    dispatch({ type: 'NEXT_PHASE' });
  };

  const setPlayerActionCompleted = (playerId: string, completed: boolean) => {
    dispatch({ type: 'SET_PLAYER_ACTION_COMPLETED', payload: { playerId, completed } });
  };

  const isPlayerTurn = (playerId: string): boolean => {
    if (!gameSession) return false;
    const currentPlayer = gameSession.players[gameSession.activePlayerIndex];
    return currentPlayer.id === playerId;
  };

  const areAllPlayersReady = (): boolean => {
    if (!gameSession) return false;
    return gameSession.players.every(player => 
      gameSession.turnManager.phaseActions[player.id] === true
    );
  };

  const getCurrentPlayer = (): Player | null => {
    if (!gameSession) return null;
    return gameSession.players[gameSession.activePlayerIndex];
  };

  const getWaitingPlayers = (): Player[] => {
    if (!gameSession) return [];
    return gameSession.players.filter(player => 
      gameSession.turnManager.waitingForPlayers.includes(player.id)
    );
  };

  const selectRewardCard = (playerId: string, cardId: string) => {
    dispatch({ type: 'SELECT_REWARD_CARD', payload: { playerId, cardId } });
  };

  const rollDiceAndProcessLabor = () => {
    dispatch({ type: 'ROLL_DICE_AND_PROCESS_LABOR' });
  };

  return (
    <GameContext.Provider value={{
      gameSession,
      initializeGame,
      updateGameState,
      movePiece,
      nextTurn,
      nextPhase,
      setPlayerActionCompleted,
      isPlayerTurn,
      areAllPlayersReady,
      getCurrentPlayer,
      getWaitingPlayers,
      selectRewardCard,
      rollDiceAndProcessLabor
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