import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { GameSession, GameState, Player, HanamichiBoard, BoardSpot, OshiPiece, GamePhase, TurnManager, RewardDistributionCard, OshikatsuDecision, GoodsType, OtakuPiece } from '../types/game';
import { createRewardDistributionCards, rollDice, processLaborPhase, createAllFanserviceSpotCards, prepareOshikatsuPhaseCards, processFansaTime } from '../utils/gameLogic';

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
  selectOshikatsuDecision: (playerId: string, decision: OshikatsuDecision) => void;
  revealOshikatsuDecisions: () => void;
  generateFanserviceSpotCards: () => void;
  purchaseGoods: (playerId: string, goodsType: GoodsType) => boolean;
  createKagebunshin: (playerId: string, originalPieceId: string) => string | null;
  getAvailableOtakuPieces: (playerId: string) => OtakuPiece[];
  processFansaTimePhase: () => void;
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
  | { type: 'ROLL_DICE_AND_PROCESS_LABOR' }
  | { type: 'SELECT_OSHIKATSU_DECISION'; payload: { playerId: string; decision: OshikatsuDecision } }
  | { type: 'REVEAL_OSHIKATSU_DECISIONS' }
  | { type: 'GENERATE_FANSERVICE_SPOT_CARDS' }
  | { type: 'PURCHASE_GOODS'; payload: { playerId: string; goodsType: GoodsType } }
  | { type: 'CREATE_KAGEBUNSHIN'; payload: { playerId: string; originalPieceId: string; kagebunshinId: string } }
  | { type: 'PROCESS_FANSA_TIME' };

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
          fanserviceSpotCards: createAllFanserviceSpotCards(),
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
      
      // グッズを持っていないピースは配置不可
      if (!piece.goods) {
        return state; // グッズを持っていない場合は配置不可
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

      // フェーズ遷移時にプレイヤーの一時的な選択をクリア
      const clearedPlayers = state.players.map(player => {
        const clearedPlayer = { ...player };
        
        // 労働フェーズから推しかつ決断フェーズに移る時は報酬カード選択をクリア
        if (state.currentPhase === 'labor' && nextPhase === 'oshikatsu-decision') {
          clearedPlayer.selectedRewardCard = undefined;
        }
        
        // 推しかつ決断フェーズから次のフェーズに移る時は推しかつ決断をクリア（次のラウンドまで保持）
        // ただし、ラウンド終了時にはクリアする
        if (nextPhase === 'labor') {
          clearedPlayer.selectedRewardCard = undefined;
          clearedPlayer.oshikatsuDecision = undefined;
        }
        
        return clearedPlayer;
      });

      return {
        ...state,
        players: clearedPlayers,
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

    case 'SELECT_OSHIKATSU_DECISION':
      if (!state) return null;
      const { playerId: decidingPlayerId, decision } = action.payload;
      
      // プレイヤーの推しかつ決断を更新
      const updatedPlayersWithDecision = state.players.map(player => 
        player.id === decidingPlayerId 
          ? { ...player, oshikatsuDecision: decision }
          : player
      );

      // プレイヤーのアクション完了状態を更新
      const updatedPhaseActionsForDecision = {
        ...state.turnManager.phaseActions,
        [decidingPlayerId]: true
      };

      const updatedWaitingPlayersForDecision = state.turnManager.waitingForPlayers.filter(
        id => id !== decidingPlayerId
      );

      return {
        ...state,
        players: updatedPlayersWithDecision,
        turnManager: {
          ...state.turnManager,
          phaseActions: updatedPhaseActionsForDecision,
          waitingForPlayers: updatedWaitingPlayersForDecision
        }
      };

    case 'REVEAL_OSHIKATSU_DECISIONS':
      if (!state) return null;
      
      // 全プレイヤーが推しかつ決断を選択済みかチェック
      const allPlayersDecided = state.players.every(player => player.oshikatsuDecision);
      if (!allPlayersDecided) {
        return state; // まだ決断していないプレイヤーがいる場合は処理しない
      }

      // 「休む」を選択したプレイヤーに追加報酬を付与
      const currentRoundHistoryForDecision = state.gameState.roundHistory.find(
        round => round.roundNumber === state.currentRound
      );

      const updatedPlayersWithRestReward = state.players.map(player => {
        if (player.oshikatsuDecision === 'rest') {
          // 労働フェーズで得た報酬と同額を追加
          const laborReward = currentRoundHistoryForDecision?.laborResults
            .find(result => result.playerId === player.id)?.reward || 0;
          
          return {
            ...player,
            money: player.money + laborReward
          };
        }
        return player;
      });

      // ラウンド履歴に推しかつ決断を記録
      const oshikatsuDecisions = state.players.map(player => ({
        playerId: player.id,
        decision: player.oshikatsuDecision!
      }));

      const updatedRoundHistoryWithDecisions = state.gameState.roundHistory.map(round =>
        round.roundNumber === state.currentRound
          ? { ...round, oshikatsuDecisions }
          : round
      );

      return {
        ...state,
        players: updatedPlayersWithRestReward,
        gameState: {
          ...state.gameState,
          roundHistory: updatedRoundHistoryWithDecisions
        }
      };

    case 'GENERATE_FANSERVICE_SPOT_CARDS':
      if (!state) return null;
      
      // 推し活フェーズ用のファンサスポットカード3枚を生成
      const newRevealedCards = prepareOshikatsuPhaseCards(state.gameState.fanserviceSpotCards);
      
      return {
        ...state,
        gameState: {
          ...state.gameState,
          revealedCards: newRevealedCards
        }
      };

    case 'PURCHASE_GOODS':
      if (!state) return null;
      const { playerId: buyerPlayerId, goodsType } = action.payload;
      
      // グッズの価格設定
      const goodsPrices = {
        uchiwa: 1,
        penlight: 1,
        sashiire: 2
      };
      
      const price = goodsPrices[goodsType];
      const buyer = state.players.find(p => p.id === buyerPlayerId);
      
      if (!buyer || buyer.money < price) {
        return state; // 資金不足の場合は購入不可
      }
      
      // 利用可能なオタクコマを探す（グッズを持っていない、ボードに配置されていない）
      const availablePiece = buyer.otakuPieces.find(piece => 
        !piece.goods && piece.boardSpotId === undefined
      );
      
      if (!availablePiece) {
        return state; // 利用可能なオタクコマがない場合は購入不可
      }
      
      // プレイヤーの資金を減らし、オタクコマにグッズを付与
      const updatedPlayersWithGoods = state.players.map(player => {
        if (player.id === buyerPlayerId) {
          return {
            ...player,
            money: player.money - price,
            otakuPieces: player.otakuPieces.map(piece => 
              piece.id === availablePiece.id 
                ? { ...piece, goods: goodsType }
                : piece
            )
          };
        }
        return player;
      });
      
      return {
        ...state,
        players: updatedPlayersWithGoods
      };

    case 'CREATE_KAGEBUNSHIN':
      if (!state) return null;
      const { playerId: kagePlayerId, originalPieceId, kagebunshinId } = action.payload;
      
      const kagePlayer = state.players.find(p => p.id === kagePlayerId);
      const originalPiece = kagePlayer?.otakuPieces.find(p => p.id === originalPieceId);
      
      if (!kagePlayer || !originalPiece || !originalPiece.goods) {
        return state; // プレイヤーまたはピースが見つからない、またはグッズを持っていない場合は作成不可
      }
      
      // 差し入れを持っている場合のみ影分身を作成可能
      if (originalPiece.goods !== 'sashiire') {
        return state;
      }
      
      // 新しい影分身ピースを作成
      const kagebunshinPiece: OtakuPiece = {
        id: kagebunshinId,
        playerId: kagePlayerId,
        boardSpotId: undefined,
        goods: originalPiece.goods,
        isKagebunshin: true
      };
      
      // プレイヤーのオタクコマリストに影分身を追加
      const updatedPlayersWithKage = state.players.map(player => {
        if (player.id === kagePlayerId) {
          return {
            ...player,
            otakuPieces: [...player.otakuPieces, kagebunshinPiece]
          };
        }
        return player;
      });
      
      return {
        ...state,
        players: updatedPlayersWithKage
      };

    case 'PROCESS_FANSA_TIME':
      if (!state) return null;
      
      // ファンサタイムの処理を実行
      const allOtakuPieces = state.players.flatMap(player => player.otakuPieces);
      const { oshiPlacements, pointResults, diceResults } = processFansaTime(
        state.gameState.revealedCards,
        state.gameState.hanamichiBoardState,
        allOtakuPieces
      );
      
      // 推しコマの位置を更新
      const updatedOshiPieces = state.gameState.oshiPieces.map(oshi => {
        const placement = oshiPlacements.find(p => p.oshiId === oshi.id);
        return placement ? { ...oshi, currentSpotId: placement.spotId } : oshi;
      });
      
      // ボード状態を更新（推しコマを配置）
      const updatedBoardSpots = state.gameState.hanamichiBoardState.spots.map(spot => {
        const oshiAtSpot = oshiPlacements.find(p => p.spotId === spot.id);
        return oshiAtSpot 
          ? { ...spot, oshiPiece: updatedOshiPieces.find(o => o.id === oshiAtSpot.oshiId) }
          : { ...spot, oshiPiece: undefined };
      });
      
      // プレイヤーのポイントを更新
      const updatedPlayersWithPoints = state.players.map(player => {
        const playerResult = pointResults.find(r => r.playerId === player.id);
        return playerResult 
          ? { ...player, points: player.points + playerResult.totalPoints }
          : player;
      });
      
      // ラウンド履歴にファンサ結果を記録
      const fansaResults = pointResults.map(result => ({
        playerId: result.playerId,
        pointsEarned: result.totalPoints,
        breakdown: result.breakdown
      }));
      
      const updatedRoundHistoryWithFansa = state.gameState.roundHistory.map(round =>
        round.roundNumber === state.currentRound
          ? { ...round, fansaResults }
          : round
      );
      
      return {
        ...state,
        players: updatedPlayersWithPoints,
        gameState: {
          ...state.gameState,
          oshiPieces: updatedOshiPieces,
          hanamichiBoardState: { spots: updatedBoardSpots },
          roundHistory: updatedRoundHistoryWithFansa,
          currentDiceResult: diceResults[0] // 最初のサイコロ結果を保存（表示用）
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

  const selectOshikatsuDecision = (playerId: string, decision: OshikatsuDecision) => {
    dispatch({ type: 'SELECT_OSHIKATSU_DECISION', payload: { playerId, decision } });
  };

  const revealOshikatsuDecisions = () => {
    dispatch({ type: 'REVEAL_OSHIKATSU_DECISIONS' });
  };

  const generateFanserviceSpotCards = () => {
    dispatch({ type: 'GENERATE_FANSERVICE_SPOT_CARDS' });
  };

  const purchaseGoods = (playerId: string, goodsType: GoodsType): boolean => {
    if (!gameSession) return false;
    
    const player = gameSession.players.find(p => p.id === playerId);
    if (!player) return false;
    
    // グッズの価格設定
    const goodsPrices = {
      uchiwa: 1,
      penlight: 1,
      sashiire: 2
    };
    
    const price = goodsPrices[goodsType];
    
    // 資金チェック
    if (player.money < price) return false;
    
    // 利用可能なオタクコマチェック
    const availablePiece = player.otakuPieces.find(piece => 
      !piece.goods && piece.boardSpotId === undefined
    );
    
    if (!availablePiece) return false;
    
    dispatch({ type: 'PURCHASE_GOODS', payload: { playerId, goodsType } });
    return true;
  };

  const createKagebunshin = (playerId: string, originalPieceId: string): string | null => {
    if (!gameSession) return null;
    
    const player = gameSession.players.find(p => p.id === playerId);
    const originalPiece = player?.otakuPieces.find(p => p.id === originalPieceId);
    
    if (!player || !originalPiece || originalPiece.goods !== 'sashiire') {
      return null;
    }
    
    const kagebunshinId = `${originalPieceId}-kage-${Date.now()}`;
    dispatch({ type: 'CREATE_KAGEBUNSHIN', payload: { playerId, originalPieceId, kagebunshinId } });
    return kagebunshinId;
  };

  const getAvailableOtakuPieces = (playerId: string): OtakuPiece[] => {
    if (!gameSession) return [];
    
    const player = gameSession.players.find(p => p.id === playerId);
    if (!player) return [];
    
    // ボードに配置されていないオタクコマを返す
    return player.otakuPieces.filter(piece => piece.boardSpotId === undefined);
  };

  const processFansaTimePhase = () => {
    dispatch({ type: 'PROCESS_FANSA_TIME' });
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
      rollDiceAndProcessLabor,
      selectOshikatsuDecision,
      revealOshikatsuDecisions,
      generateFanserviceSpotCards,
      purchaseGoods,
      createKagebunshin,
      getAvailableOtakuPieces,
      processFansaTimePhase
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