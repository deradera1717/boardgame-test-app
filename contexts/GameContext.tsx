import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import { GameSession, GameState, Player, HanamichiBoard, BoardSpot, OshiPiece, GamePhase, TurnManager, RewardDistributionCard, OshikatsuDecision, GoodsType, OtakuPiece, GameError } from '../types/game';
import { createRewardDistributionCards, rollDice, processLaborPhase, createAllFanserviceSpotCards, prepareOshikatsuPhaseCards, processFansaTime, isGameComplete, calculateFinalResults, cleanupRoundEnd, getNextGameState } from '../utils/gameLogic';
import { useGamePersistence } from '../hooks/useGamePersistence';
import { useErrorHandler } from '../hooks/useErrorHandler';
import { 
  validatePlayerName, 
  validatePlayerCount, 
  validateGoodsPurchase, 
  validatePiecePlacement,
  validatePhaseAction,
  repairGameState
} from '../utils/errorHandling';

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
  endRound: () => void;
  endGame: () => void;
  getFinalResults: () => ReturnType<typeof calculateFinalResults> | null;
  isGameEnded: () => boolean;
  // データ永続化とログ記録機能
  saveGameManually: () => boolean;
  exportGameData: (gameId?: string) => string | null;
  loadSavedGame: () => GameSession | null;
  // エラーハンドリング機能
  currentError: GameError | null;
  clearError: () => void;
  validateGameState: () => GameError[];
  repairGameStateIfNeeded: () => boolean;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

