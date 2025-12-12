# 設計書

## 概要

推し活ボードゲームテストプレイシステムは、Next.js + TypeScriptで構築されるWEBアプリケーションです。リアルタイムマルチプレイヤー機能を提供し、最大4人のプレイヤーが同一セッションでボードゲームをプレイできます。ゲームの状態管理にはReact Context、UIコンポーネントにはTailwind CSSを使用し、ゲームデータの永続化にはローカルストレージを活用します。

## アーキテクチャ

### システム構成
``` 
Frontend (Next.js + React)
├── Game Session Management
├── Real-time State Synchronization  
├── UI Components
└── Game Logic Engine

Data Layer
├── Local Storage (Game State)
├── Session Storage (Temporary Data)
└── JSON Export (Analytics)
```

### 技術スタック
- **フロントエンド**: Next.js 14, React 18, TypeScript
- **スタイリング**: Tailwind CSS
- **状態管理**: React Context + useReducer
- **データ永続化**: Browser Local Storage
- **リアルタイム同期**: WebSocket (Socket.io) または Polling
- **テスト**: Jest + React Testing Library
- **プロパティベーステスト**: fast-check

## コンポーネントとインターフェース

### コアコンポーネント

#### GameSession
```typescript
interface GameSession {
  id: string;
  players: Player[];
  currentRound: number;
  currentPhase: GamePhase;
  activePlayerIndex: number;
  gameState: GameState;
  createdAt: Date;
}
```

#### Player
```typescript
interface Player {
  id: string;
  name: string;
  color: PlayerColor;
  money: number;
  points: number;
  otakuPieces: OtakuPiece[];
  selectedRewardCard?: RewardDistributionCard;
  oshikatsuDecision?: 'participate' | 'rest';
}
```

#### GameState
```typescript
interface GameState {
  hanamichiBoardState: BoardState;
  oshiPieces: OshiPiece[];
  fanserviceSpotCards: FanserviceSpotCard[];
  revealedCards: FanserviceSpotCard[];
  rewardDistributionCards: RewardDistributionCard[];
  currentDiceResult?: number;
  roundHistory: RoundResult[];
}
```

#### HanamichiBoard
```typescript
interface HanamichiBoard {
  spots: BoardSpot[]; // 8 spots (2x4 grid)
}

interface BoardSpot {
  id: number; // 0-7
  position: { row: number; col: number };
  otakuPieces: OtakuPiece[];
  oshiPiece?: OshiPiece;
}
```

### UIコンポーネント階層

```
App
├── GameSetup
│   ├── PlayerNameInput
│   └── GameStartButton
├── GameBoard
│   ├── HanamichiBoardComponent
│   ├── PlayerStatusPanel
│   ├── PhaseIndicator
│   └── ActionPanel
├── PhaseComponents
│   ├── LaborPhase
│   ├── OshikatsuDecisionPhase
│   ├── OshikatsuPhase
│   └── FansaTimePhase
└── GameResults
```

## データモデル

### ゲーム要素の定義

#### FanserviceSpotCard
```typescript
interface FanserviceSpotCard {
  id: string;
  spots: [number, number, number]; // 3 spots out of 8 (0-7)
  orientation: 'front' | 'back';
  rotation: 0 | 90 | 180 | 270;
}
```

#### RewardDistributionCard
```typescript
interface RewardDistributionCard {
  id: string;
  name: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  rewards: {
    1: number; 2: number; 3: number; 
    4: number; 5: number; 6: number;
  };
}
```

#### OtakuPiece & Goods
```typescript
interface OtakuPiece {
  id: string;
  playerId: string;
  boardSpotId?: number;
  goods?: GoodsType;
  isKagebunshin: boolean;
}

type GoodsType = 'uchiwa' | 'penlight' | 'sashiire';

interface GoodsPrice {
  uchiwa: 2;      // うちわ: 2金
  penlight: 2;    // ペンライト: 2金
  sashiire: 2;    // 差し入れ: 2金
  kagebunshin: 3; // 影分身: 3金
}
```

### ゲームフロー管理

#### GamePhase
```typescript
type GamePhase = 
  | 'setup'
  | 'labor'
  | 'oshikatsu-decision' 
  | 'oshikatsu-card-reveal'
  | 'oshikatsu-goods'
  | 'oshikatsu-placement'
  | 'fansa-time'
  | 'round-end'
  | 'game-end';

type OshikatsuSubPhase = 
  | 'card-reveal'    // ファンサスポット予測カード公開
  | 'goods-purchase' // グッズ購入
  | 'piece-placement'; // 待機（オタクコマ配置）
```

