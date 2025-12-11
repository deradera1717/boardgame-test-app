import React, { useState } from 'react';
import { useGame } from '../../contexts/GameContext';

interface FansaTimeProps {
  onPhaseComplete: () => void;
}

const FansaTime: React.FC<FansaTimeProps> = ({ onPhaseComplete }) => {
  const { gameSession, processFansaTimePhase, setPlayerActionCompleted } = useGame();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showResults, setShowResults] = useState(false);

  if (!gameSession) return null;

  const handleStartFansaTime = async () => {
    setIsProcessing(true);
    
    try {
      // ファンサタイムの処理を実行
      processFansaTimePhase();
      
      // 結果を表示
      setShowResults(true);
      
      // 少し待ってからフェーズ完了
      setTimeout(() => {
        setPlayerActionCompleted(gameSession.players[0].id, true);
        onPhaseComplete();
      }, 3000);
      
    } catch (error) {
      console.error('ファンサタイム処理エラー:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const currentRoundHistory = gameSession.gameState.roundHistory.find(
    round => round.roundNumber === gameSession.currentRound
  );

  const fansaResults = currentRoundHistory?.fansaResults || [];

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-center text-pink-600">
        ファンサタイム！
      </h2>

      {!showResults && (
        <div className="text-center">
          <p className="mb-4 text-gray-700">
            推しコマの位置をサイコロで決定し、ポイントを計算します
          </p>
          
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">公開されたファンサスポットカード</h3>
            <div className="grid grid-cols-3 gap-4">
              {gameSession.gameState.revealedCards.map((card, index) => (
                <div key={card.id} className="border-2 border-pink-300 rounded-lg p-3">
                  <div className="text-sm font-semibold text-pink-600 mb-2">
                    推し{['A', 'B', 'C'][index]}のカード
                  </div>
                  <div className="text-xs text-gray-600">
                    スポット: {card.spots.join(', ')}
                  </div>
                  <div className="text-xs text-gray-600">
                    向き: {card.orientation === 'front' ? '表' : '裏'} / {card.rotation}°
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleStartFansaTime}
            disabled={isProcessing}
            className="px-6 py-3 bg-pink-500 text-white rounded-lg hover:bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? 'サイコロを振っています...' : 'ファンサタイム開始！'}
          </button>
        </div>
      )}

      {showResults && (
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-xl font-semibold text-green-600 mb-4">
              ファンサタイム結果
            </h3>
          </div>

          {/* 推しコマの配置結果 */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-3">推しコマの配置</h4>
            <div className="grid grid-cols-3 gap-4">
              {gameSession.gameState.oshiPieces.map((oshi) => (
                <div key={oshi.id} className="text-center">
                  <div className="font-semibold text-pink-600">推し{oshi.id}</div>
                  <div className="text-sm text-gray-600">
                    スポット {oshi.currentSpotId !== undefined ? oshi.currentSpotId : '未配置'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ポイント獲得結果 */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-3">ポイント獲得結果</h4>
            {fansaResults.length > 0 ? (
              <div className="space-y-3">
                {fansaResults.map((result) => {
                  const player = gameSession.players.find(p => p.id === result.playerId);
                  return (
                    <div key={result.playerId} className="border-l-4 border-blue-400 pl-3">
                      <div className="font-semibold text-blue-700">
                        {player?.name}: +{result.pointsEarned}ポイント
                      </div>
                      <div className="text-sm text-gray-600">
                        {result.breakdown.map((detail, index) => (
                          <div key={index}>• {detail}</div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-gray-500 text-center">
                今回はポイント獲得者がいませんでした
              </div>
            )}
          </div>

          {/* 現在の総ポイント */}
          <div className="bg-yellow-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-3">現在の総ポイント</h4>
            <div className="grid grid-cols-2 gap-4">
              {gameSession.players.map((player) => (
                <div key={player.id} className="text-center">
                  <div className="font-semibold" style={{ color: player.color }}>
                    {player.name}
                  </div>
                  <div className="text-lg font-bold text-yellow-600">
                    {player.points}ポイント
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="text-center text-sm text-gray-500">
            3秒後に次のフェーズに進みます...
          </div>
        </div>
      )}
    </div>
  );
};

export default FansaTime;