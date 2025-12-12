/**
 * エラーハンドリングシステムのデモンストレーション
 * 実装されたエラーハンドリング機能の動作例を示す
 */

import { 
  validatePlayerName, 
  validatePlayerCount, 
  validateSpotId, 
  validateGoodsPurchase,
  validateGameStateConsistency,
  repairGameState,
  isOperationSafe,
  createGameError,
  ERROR_MESSAGES
} from '../utils/errorHandling';
import { GameSession, Player } from '../types/game';

// デモ用のプレイヤーデータ
const createDemoPlayers = (): Player[] => [
  {
    id: 'player1',
    name: 'テストプレイヤー1',
    color: 'red',
    money: 2,
    points: 0,
    otakuPieces: [
      { id: 'p1-otaku1', playerId: 'player1', isKagebunshin: false },
      { id: 'p1-otaku2', playerId: 'player1', isKagebunshin: false, goods: 'uchiwa' },
      { id: 'p1-otaku3', playerId: 'player1', isKagebunshin: false },
      { id: 'p1-otaku4', playerId: 'player1', isKagebunshin: false }
    ]
  }
];

// デモ用のゲームセッション
const createDemoGameSession = (): GameSession => ({
  id: 'demo-session',
  players: createDemoPlayers(),
  currentRound: 1,
  currentPhase: 'oshikatsu-goods',
  activePlayerIndex: 0,
  gameState: {
    hanamichiBoardState: {
      spots: Array.from({ length: 8 }, (_, i) => ({
        id: i,
        position: { row: Math.floor(i / 4), col: i % 4 },
        otakuPieces: i === 0 ? [
          { id: 'p1-otaku2', playerId: 'player1', isKagebunshin: false, goods: 'uchiwa', boardSpotId: 0 },
          { id: 'p1-otaku3', playerId: 'player1', isKagebunshin: false, goods: 'penlight', boardSpotId: 0 },
          { id: 'p1-otaku4', playerId: 'player1', isKagebunshin: false, goods: 'sashiire', boardSpotId: 0 }
        ] : [],
        oshiPiece: undefined
      }))
    },
    oshiPieces: [
      { id: 'A', currentSpotId: undefined },
      { id: 'B', currentSpotId: undefined },
      { id: 'C', currentSpotId: undefined }
    ],
    fanserviceSpotCards: [],
    revealedCards: [],
    rewardDistributionCards: [],
    roundHistory: []
  },
  turnManager: {
    currentPlayer: 0,
    waitingForPlayers: ['player1'],
    phaseActions: { 'player1': false }
  },
  createdAt: new Date()
});

/**
 * エラーハンドリングのデモンストレーション
 */