#### ターン管理
```typescript
interface TurnManager {
  currentPlayer: number;
  waitingForPlayers: string[];
  phaseActions: Map<string, boolean>; // playerId -> completed
  
  nextPlayer(): void;
  isPlayerTurn(playerId: string): boolean;
  allPlayersCompleted(): boolean;
}
```

## 正確性プロパティ

*プロパティとは、システムの全ての有効な実行において真であるべき特性や動作のことです。これは人間が読める仕様と機械で検証可能な正確性保証の橋渡しとなります。*
### プロパティリフレクション

プロパティの冗長性を排除するため、以下の統合を行います：

**統合されるプロパティ:**
- 3.4と3.5: 報酬計算と資金更新は一つの包括的なプロパティに統合
- 5.3と5.4: グッズ購入とコマ配置は購入処理として統合
- 6.2, 6.3, 6.4, 6.5: 全てのポイント計算ルールを一つの包括的なプロパティに統合
- 7.1, 7.2, 7.3: ログ記録機能を一つのプロパティに統合
- 9.4と9.5: シリアライゼーションとデシリアライゼーションをラウンドトリッププロパティに統合

### 正確性プロパティ

**プロパティ1: プレイヤー数制限の遵守**
*任意の*プレイヤー名入力において、システムは最大4人までの参加者のみを受け付け、5人目以降の入力を拒否する
**検証対象: 要件 1.2**

**プロパティ2: ゲーム開始条件の管理**
*任意の*プレイヤー構成において、全プレイヤーの名前が入力された場合のみゲーム開始ボタンが有効化される
**検証対象: 要件 1.3**

**プロパティ3: 初期リソース配布の一貫性**
*任意の*プレイヤー数（1-4人）において、ゲーム開始時に各プレイヤーは正確に4個のオタクコマと3金を受け取る
**検証対象: 要件 1.5**

**プロパティ4: ターン順序の循環性**
*任意の*ゲーム状態において、プレイヤーのターンは設定された順序で循環し、最後のプレイヤーの次は最初のプレイヤーになる
**検証対象: 要件 2.2**

**プロパティ5: フェーズ遷移の整合性**
*任意の*フェーズにおいて、必要な条件が満たされた場合のみ次のフェーズに遷移し、フェーズ表示が正しく更新される
**検証対象: 要件 2.3**

**プロパティ6: アクション完了状態の追跡**
*任意の*プレイヤーアクションにおいて、完了状態が正確に記録され、他プレイヤーに適切に表示される
**検証対象: 要件 2.4, 2.5**

**プロパティ7: 報酬計算と資金更新の一貫性**
*任意の*サイコロ結果と報酬配分カード選択において、計算された報酬が各プレイヤーの所持金に正確に加算される
**検証対象: 要件 3.4, 3.5**

**プロパティ8: 秘匿選択の管理**
*任意の*推しかつ決断において、各プレイヤーの選択は他プレイヤーから隠され、全員完了時に同時公開される
**検証対象: 要件 4.2, 4.3**

**プロパティ9: 休む選択時の追加報酬**
*任意の*労働フェーズ報酬において、「休む」を選択したプレイヤーは労働で得た金額と同額の追加報酬を受け取る
**検証対象: 要件 4.4**

**プロパティ10: ファンサスポットカードのランダム生成**
*任意の*推し活フェーズにおいて、14枚のファンサスポット予測カードから裏表ランダムで3枚が選択され、カードの向き（表・裏）と上下がランダムに決定される
**検証対象: 要件 5.1, 5.2**

**プロパティ11: グッズ購入処理の整合性**
*任意の*グッズ購入において、うちわ・ペンライト・差し入れは2金、影分身は3金の価格で販売され、必要な資金が消費されて対応するグッズチップが正確に付与される
**検証対象: 要件 5.4**

**プロパティ12: オタクコマ配置制限の適用**
*任意の*ボードマスにおいて、3個のオタクコマが配置された場合、それ以上の配置が制限される
**検証対象: 要件 5.5**

**プロパティ13: 包括的ポイント計算システム**
*任意の*ファンサタイム結果において、推しの位置、オタクコマの配置、グッズの効果に基づいて正確なポイントが計算される（山分け、隣接ボーナス、向かい側ボーナス、差し入れ倍化を含む）
**検証対象: 要件 6.2, 6.3, 6.4, 6.5**

**プロパティ14: サイコロマッピングルールの適用**
*任意の*サイコロ結果において、1-2→スポット1、3-4→スポット2、5-6→スポット3のマッピングが正確に適用される
**検証対象: 要件 9.2**

