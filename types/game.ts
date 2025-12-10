// Core game type definitions for Oshi Game Testplay System

export type PlayerColor = 'red' | 'blue' | 'green' | 'yellow';
export type GamePhase = 
  | 'setup'
  | 'labor'
  | 'oshikatsu-decision' 
  | 'oshikatsu-goods'
  | 'oshikatsu-placement'
  | 'fansa-time'
  | 'round-end'
  | 'game-end';

export type GoodsType = 'uchiwa' | 'penlight' | 'sashiire';
export type OshikatsuDecision = 'participate' | 'rest';

export interface Player {
  id: string;
  name: string;
  color: PlayerColor;
  money: number;
  points: number;
  otakuPieces: OtakuPiece[];
  selectedRewardCard?: RewardDistributionCard;
  oshikatsuDecision?: OshikatsuDecision;
}

export interface OtakuPiece {
  id: string;
  playerId: string;
  boardSpotId?: number;
  goods?: GoodsType;
  isKagebunshin: boolean;
}

export interface OshiPiece {
  id: 'A' | 'B' | 'C';
  currentSpotId?: number;
}

export interface BoardSpot {
  id: number; // 0-7
  position: { row: number; col: number };
  otakuPieces: OtakuPiece[];
  oshiPiece?: OshiPiece;
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
  currentDiceResult?: number;
  roundHistory: RoundResult[];
}

export interface GameSession {
  id: string;
  players: Player[];
  currentRound: number;
  currentPhase: GamePhase;
  activePlayerIndex: number;
  gameState: GameState;
  turnManager: TurnManager;
  createdAt: Date;
}

export interface TurnManager {
  currentPlayer: number;
  waitingForPlayers: string[];
  phaseActions: { [playerId: string]: boolean }; // playerId -> completed
}

export interface GameError {
  type: 'user-input' | 'system' | 'validation';
  message: string;
  playerId?: string;
  context?: any;
}