export const runErrorHandlingDemo = () => {
  console.log('=== エラーハンドリングシステム デモンストレーション ===\n');

  // 1. プレイヤー名バリデーションのデモ
  console.log('1. プレイヤー名バリデーション:');
  
  const existingPlayers = createDemoPlayers();
  
  // 有効なプレイヤー名
  const validNameError = validatePlayerName('新しいプレイヤー', existingPlayers);
  console.log(`  有効な名前 "新しいプレイヤー": ${validNameError ? 'エラー' : 'OK'}`);
  
  // 空文字
  const emptyNameError = validatePlayerName('', existingPlayers);
  console.log(`  空文字 "": ${emptyNameError?.message || 'OK'}`);
  
  // 重複名
  const duplicateNameError = validatePlayerName('テストプレイヤー1', existingPlayers);
  console.log(`  重複名 "テストプレイヤー1": ${duplicateNameError?.message || 'OK'}`);

  console.log();

  // 2. スポットIDバリデーションのデモ
  console.log('2. スポットIDバリデーション:');
  
  const validSpotError = validateSpotId(3);
  console.log(`  有効なスポットID 3: ${validSpotError ? 'エラー' : 'OK'}`);
  
  const invalidSpotError = validateSpotId(10);
  console.log(`  無効なスポットID 10: ${invalidSpotError?.message || 'OK'}`);

  console.log();

  // 3. グッズ購入バリデーションのデモ
  console.log('3. グッズ購入バリデーション:');
  
  const gameSession = createDemoGameSession();
  
  // 有効な購入（うちわ、1金）
  const validPurchaseError = validateGoodsPurchase('player1', 'uchiwa', gameSession);
  console.log(`  有効な購入 (うちわ, 1金): ${validPurchaseError ? 'エラー' : 'OK'}`);
  
  // 資金不足（差し入れ、2金必要だが2金しかない）
  const insufficientFundsError = validateGoodsPurchase('player1', 'sashiire', gameSession);
  console.log(`  資金不足 (差し入れ, 2金): ${insufficientFundsError?.message || 'OK'}`);
  
  // 存在しないプレイヤー
  const invalidPlayerError = validateGoodsPurchase('nonexistent', 'uchiwa', gameSession);
  console.log(`  存在しないプレイヤー: ${invalidPlayerError?.message || 'OK'}`);

  console.log();

  // 4. 操作安全性チェックのデモ
  console.log('4. 操作安全性チェック:');
  
  // 有効な操作
  const validOperation = isOperationSafe('purchaseGoods', gameSession, { 
    playerId: 'player1', 
    goodsType: 'uchiwa' 
  });
  console.log(`  有効な操作 (グッズ購入): ${validOperation.safe ? 'OK' : validOperation.error?.message}`);
  
  // フェーズ不適合
  const wrongPhaseSession = { ...gameSession, currentPhase: 'labor' as const };
  const wrongPhaseOperation = isOperationSafe('purchaseGoods', wrongPhaseSession, { 
    playerId: 'player1', 
    goodsType: 'uchiwa' 
  });
  console.log(`  フェーズ不適合 (労働フェーズでグッズ購入): ${wrongPhaseOperation.safe ? 'OK' : wrongPhaseOperation.error?.message}`);

  console.log();

  // 5. ゲーム状態整合性チェックのデモ
  console.log('5. ゲーム状態整合性チェック:');
  
  const consistencyErrors = validateGameStateConsistency(gameSession);
  console.log(`  正常なゲーム状態: ${consistencyErrors.length === 0 ? 'OK' : `${consistencyErrors.length}個のエラー`}`);
  
  // 破損したゲーム状態
  const corruptedSession = { 
    ...gameSession, 
    activePlayerIndex: 10, // 無効なインデックス
    currentRound: 15 // 無効なラウンド数
  };
  const corruptedErrors = validateGameStateConsistency(corruptedSession);
  console.log(`  破損したゲーム状態: ${corruptedErrors.length}個のエラー`);
  corruptedErrors.forEach((error, index) => {
    console.log(`    ${index + 1}. ${error.message}`);
  });

  console.log();

  // 6. ゲーム状態修復のデモ
  console.log('6. ゲーム状態修復:');
  
  const repairedSession = repairGameState(corruptedSession);
  const repairedErrors = validateGameStateConsistency(repairedSession);
  console.log(`  修復後のゲーム状態: ${repairedErrors.length === 0 ? 'OK' : `${repairedErrors.length}個のエラー`}`);
  console.log(`  修復されたアクティブプレイヤーインデックス: ${corruptedSession.activePlayerIndex} → ${repairedSession.activePlayerIndex}`);
  console.log(`  ラウンド数は変更されません: ${repairedSession.currentRound}`);

  console.log();

  // 7. エラー作成のデモ
  console.log('7. エラー作成:');
  
  const customError = createGameError(
    'user-input',
    'カスタムエラーメッセージ',
    'player1',
    { customData: 'テストデータ' }
  );
  console.log(`  カスタムエラー: ${customError.message}`);
  console.log(`  エラータイプ: ${customError.type}`);
  console.log(`  プレイヤーID: ${customError.playerId}`);
  console.log(`  コンテキスト: ${JSON.stringify(customError.context)}`);

  console.log('\n=== デモンストレーション完了 ===');
};

// デモを実行（Node.js環境でのみ）
if (typeof window === 'undefined') {
  runErrorHandlingDemo();
}