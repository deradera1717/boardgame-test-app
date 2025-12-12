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
    <div className="labor-phase p-4 animate-fade-in">
      <h2 className="text-2xl font-bold mb-6 text-center text-blue-600">
        💼 労働フェーズ
      </h2>
      
      {/* 報酬配分カード選択 */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4 text-center">
          報酬配分カードを選択してください
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
          {gameSession.gameState.rewardDistributionCards.map((card, index) => (
            <div
              key={card.id}
              className={`
                border-3 p-4 rounded-xl cursor-pointer transition-all duration-300 transform
                ${currentPlayer?.selectedRewardCard?.id === card.id
                  ? 'border-blue-500 bg-blue-100 scale-105 shadow-lg'
                  : hasSelectedCard
                  ? 'border-gray-300 bg-gray-100 cursor-not-allowed opacity-60'
                  : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50 hover:scale-102 hover:shadow-md'
                }
              `}
              onClick={() => handleCardSelect(card)}
              role="button"
              tabIndex={hasSelectedCard && currentPlayer?.selectedRewardCard?.id !== card.id ? -1 : 0}
              aria-label={`報酬配分カード${card.name}を選択`}
              aria-pressed={currentPlayer?.selectedRewardCard?.id === card.id}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleCardSelect(card);
                }
              }}
              style={{
                animationDelay: `${index * 0.1}s`
              }}
            >
              <div className="text-center">
                <h4 className="text-xl font-bold mb-3 text-gray-800">
                  カード {card.name}
                </h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {Object.entries(card.rewards).map(([dice, reward]) => (
                    <div 
                      key={dice} 
                      className="flex justify-between items-center bg-white rounded p-2 shadow-sm"
                    >
                      <span className="font-medium">🎲 {dice}:</span>
                      <span className="font-bold text-green-600">{reward}金</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* プレイヤー選択状況 */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4 text-center">
          📊 選択状況
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-4xl mx-auto">
          {gameSession.players.map((player, index) => (
            <div
              key={player.id}
              className={`
                p-4 rounded-lg transition-all duration-300 animate-slide-in
                ${player.selectedRewardCard
                  ? 'bg-green-100 text-green-800 border-2 border-green-300'
                  : 'bg-yellow-100 text-yellow-800 border-2 border-yellow-300 animate-pulse'
                }
              `}
              style={{
                animationDelay: `${index * 0.1}s`
              }}
              role="status"
              aria-label={`${player.name}の選択状況`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-lg">{player.name}</span>
                <span className="text-2xl">
                  {player.selectedRewardCard ? '✅' : '⏳'}
                </span>
              </div>
              <div className="mt-1 text-sm">
                {player.selectedRewardCard
                  ? `カード${player.selectedRewardCard.name}選択済み`
                  : '選択中...'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* サイコロとリザルト */}
      {allPlayersReady && (
        <div className="mb-8">
          {!diceResult ? (
            <div className="text-center">
              <button
                onClick={handleRollDice}
                className="
                  bg-gradient-to-r from-red-500 to-red-600 
                  hover:from-red-600 hover:to-red-700 
                  text-white font-bold py-4 px-8 rounded-xl text-xl
                  transform transition-all duration-300 
                  hover:scale-105 hover:shadow-lg
                  focus:outline-none focus:ring-4 focus:ring-red-300
                  animate-bounce
                "
                aria-label="サイコロを振って労働フェーズの結果を決定する"
              >
                🎲 サイコロを振る
              </button>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-xl shadow-lg animate-fade-in">
              <h3 className="text-xl font-bold mb-4 text-center text-gray-800">
                🎯 結果発表
              </h3>
              <div className="text-center mb-6">
                <div className="inline-block bg-white rounded-full p-4 shadow-lg animate-bounce">
                  <div className="text-4xl font-bold text-red-600">
                    🎲 {diceResult}
                  </div>
                </div>
              </div>
              
              {/* 各プレイヤーの報酬表示 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-4xl mx-auto">
                {gameSession.players.map((player, index) => {
                  const reward = player.selectedRewardCard?.rewards[diceResult as keyof typeof player.selectedRewardCard.rewards] || 0;
                  return (
                    <div 
                      key={player.id} 
                      className="bg-white p-4 rounded-lg border-2 border-gray-200 shadow-md animate-slide-in"
                      style={{
                        animationDelay: `${index * 0.2}s`
                      }}
                      role="region"
                      aria-label={`${player.name}の労働結果`}
                    >
                      <div className="font-bold text-lg text-gray-800 mb-2">
                        👤 {player.name}
                      </div>
                      <div className="text-sm text-gray-600 mb-1">
                        📋 カード{player.selectedRewardCard?.name} → 
                        <span className="font-bold text-green-600 ml-1">
                          💰 {reward}金獲得
                        </span>
                      </div>
                      <div className="text-sm font-medium">
                        💳 所持金: <span className="text-blue-600">{player.money}金</span>
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
        <div className="text-center animate-fade-in">
          <div className="inline-block bg-green-100 border-2 border-green-300 rounded-lg p-4">
            <p className="text-green-700 font-bold text-lg">
              ✅ 労働フェーズが完了しました。次のフェーズに進んでください。
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LaborPhase;