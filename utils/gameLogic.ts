import { GamePhase, GameSession, Player, RewardDistributionCard, FanserviceSpotCard } from '../types/game';

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

/**
 * 8マス中3マスの全28通りの組み合わせを生成
 */
export const generateAllFanserviceSpotCombinations = (): [number, number, number][] => {
  const combinations: [number, number, number][] = [];
  
  // 0-7の8マスから3マスを選ぶ全ての組み合わせ
  for (let i = 0; i < 8; i++) {
    for (let j = i + 1; j < 8; j++) {
      for (let k = j + 1; k < 8; k++) {
        combinations.push([i, j, k]);
      }
    }
  }
  
  return combinations;
};

/**
 * ファンサスポットカードの全28通りを生成
 */
export const createAllFanserviceSpotCards = (): FanserviceSpotCard[] => {
  const combinations = generateAllFanserviceSpotCombinations();
  
  return combinations.map((spots, index) => ({
    id: `fanservice-card-${index + 1}`,
    spots,
    orientation: 'front', // デフォルトは表
    rotation: 0 // デフォルトは0度
  }));
};

/**
 * ランダムにファンサスポットカードを3枚選択
 */
export const selectRandomFanserviceSpotCards = (
  allCards: FanserviceSpotCard[],
  count: number = 3
): FanserviceSpotCard[] => {
  if (allCards.length < count) {
    throw new Error(`Not enough cards available. Required: ${count}, Available: ${allCards.length}`);
  }
  
  // カードをシャッフルして最初のcount枚を選択
  const shuffledCards = [...allCards].sort(() => Math.random() - 0.5);
  return shuffledCards.slice(0, count);
};

/**
 * カードの表裏をランダムに決定
 */
export const randomizeCardOrientation = (): 'front' | 'back' => {
  return Math.random() < 0.5 ? 'front' : 'back';
};

/**
 * カードの向きをランダムに決定
 */
export const randomizeCardRotation = (): 0 | 90 | 180 | 270 => {
  const rotations: (0 | 90 | 180 | 270)[] = [0, 90, 180, 270];
  return rotations[Math.floor(Math.random() * rotations.length)];
};

/**
 * ファンサスポットカードに表裏と向きをランダムに適用
 */
export const applyRandomCardProperties = (card: FanserviceSpotCard): FanserviceSpotCard => {
  return {
    ...card,
    orientation: randomizeCardOrientation(),
    rotation: randomizeCardRotation()
  };
};

/**
 * 推し活フェーズ用のファンサスポットカード3枚を準備
 */
export const prepareOshikatsuPhaseCards = (allCards?: FanserviceSpotCard[]): FanserviceSpotCard[] => {
  // 全カードが提供されていない場合は生成
  const cards = allCards || createAllFanserviceSpotCards();
  
  // ランダムに3枚選択
  const selectedCards = selectRandomFanserviceSpotCards(cards, 3);
  
  // 各カードに表裏と向きをランダムに適用
  return selectedCards.map(applyRandomCardProperties);
};

/**
 * サイコロの出目からファンサスポットを決定
 * 1-2 → スポット1、3-4 → スポット2、5-6 → スポット3
 */
export const mapDiceToFanserviceSpot = (diceResult: number): number => {
  if (diceResult < 1 || diceResult > 6) {
    throw new Error(`Invalid dice result: ${diceResult}`);
  }
  
  if (diceResult <= 2) return 0; // スポット1 (インデックス0)
  if (diceResult <= 4) return 1; // スポット2 (インデックス1)
  return 2; // スポット3 (インデックス2)
};

/**
 * ファンサタイムでの推しコマ配置を決定
 */
export const placeFansaOshiPieces = (
  revealedCards: FanserviceSpotCard[],
  diceResults: [number, number, number] // A, B, C の順
): { oshiId: 'A' | 'B' | 'C'; spotId: number }[] => {
  if (revealedCards.length !== 3) {
    throw new Error(`Expected 3 revealed cards, got ${revealedCards.length}`);
  }
  
  if (diceResults.length !== 3) {
    throw new Error(`Expected 3 dice results, got ${diceResults.length}`);
  }
  
  const placements: { oshiId: 'A' | 'B' | 'C'; spotId: number }[] = [];
  const oshiIds: ('A' | 'B' | 'C')[] = ['A', 'B', 'C'];
  
  for (let i = 0; i < 3; i++) {
    const card = revealedCards[i];
    const diceResult = diceResults[i];
    const oshiId = oshiIds[i];
    
    // サイコロの出目からスポットインデックスを決定
    const spotIndex = mapDiceToFanserviceSpot(diceResult);
    
    // カードの指定されたスポットを取得
    const spotId = card.spots[spotIndex];
    
    placements.push({ oshiId, spotId });
  }
  
  return placements;
};