**プロパティ15: 山分け計算の端数処理**
*任意の*ポイント山分けにおいて、端数が適切に処理され、総ポイント数が保存される
**検証対象: 要件 9.3**

**プロパティ16: ファンサスポット組み合わせの完全性**
*任意の*ファンサスポットカード生成において、8マス中3マスの全28通りの組み合わせが正確に管理される
**検証対象: 要件 9.1**

**プロパティ17: ゲーム状態のラウンドトリップ一貫性**
*任意の*ゲーム状態において、JSON形式でシリアライズしてからデシリアライズした結果が元の状態と等価である
**検証対象: 要件 9.4, 9.5**

**プロパティ18: 包括的ログ記録システム**
*任意の*ゲーム進行において、全ての選択、結果、ポイント詳細、行動履歴が完全に記録される
**検証対象: 要件 7.1, 7.2, 7.3**

**プロパティ19: 無効操作の検出と処理**
*任意の*無効な操作において、システムはエラーを検出し、適切なエラーメッセージを表示して操作を無効化する
**検証対象: 要件 8.3**

**プロパティ20: ラウンドフェーズ進行の順序性**
*任意の*ラウンドにおいて、労働フェーズ→推し活の決断→推し活フェーズ→ファンサタイム→ポイント計算の順序で進行し、各フェーズ完了後に次のフェーズに遷移する
**検証対象: 要件 9.1, 9.2**

**プロパティ21: 推し活フェーズのサブステップ順序性**
*任意の*推し活フェーズにおいて、ファンサスポット予測カード公開→グッズ購入→待機（オタクコマ配置）の3ステップが順序通りに実行される
**検証対象: 要件 9.4**

**プロパティ22: グッズ持ち越し制限の適用**
*任意の*ラウンド終了時において、資金は繰り越されるがグッズは持ち越されずに処理される
**検証対象: 要件 9.5**

**プロパティ23: オタクコマ配置順序の管理**
*任意の*待機ステップにおいて、スタートプレイヤーから順番にオタクコマを1つずつ配置し（1人最大4つまで）、通常配置完了後に影分身コマを順番に配置する
**検証対象: 要件 5.5, 5.7**

## エラーハンドリング

### エラー分類と対応

#### ユーザー入力エラー
- **無効なプレイヤー名**: 空文字、重複名の検出と警告表示
- **不正な操作**: ターン外操作、制限違反の検出と拒否
- **リソース不足**: 資金不足時の購入制限と通知

#### システムエラー
- **状態不整合**: ゲーム状態の検証と自動修復
- **通信エラー**: リアルタイム同期の失敗時の再試行機構
- **データ破損**: ローカルストレージの検証と初期化

#### 回復戦略
```typescript
interface ErrorRecovery {
  validateGameState(): boolean;
  repairInconsistencies(): void;
  rollbackToLastValidState(): void;
  notifyPlayersOfError(error: GameError): void;
}
```

## テスト戦略

### デュアルテストアプローチ

本システムでは単体テストとプロパティベーステストの両方を実装し、包括的な品質保証を行います：

- **単体テスト**: 特定の例、エッジケース、エラー条件を検証
- **プロパティベーステスト**: 全入力に対して成り立つべき普遍的プロパティを検証

### 単体テスト要件

単体テストは以下をカバーします：
- 特定のゲームシナリオでの正しい動作
- コンポーネント間の統合ポイント
- 境界値とエッジケースの処理

### プロパティベーステスト要件

- **使用ライブラリ**: fast-check (TypeScript/JavaScript用プロパティベーステストライブラリ)
- **実行回数**: 各プロパティテストは最低100回の反復実行を行う
- **タグ付け**: 各プロパティベーステストには対応する設計書のプロパティを明記する
  - 形式: `**Feature: oshi-game-testplay, Property {number}: {property_text}**`
- **実装**: 各正確性プロパティは単一のプロパティベーステストで実装する

### テスト対象コンポーネント

#### 高優先度テスト対象
1. **ゲームロジックエンジン**: 全ての計算とルール適用
2. **状態管理**: ゲーム状態の遷移と整合性
3. **データ永続化**: シリアライゼーション/デシリアライゼーション
4. **ターン管理**: プレイヤー順序と同期

#### 中優先度テスト対象
1. **UIコンポーネント**: ユーザー操作の受付と表示
2. **エラーハンドリング**: 例外状況の適切な処理
3. **データ分析**: ログ記録と統計生成

### テスト実行戦略

- **開発時**: 機能実装と同時にテスト作成
- **統合時**: コンポーネント間の相互作用を検証
- **リリース前**: 全テストスイートの実行と品質確認