type GameAction = 
  | { type: 'INITIALIZE_GAME'; payload: Player[] }
  | { type: 'LOAD_SAVED_GAME'; payload: GameSession }
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
  | { type: 'PROCESS_FANSA_TIME' }
  | { type: 'END_ROUND' }
  | { type: 'END_GAME' };

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
    case 'LOAD_SAVED_GAME':
      return action.payload;

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
      
      // 次のゲーム状態を決定
      const { nextRound, nextPhase } = getNextGameState(state.currentRound, state.currentPhase);

      // フェーズアクションをリセット
      const resetPhaseActions: { [playerId: string]: boolean } = {};
      state.players.forEach(player => {
        resetPhaseActions[player.id] = false;
      });

      // フェーズ遷移時にプレイヤーの一時的な選択をクリア
      let clearedPlayers = state.players.map(player => {
        const clearedPlayer = { ...player };
        
        // 労働フェーズから推しかつ決断フェーズに移る時は報酬カード選択をクリア
        if (state.currentPhase === 'labor' && nextPhase === 'oshikatsu-decision') {
          clearedPlayer.selectedRewardCard = undefined;
        }
        
        // ラウンド終了時にはすべての一時的な選択をクリア
        if (nextPhase === 'labor' || nextPhase === 'game-end') {
          clearedPlayer.selectedRewardCard = undefined;
          clearedPlayer.oshikatsuDecision = undefined;
        }
        
        return clearedPlayer;
      });

      // ラウンド終了時のクリーンアップ
      if (state.currentPhase === 'round-end' && nextPhase === 'labor') {
        clearedPlayers = cleanupRoundEnd(clearedPlayers);
      }

      return {
        ...state,
        players: clearedPlayers,
        currentPhase: nextPhase,
        currentRound: nextRound,
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
      
      // ファンサタイム完了後、自動的にラウンド終了フェーズに移行
      const shouldEndRound = state.currentPhase === 'fansa-time';
      
      return {
        ...state,
        players: updatedPlayersWithPoints,
        currentPhase: shouldEndRound ? 'round-end' : state.currentPhase,
        gameState: {
          ...state.gameState,
          oshiPieces: updatedOshiPieces,
          hanamichiBoardState: { spots: updatedBoardSpots },
          roundHistory: updatedRoundHistoryWithFansa,
          currentDiceResult: diceResults[0] // 最初のサイコロ結果を保存（表示用）
        }
      };

    case 'END_ROUND':
      if (!state) return null;
      
      // ラウンド終了処理
      const cleanedPlayers = cleanupRoundEnd(state.players);
      
      // ボード状態をクリア（推しコマを削除）
      const clearedBoardSpots = state.gameState.hanamichiBoardState.spots.map(spot => ({
        ...spot,
        oshiPiece: undefined,
        otakuPieces: [] // オタクコマも回収
      }));
      
      // 推しコマの位置をリセット
      const resetOshiPieces = state.gameState.oshiPieces.map(oshi => ({
        ...oshi,
        currentSpotId: undefined
      }));
      
      return {
        ...state,
        players: cleanedPlayers,
        currentPhase: 'round-end',
        gameState: {
          ...state.gameState,
          hanamichiBoardState: { spots: clearedBoardSpots },
          oshiPieces: resetOshiPieces,
          revealedCards: [] // 公開されたカードもクリア
        }
      };

    case 'END_GAME':
      if (!state) return null;
      
      return {
        ...state,
        currentPhase: 'game-end'
      };

    default:
      return state;
  }
};

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [gameSession, dispatch] = useReducer(gameReducer, null);
  
  // データ永続化とログ記録の統合
  const { loadSavedGame, saveGame, logAction, exportGameData, isGameStateValid } = useGamePersistence(gameSession);
  
  // エラーハンドリングの統合
  const { 
    currentError, 
    clearError, 
    showError, 
    validateOperation, 
    safeExecute, 
    validateGameState: validateGameStateErrors,
    recoverFromError
  } = useErrorHandler();

  // 初期化時に保存されたゲームを読み込み
  useEffect(() => {
    const savedGame = loadSavedGame();
    if (savedGame && isGameStateValid(savedGame)) {
      dispatch({ type: 'LOAD_SAVED_GAME', payload: savedGame });
    }
  }, []);

  const initializeGame = (players: Player[]) => {
    // プレイヤー数のバリデーション
    const playerCountError = validatePlayerCount(players.length);
    if (playerCountError) {
      showError(playerCountError);
      return;
    }
    
    // プレイヤー名の重複チェック
    for (let i = 0; i < players.length; i++) {
      const nameError = validatePlayerName(players[i].name, players.slice(0, i));
      if (nameError) {
        showError(nameError);
        return;
      }
    }
    
    safeExecute(() => {
      dispatch({ type: 'INITIALIZE_GAME', payload: players });
      logAction('GAME_INITIALIZED', { playerCount: players.length, playerNames: players.map(p => p.name) });
    });
  };

  const updateGameState = (updates: Partial<GameState>) => {
    dispatch({ type: 'UPDATE_GAME_STATE', payload: updates });
  };

  const movePiece = (pieceId: string, spotId: number) => {
    if (!gameSession) return;
    
    // 配置のバリデーション
    const placementError = validatePiecePlacement(pieceId, spotId, gameSession);
    if (placementError) {
      showError(placementError);
      return;
    }
    
    // フェーズチェック
    if (!validateOperation('placePiece', gameSession, { pieceId, spotId })) {
      return;
    }
    
    safeExecute(() => {
      dispatch({ type: 'MOVE_PIECE', payload: { pieceId, spotId } });
    });
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
    logAction('REWARD_CARD_SELECTED', { cardId }, playerId);
  };

  const rollDiceAndProcessLabor = () => {
    dispatch({ type: 'ROLL_DICE_AND_PROCESS_LABOR' });
    logAction('LABOR_PHASE_PROCESSED', { phase: 'labor' });
  };

  const selectOshikatsuDecision = (playerId: string, decision: OshikatsuDecision) => {
    dispatch({ type: 'SELECT_OSHIKATSU_DECISION', payload: { playerId, decision } });
    logAction('OSHIKATSU_DECISION_SELECTED', { decision }, playerId);
  };

  const revealOshikatsuDecisions = () => {
    dispatch({ type: 'REVEAL_OSHIKATSU_DECISIONS' });
  };

  const generateFanserviceSpotCards = () => {
    dispatch({ type: 'GENERATE_FANSERVICE_SPOT_CARDS' });
  };

  const purchaseGoods = (playerId: string, goodsType: GoodsType): boolean => {
    if (!gameSession) return false;
    
    // グッズ購入のバリデーション
    const purchaseError = validateGoodsPurchase(playerId, goodsType, gameSession);
    if (purchaseError) {
      showError(purchaseError);
      return false;
    }
    
    // フェーズチェック
    if (!validateOperation('purchaseGoods', gameSession, { playerId, goodsType })) {
      return false;
    }
    
    return safeExecute(() => {
      dispatch({ type: 'PURCHASE_GOODS', payload: { playerId, goodsType } });
      return true;
    }, false);
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
    logAction('FANSA_TIME_PROCESSED', { phase: 'fansa-time' });
  };

  const endRound = () => {
    dispatch({ type: 'END_ROUND' });
  };

  const endGame = () => {
    dispatch({ type: 'END_GAME' });
  };

  const getFinalResults = () => {
    if (!gameSession) return null;
    return calculateFinalResults(gameSession.players);
  };

  const isGameEnded = (): boolean => {
    if (!gameSession) return false;
    return gameSession.currentPhase === 'game-end';
  };

  // データ永続化とログ記録機能の公開
  const saveGameManually = (): boolean => {
    if (!gameSession) return false;
    return saveGame(gameSession);
  };

  // ゲーム状態の検証
  const validateGameState = (): GameError[] => {
    if (!gameSession) return [];
    return validateGameStateErrors(gameSession);
  };

  // ゲーム状態の修復
  const repairGameStateIfNeeded = (): boolean => {
    if (!gameSession) return false;
    
    const errors = validateGameState();
    if (errors.length === 0) return false;
    
    return safeExecute(() => {
      const repairedSession = repairGameState(gameSession);
      dispatch({ type: 'LOAD_SAVED_GAME', payload: repairedSession });
      return true;
    }, false);
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
      processFansaTimePhase,
      endRound,
      endGame,
      getFinalResults,
      isGameEnded,
      saveGameManually,
      exportGameData,
      loadSavedGame,
      currentError,
      clearError,
      validateGameState,
      repairGameStateIfNeeded
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