/**
 * 隣接するスポットIDを取得（うちわボーナス用）
 */
export const getAdjacentSpots = (spotId: number): number[] => {
  const row = Math.floor(spotId / 4);
  const col = spotId % 4;
  const adjacentSpots: number[] = [];
  
  // 上下左右の隣接スポットを計算
  const directions = [
    [-1, 0], [1, 0], [0, -1], [0, 1] // 上、下、左、右
  ];
  
  directions.forEach(([dRow, dCol]) => {
    const newRow = row + dRow;
    const newCol = col + dCol;
    
    // ボード範囲内かチェック（2行4列）
    if (newRow >= 0 && newRow < 2 && newCol >= 0 && newCol < 4) {
      adjacentSpots.push(newRow * 4 + newCol);
    }
  });
  
  return adjacentSpots;
};

/**
 * 向かい側のスポットIDを取得（ペンライトボーナス用）
 */
export const getOppositeSpot = (spotId: number): number | null => {
  const row = Math.floor(spotId / 4);
  const col = spotId % 4;
  
  // 向かい側の行を計算（0 <-> 1）
  const oppositeRow = row === 0 ? 1 : 0;
  const oppositeSpotId = oppositeRow * 4 + col;
  
  return oppositeSpotId;
};

/**
 * 基本ポイント計算（目の前6ポイント山分け）
 */
export const calculateBasicPoints = (
  spotId: number,
  otakuPieces: any[]
): { playerId: string; points: number }[] => {
  if (otakuPieces.length === 0) {
    return [];
  }
  
  // 6ポイントを山分け
  const basePoints = 6;
  const pointsPerPiece = Math.floor(basePoints / otakuPieces.length);
  const remainder = basePoints % otakuPieces.length;
  
  const results: { playerId: string; points: number }[] = [];
  
  otakuPieces.forEach((piece, index) => {
    let points = pointsPerPiece;
    
    // 端数を最初のピースから順に配分
    if (index < remainder) {
      points += 1;
    }
    
    results.push({
      playerId: piece.playerId,
      points
    });
  });
  
  return results;
};

/**
 * うちわボーナス計算（隣接1ポイント）
 */
export const calculateUchiwaBonus = (
  oshiSpotId: number,
  allOtakuPieces: any[]
): { playerId: string; points: number }[] => {
  const adjacentSpots = getAdjacentSpots(oshiSpotId);
  const results: { playerId: string; points: number }[] = [];
  
  // 隣接スポットにいるうちわ持ちオタクコマを探す
  allOtakuPieces.forEach(piece => {
    if (piece.goods === 'uchiwa' && 
        piece.boardSpotId !== undefined && 
        adjacentSpots.includes(piece.boardSpotId)) {
      results.push({
        playerId: piece.playerId,
        points: 1
      });
    }
  });
  
  return results;
};

/**
 * ペンライトボーナス計算（向かい側1ポイント）
 */
export const calculatePenlightBonus = (
  oshiSpotId: number,
  allOtakuPieces: any[]
): { playerId: string; points: number }[] => {
  const oppositeSpot = getOppositeSpot(oshiSpotId);
  const results: { playerId: string; points: number }[] = [];
  
  if (oppositeSpot === null) {
    return results;
  }
  
  // 向かい側スポットにいるペンライト持ちオタクコマを探す
  allOtakuPieces.forEach(piece => {
    if (piece.goods === 'penlight' && 
        piece.boardSpotId === oppositeSpot) {
      results.push({
        playerId: piece.playerId,
        points: 1
      });
    }
  });
  
  return results;
};

/**
 * 差し入れボーナス計算（目の前のポイント2倍）
 */
export const applySashiireBonus = (
  spotId: number,
  otakuPieces: any[],
  basicPointResults: { playerId: string; points: number }[]
): { playerId: string; points: number }[] => {
  const results: { playerId: string; points: number }[] = [];
  
  // 差し入れを持つオタクコマを探す
  const sashiirePieces = otakuPieces.filter(piece => piece.goods === 'sashiire');
  
  basicPointResults.forEach(result => {
    const hasSashiire = sashiirePieces.some(piece => piece.playerId === result.playerId);
    
    results.push({
      playerId: result.playerId,
      points: hasSashiire ? result.points * 2 : result.points
    });
  });
  
  return results;
};

