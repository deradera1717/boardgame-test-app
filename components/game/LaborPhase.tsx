import React from 'react';
import { useGame } from '../../contexts/GameContext';
import { RewardDistributionCard } from '../../types/game';

interface LaborPhaseProps {
  currentPlayerId: string;
}

const LaborPhase: React.FC<LaborPhaseProps> = ({ currentPlayerId }) => {
  const { gameSession, selectRewardCard, rollDiceAndProcessLabor, areAllPlayersReady } = useGame();

  if (!gameSession) return null;

  const currentPlayer = gameSession.players.find(p => p.id === currentPlayerId);
  const hasSelectedCard = currentPlayer?.selectedRewardCard !== undefined;
  const allPlayersReady = areAllPlayersReady();
  const diceResult = gameSession.gameState.currentDiceResult;

  const handleCardSelect = (card: RewardDistributionCard) => {
    if (!hasSelectedCard) {
      selectRewardCard(currentPlayerId, card.id);
    }
  };

  const handleRollDice = () => {
    if (allPlayersReady && !diceResult) {
      rollDiceAndProcessLabor();
    }
  };

  return (
    <div className="labor-phase p-4">
      <h2 className="text-2xl font-bold mb-4">労働フェーズ</h2>
      
      {/* 報酬配分カード選択 */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">報酬配分カードを選択してください</h3>
        <div className="grid grid-cols-3 gap-4">
          {gameSession.gameState.rewardDistributionCards.map((card) => (
            <div
              key={card.id}
              className={`border-2 p-4 rounded-lg cursor-pointer transition-colors ${
                currentPlayer?.selectedRewardCard?.id === card.id
                  ? 'border-blue-500 bg-blue-100'
                  : hasSelectedCard
                  ? 'border-gray-300 bg-gray-100 cursor-not-allowed'
                  : 'border-gray-300 hover:border-blue-300 hover:bg-blue-50'
              }`}
              onClick={() => handleCardSelect(card)}
            >
              <div className="text-center">
                <h4 className="text-xl font-bold mb-2">カード {card.name}</h4>
                <div className="grid grid-cols-3 gap-1 text-sm">
                  {Object.entries(card.rewards).map(([dice, reward]) => (
                    <div key={dice} className="flex justify-between">
                      <span>{dice}:</span>
                      <span className="font-semibold">{reward}金</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* プレイヤー選択状況 */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">選択状況</h3>
        <div className="grid grid-cols-2 gap-2">
          {gameSession.players.map((player) => (
            <div
              key={player.id}
              className={`p-2 rounded ${
                player.selectedRewardCard
                  ? 'bg-green-100 text-green-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}
            >
              <span className="font-semibold">{player.name}</span>
              <span className="ml-2">
                {player.selectedRewardCard
                  ? `カード${player.selectedRewardCard.name}選択済み`
                  : '選択中...'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* サイコロとリザルト */}
      {allPlayersReady && (
        <div className="mb-6">
          {!diceResult ? (
            <button
              onClick={handleRollDice}
              className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-6 rounded-lg text-lg"
            >
              サイコロを振る
            </button>
          ) : (
            <div className="bg-gray-100 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-3">結果</h3>
              <div className="text-3xl font-bold text-center mb-4">
                サイコロの目: {diceResult}
              </div>
              
              {/* 各プレイヤーの報酬表示 */}
              <div className="grid grid-cols-2 gap-4">
                {gameSession.players.map((player) => {
                  const reward = player.selectedRewardCard?.rewards[diceResult as keyof typeof player.selectedRewardCard.rewards] || 0;
                  return (
                    <div key={player.id} className="bg-white p-3 rounded border">
                      <div className="font-semibold">{player.name}</div>
                      <div className="text-sm text-gray-600">
                        カード{player.selectedRewardCard?.name} → {reward}金獲得
                      </div>
                      <div className="text-sm">
                        所持金: {player.money}金
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 次のフェーズへ */}
      {diceResult && (
        <div className="text-center">
          <p className="text-green-600 font-semibold">
            労働フェーズが完了しました。次のフェーズに進んでください。
          </p>
        </div>
      )}
    </div>
  );
};

export default LaborPhase;