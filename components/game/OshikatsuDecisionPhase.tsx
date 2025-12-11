import React, { useState } from 'react';
import { useGame } from '../../contexts/GameContext';
import { OshikatsuDecision } from '../../types/game';

interface OshikatsuDecisionPhaseProps {
  currentPlayerId: string;
}

const OshikatsuDecisionPhase: React.FC<OshikatsuDecisionPhaseProps> = ({ currentPlayerId }) => {
  const { gameSession, areAllPlayersReady, selectOshikatsuDecision, revealOshikatsuDecisions } = useGame();
  const [isRevealed, setIsRevealed] = useState(false);

  if (!gameSession) return null;

  const currentPlayer = gameSession.players.find(p => p.id === currentPlayerId);
  const hasSelectedDecision = currentPlayer?.oshikatsuDecision !== undefined;
  const allPlayersReady = areAllPlayersReady();

  const handleDecisionSelect = (decision: OshikatsuDecision) => {
    if (!hasSelectedDecision && !isRevealed) {
      selectOshikatsuDecision(currentPlayerId, decision);
    }
  };

  const handleRevealDecisions = () => {
    if (allPlayersReady && !isRevealed) {
      setIsRevealed(true);
      revealOshikatsuDecisions();
    }
  };

  return (
    <div className="oshikatsu-decision-phase p-4">
      <h2 className="text-2xl font-bold mb-4">推しかつ決断フェーズ</h2>
      
      {!isRevealed ? (
        <>
          {/* 選択UI */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">あなたの選択</h3>
            <div className="grid grid-cols-2 gap-4">
              <div
                className={`border-2 p-6 rounded-lg cursor-pointer transition-colors text-center ${
                  currentPlayer?.oshikatsuDecision === 'participate'
                    ? 'border-blue-500 bg-blue-100'
                    : hasSelectedDecision
                    ? 'border-gray-300 bg-gray-100 cursor-not-allowed'
                    : 'border-gray-300 hover:border-blue-300 hover:bg-blue-50'
                }`}
                onClick={() => handleDecisionSelect('participate')}
              >
                <div className="text-2xl mb-2">🎤</div>
                <h4 className="text-xl font-bold mb-2">推しかつする</h4>
                <p className="text-sm text-gray-600">
                  推し活フェーズに参加してポイントを狙う
                </p>
              </div>

              <div
                className={`border-2 p-6 rounded-lg cursor-pointer transition-colors text-center ${
                  currentPlayer?.oshikatsuDecision === 'rest'
                    ? 'border-green-500 bg-green-100'
                    : hasSelectedDecision
                    ? 'border-gray-300 bg-gray-100 cursor-not-allowed'
                    : 'border-gray-300 hover:border-green-300 hover:bg-green-50'
                }`}
                onClick={() => handleDecisionSelect('rest')}
              >
                <div className="text-2xl mb-2">💤</div>
                <h4 className="text-xl font-bold mb-2">休む</h4>
                <p className="text-sm text-gray-600">
                  労働報酬と同額の追加資金を獲得
                </p>
              </div>
            </div>
          </div>

          {/* 選択状況（秘匿） */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">選択状況</h3>
            <div className="grid grid-cols-2 gap-2">
              {gameSession.players.map((player) => (
                <div
                  key={player.id}
                  className={`p-2 rounded ${
                    player.oshikatsuDecision
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  <span className="font-semibold">{player.name}</span>
                  <span className="ml-2">
                    {player.oshikatsuDecision
                      ? '選択済み'
                      : '選択中...'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 同時公開ボタン */}
          {allPlayersReady && (
            <div className="text-center">
              <button
                onClick={handleRevealDecisions}
                className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-3 px-6 rounded-lg text-lg"
              >
                全員の選択を公開
              </button>
            </div>
          )}
        </>
      ) : (
        /* 結果表示 */
        <div className="bg-gray-100 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">選択結果</h3>
          
          <div className="grid grid-cols-1 gap-4 mb-6">
            {gameSession.players.map((player) => {
              const decision = player.oshikatsuDecision;
              const lastLaborReward = gameSession.gameState.roundHistory
                .find(round => round.roundNumber === gameSession.currentRound)
                ?.laborResults.find(result => result.playerId === player.id)?.reward || 0;
              
              return (
                <div key={player.id} className="bg-white p-4 rounded border">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-lg">{player.name}</div>
                      <div className={`text-sm ${
                        decision === 'participate' ? 'text-blue-600' : 'text-green-600'
                      }`}>
                        {decision === 'participate' ? '🎤 推しかつする' : '💤 休む'}
                      </div>
                    </div>
                    
                    {decision === 'rest' && (
                      <div className="text-right">
                        <div className="text-sm text-gray-600">追加報酬</div>
                        <div className="font-bold text-green-600">+{lastLaborReward}金</div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 推し活フェーズ参加者 */}
          <div className="mb-4">
            <h4 className="font-semibold mb-2">推し活フェーズ参加者</h4>
            <div className="flex flex-wrap gap-2">
              {gameSession.players
                .filter(player => player.oshikatsuDecision === 'participate')
                .map(player => (
                  <span key={player.id} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                    {player.name}
                  </span>
                ))}
            </div>
            {gameSession.players.filter(player => player.oshikatsuDecision === 'participate').length === 0 && (
              <p className="text-gray-500 text-sm">参加者なし</p>
            )}
          </div>

          <div className="text-center">
            <p className="text-green-600 font-semibold">
              推しかつ決断フェーズが完了しました。次のフェーズに進んでください。
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default OshikatsuDecisionPhase;