/**
 * 包括的ポイント計算システム
 */
export const calculateFansaPoints = (
  oshiPlacements: { oshiId: 'A' | 'B' | 'C'; spotId: number }[],
  boardState: any,
  allOtakuPieces: any[]
): { playerId: string; totalPoints: number; breakdown: string[] }[] => {
  const playerPointsMap = new Map<string, { points: number; breakdown: string[] }>();
  
  // 各推しの配置について計算
  oshiPlacements.forEach(({ oshiId, spotId }) => {
    // そのスポットにいるオタクコマを取得
    const spot = boardState.spots.find((s: any) => s.id === spotId);
    if (!spot) return;
    
    const otakuPiecesAtSpot = spot.otakuPieces || [];
    
    // 基本ポイント計算（6ポイント山分け）
    const basicPoints = calculateBasicPoints(spotId, otakuPiecesAtSpot);
    
    // 差し入れボーナス適用（基本ポイントを2倍）
    const sashiireAdjustedPoints = applySashiireBonus(spotId, otakuPiecesAtSpot, basicPoints);
    
    // 基本ポイント（差し入れ調整済み）を加算
    sashiireAdjustedPoints.forEach(({ playerId, points }) => {
      if (!playerPointsMap.has(playerId)) {
        playerPointsMap.set(playerId, { points: 0, breakdown: [] });
      }
      
      const playerData = playerPointsMap.get(playerId)!;
      playerData.points += points;
      
      const originalPoints = basicPoints.find(bp => bp.playerId === playerId)?.points || 0;
      if (points > originalPoints) {
        playerData.breakdown.push(`推し${oshiId}目の前(差し入れ2倍): ${points}ポイント`);
      } else {
        playerData.breakdown.push(`推し${oshiId}目の前: ${points}ポイント`);
      }
    });
    
    // うちわボーナス計算
    const uchiwaBonus = calculateUchiwaBonus(spotId, allOtakuPieces);
    uchiwaBonus.forEach(({ playerId, points }) => {
      if (!playerPointsMap.has(playerId)) {
        playerPointsMap.set(playerId, { points: 0, breakdown: [] });
      }
      
      const playerData = playerPointsMap.get(playerId)!;
      playerData.points += points;
      playerData.breakdown.push(`推し${oshiId}隣接(うちわ): ${points}ポイント`);
    });
    
    // ペンライトボーナス計算
    const penlightBonus = calculatePenlightBonus(spotId, allOtakuPieces);
    penlightBonus.forEach(({ playerId, points }) => {
      if (!playerPointsMap.has(playerId)) {
        playerPointsMap.set(playerId, { points: 0, breakdown: [] });
      }
      
      const playerData = playerPointsMap.get(playerId)!;
      playerData.points += points;
      playerData.breakdown.push(`推し${oshiId}向かい側(ペンライト): ${points}ポイント`);
    });
  });
  
  // 結果を配列に変換
  const results: { playerId: string; totalPoints: number; breakdown: string[] }[] = [];
  playerPointsMap.forEach((data, playerId) => {
    results.push({
      playerId,
      totalPoints: data.points,
      breakdown: data.breakdown
    });
  });
  
  return results;
};

/**
 * ファンサタイム全体の処理
 */
export const processFansaTime = (
  revealedCards: FanserviceSpotCard[],
  boardState: any,
  allOtakuPieces: any[]
): {
  oshiPlacements: { oshiId: 'A' | 'B' | 'C'; spotId: number }[];
  pointResults: { playerId: string; totalPoints: number; breakdown: string[] }[];
  diceResults: [number, number, number];
} => {
  // 各推しのサイコロを振る
  const diceResults: [number, number, number] = [
    rollDice(), // 推しA
    rollDice(), // 推しB
    rollDice()  // 推しC
  ];
  
  // 推しコマの配置を決定
  const oshiPlacements = placeFansaOshiPieces(revealedCards, diceResults);
  
  // ポイント計算
  const pointResults = calculateFansaPoints(oshiPlacements, boardState, allOtakuPieces);
  
  return {
    oshiPlacements,
    pointResults,
    diceResults
  };
};