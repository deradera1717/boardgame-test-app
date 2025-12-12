// Core game type definitions for Oshi Game Testplay System

export type PlayerColor = 'red' | 'blue' | 'green' | 'yellow';
export type GamePhase = 
  | 'setup'
  | 'labor'
  | 'oshikatsu-decision' 
  | 'oshikatsu-card-reveal'
  | 'oshikatsu-goods'
  | 'oshikatsu-placement'
  | 'fansa-time'
  | 'round-end'
  | 'game-end';

export type OshikatsuSubPhase = 
  | 'card-reveal'    // ファンサスポット予測カード公開
  | 'goods-purchase' // グッズ購入
  | 'piece-placement'; // 待機（オタクコマ配置）

export type GoodsType = 'uchiwa' | 'penlight' | 'sashiire';
export type OshikatsuDecision = 'participate' | 'rest';

export interface Player {
  id: string;
  name: string;
  color: PlayerColor;
  money: number;
  points: number;
  otakuPieces: OtakuPiece[];
  selectedRewardCard?: RewardDistributionCard | null;
  oshikatsuDecision?: OshikatsuDecision | null;
}

export interface OtakuPiece {
  id: string;
  playerId: string;
  boardSpotId?: number | null;
  goods?: GoodsType | null;
  isKagebunshin: boolean;
}

export interface OshiPiece {
  id: 'A' | 'B' | 'C';
  currentSpotId?: number | null;
}

export interface BoardSpot {
  id: number; // 0-7
  position: { row: number; col: number };
  otakuPieces: OtakuPiece[];
  oshiPiece?: OshiPiece | null;
}

export interface HanamichiBoard {
  spots: BoardSpot[]; // 8 spots (2x4 grid)
}

export interface FanserviceSpotCard {
  id: string;
  spots: [number, number, number]; // 3 spots out of 8 (0-7)
  orientation: 'front' | 'back';
  rotation: 0 | 90 | 180 | 270;
}

export interface RewardDistributionCard {
  id: string;
  name: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  rewards: {
    1: number; 2: number; 3: number; 
    4: number; 5: number; 6: number;
  };
}

export interface RoundResult {
  roundNumber: number;
  laborResults: {
    playerId: string;
    selectedCard: string;
    diceResult: number;
    reward: number;
  }[];
  oshikatsuDecisions: {
    playerId: string;
    decision: OshikatsuDecision;
  }[];
  fansaResults: {
    playerId: string;
    pointsEarned: number;
    breakdown: string[];
  }[];
}

export interface GameState {
  hanamichiBoardState: HanamichiBoard;
  oshiPieces: OshiPiece[];
  fanserviceSpotCards: FanserviceSpotCard[];
  revealedCards: FanserviceSpotCard[];
  rewardDistributionCards: RewardDistributionCard[];
  currentDiceResult?: number | null;
  roundHistory: RoundResult[];
}

export interface GameSession {
  id: string;
  players: Player[];
  currentRound: number;
  currentPhase: GamePhase;
  currentSubPhase?: OshikatsuSubPhase; // 推し活フェーズのサブステップ管理
  activePlayerIndex: number;
  gameState: GameState;
  turnManager: TurnManager;
  createdAt: Date;
}

export interface TurnManager {
  currentPlayer: number;
  waitingForPlayers: string[];
  phaseActions: { [playerId: string]: boolean }; // playerId -> completed
  
  // Helper methods for turn management (optional - implemented in context)
  nextPlayer?(): void;
  isPlayerTurn?(playerId: string): boolean;
  allPlayersCompleted?(): boolean;
}

export interface OshiPlacement {
  oshiId: 'A' | 'B' | 'C';
  spotId: number;
  diceResult: number;
}

export interface PointCalculationResult {
  playerId: string;
  totalPoints: number;
  breakdown: string[];
  basePoints: number;
  bonusPoints: number;
}

export interface FansaTimeResult {
  oshiPlacements: OshiPlacement[];
  pointResults: PointCalculationResult[];
  diceResults: number[];
}

export interface GoodsPrice {
  uchiwa: 2;      // うちわ: 2金
  penlight: 2;    // ペンライト: 2金
  sashiire: 2;    // 差し入れ: 2金
  kagebunshin: 3; // 影分身: 3金
}

export const GOODS_PRICES: GoodsPrice = {
  uchiwa: 2,
  penlight: 2,
  sashiire: 2,
  kagebunshin: 3
};

export interface GameError {
  type: 'user-input' | 'system' | 'validation';
  message: string;
  playerId?: string | null;
  context?: any;
}

export interface ErrorRecovery {
  validateGameState(): boolean;
  repairInconsistencies(): void;
  rollbackToLastValidState(): void;
  notifyPlayersOfError(error: GameError): void;
}

// ゲーム操作の種類
export type GameOperation = 
  | 'placePiece'
  | 'purchaseGoods'
  | 'selectRewardCard'
  | 'selectOshikatsuDecision'
  | 'rollDice'
  | 'nextPhase'
  | 'nextTurn';

// ゲーム状態の検証結果
export interface ValidationResult {
  isValid: boolean;
  errors: GameError[];
  warnings?: string[];
}

// ゲームログエントリ
export interface GameLogEntry {
  timestamp: Date;
  action: string;
  playerId?: string | null;
  data?: any;
  roundNumber: number;
  phase: GamePhase;
}

// ゲーム統計
export interface GameStatistics {
  totalGames: number;
  averageGameDuration: number;
  playerWinRates: { [playerId: string]: number };
  averagePointsPerRound: number;
  mostUsedGoods: GoodsType;
  averageRoundsPerGame: number;
}