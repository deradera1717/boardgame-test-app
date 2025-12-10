import { GamePhase, GameSession, Player, RewardDistributionCard } from '../types/game';

/**
 * フェーズ遷移のルールを定義
 */
export const getNextPhase = (currentPhase: GamePhase): GamePhase => {
  const phaseOrder: GamePhase[] = [
    'setup',
    'labor',
    'oshikatsu-decision',
    'oshikatsu-goods',
    'oshikatsu-placement',
    'fansa-time',
    'round-end'
  ];

  const currentIndex = phaseOrder.indexOf(currentPhase);
  
  if (currentIndex === -1) {
    throw new Error(`Invalid phase: ${currentPhase}`);
  }

  // 最後のフェーズの場合
  if (currentIndex === phaseOrder.length - 1) {
    return 'labor'; // 次のラウンドの労働フェーズに戻る
  }

  return phaseOrder[currentIndex + 1];
};

/**
 * フェーズが同時アクション型かどうかを判定
 */
export const isSimultaneousPhase = (phase: GamePhase): boolean => {
  return ['labor', 'oshikatsu-decision', 'oshikatsu-goods', 'oshikatsu-placement'].includes(phase);
};

/**
 * フェーズが順番制アクション型かどうかを判定
 */
export const isTurnBasedPhase = (phase: GamePhase): boolean => {
  return ['fansa-time'].includes(phase);
};

/**
 * 次のプレイヤーのインデックスを取得（循環）
 */
export const getNextPlayerIndex = (currentIndex: number, totalPlayers: number): number => {
  return (currentIndex + 1) % totalPlayers;
};

/**
 * フェーズ遷移が可能かどうかを判定
 */
export const canTransitionToNextPhase = (gameSession: GameSession): boolean => {
  const { currentPhase, players, turnManager } = gameSession;

  // 同時アクション型フェーズの場合、全プレイヤーがアクション完了している必要がある
  if (isSimultaneousPhase(currentPhase)) {
    return players.every(player => turnManager.phaseActions[player.id] === true);
  }

  // 順番制フェーズの場合、現在のプレイヤーがアクション完了している必要がある
  if (isTurnBasedPhase(currentPhase)) {
    const currentPlayer = players[gameSession.activePlayerIndex];
    return turnManager.phaseActions[currentPlayer.id] === true;
  }

  // その他のフェーズは即座に遷移可能
  return true;
};

/**
 * ターン遷移が可能かどうかを判定
 */
export const canAdvanceTurn = (gameSession: GameSession): boolean => {
  const { currentPhase, players, activePlayerIndex, turnManager } = gameSession;

  // 順番制フェーズでのみターン遷移が発生
  if (!isTurnBasedPhase(currentPhase)) {
    return false;
  }

  const currentPlayer = players[activePlayerIndex];
  return turnManager.phaseActions[currentPlayer.id] === true;
};
/**
 * 報酬配分カードの定義
 */
export const createRewardDistributionCards = (): RewardDistributionCard[] => {
  return [
    {
      id: 'card-A',
      name: 'A',
      rewards: { 1: 3, 2: 2, 3: 1, 4: 0, 5: 0, 6: 0 }
    },
    {
      id: 'card-B',
      name: 'B',
      rewards: { 1: 2, 2: 3, 3: 2, 4: 1, 5: 0, 6: 0 }
    },
    {
      id: 'card-C',
      name: 'C',
      rewards: { 1: 1, 2: 2, 3: 3, 4: 2, 5: 1, 6: 0 }
    },
    {
      id: 'card-D',
      name: 'D',
      rewards: { 1: 0, 2: 1, 3: 2, 4: 3, 5: 2, 6: 1 }
    },
    {
      id: 'card-E',
      name: 'E',
      rewards: { 1: 0, 2: 0, 3: 1, 4: 2, 5: 3, 6: 2 }
    },
    {
      id: 'card-F',
      name: 'F',
      rewards: { 1: 0, 2: 0, 3: 0, 4: 1, 5: 2, 6: 3 }
    }
  ];
};

/**
 * サイコロを振る（1-6の値を返す）
 */
export const rollDice = (): number => {
  return Math.floor(Math.random() * 6) + 1;
};

/**
 * 労働フェーズの報酬計算
 */
export const calculateLaborReward = (
  selectedCard: RewardDistributionCard,
  diceResult: number
): number => {
  if (diceResult < 1 || diceResult > 6) {
    throw new Error(`Invalid dice result: ${diceResult}`);
  }
  
  return selectedCard.rewards[diceResult as keyof typeof selectedCard.rewards];
};

/**
 * プレイヤーの資金を更新
 */
export const updatePlayerMoney = (player: Player, amount: number): Player => {
  return {
    ...player,
    money: Math.max(0, player.money + amount) // 資金は0未満にならない
  };
};

/**
 * 労働フェーズの処理を実行
 */
export const processLaborPhase = (
  players: Player[],
  diceResult: number
): { updatedPlayers: Player[]; laborResults: any[] } => {
  const laborResults: any[] = [];
  const updatedPlayers = players.map(player => {
    if (!player.selectedRewardCard) {
      throw new Error(`Player ${player.id} has not selected a reward card`);
    }

    const reward = calculateLaborReward(player.selectedRewardCard, diceResult);
    const updatedPlayer = updatePlayerMoney(player, reward);

    laborResults.push({
      playerId: player.id,
      selectedCard: player.selectedRewardCard.name,
      diceResult,
      reward
    });

    return updatedPlayer;
  });

  return { updatedPlayers, laborResults };
};