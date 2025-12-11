import React, { useEffect } from 'react';
import { useGame } from '../../contexts/GameContext';
import FanserviceSpotCardsDisplay from './FanserviceSpotCardsDisplay';
import GoodsPurchase from './GoodsPurchase';
import OtakuPiecePlacement from './OtakuPiecePlacement';

interface OshikatsuPhaseProps {
  className?: string;
}

const OshikatsuPhase: React.FC<OshikatsuPhaseProps> = ({ className = '' }) => {
  const { gameSession, generateFanserviceSpotCards } = useGame();

  // 推し活フェーズが開始されたときにファンサスポットカードを生成
  useEffect(() => {
    if (gameSession?.currentPhase === 'oshikatsu-goods' && 
        gameSession.gameState.revealedCards.length === 0) {
      generateFanserviceSpotCards();
    }
  }, [gameSession?.currentPhase, gameSession?.gameState.revealedCards.length, generateFanserviceSpotCards]);

  if (!gameSession) {
    return (
      <div className={`oshikatsu-phase ${className}`}>
        <div className="text-center text-gray-500">
          ゲームセッションが開始されていません
        </div>
      </div>
    );
  }

  const { currentPhase, gameState } = gameSession;
  const { revealedCards } = gameState;

  // 推し活関連のフェーズでのみ表示
  const isOshikatsuPhase = ['oshikatsu-goods', 'oshikatsu-placement', 'fansa-time'].includes(currentPhase);

  if (!isOshikatsuPhase) {
    return null;
  }

  return (
    <div className={`oshikatsu-phase ${className}`}>
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4 text-center text-pink-600">
          推し活フェーズ
        </h2>
        
        <div className="mb-6">
          <div className="text-center text-gray-600 mb-4">
            現在のフェーズ: <span className="font-semibold">{getPhaseDisplayName(currentPhase)}</span>
          </div>
          
          {revealedCards.length > 0 ? (
            <FanserviceSpotCardsDisplay 
              cards={revealedCards}
              title="今回のファンサスポットカード"
              showDetails={true}
            />
          ) : (
            <div className="text-center text-gray-500 py-8">
              ファンサスポットカードを準備中...
            </div>
          )}
        </div>

        {currentPhase === 'oshikatsu-goods' && (
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">グッズ購入フェーズ</h3>
              <p className="text-sm text-gray-600">
                ファンサスポットを予測してグッズを購入しましょう。
                うちわ、ペンライト、差し入れから選択できます。
              </p>
            </div>
            
            {/* 各プレイヤーのグッズ購入UI */}
            <div className="grid gap-4">
              {gameSession.players
                .filter(player => player.oshikatsuDecision === 'participate')
                .map(player => (
                  <GoodsPurchase 
                    key={player.id} 
                    playerId={player.id}
                  />
                ))}
            </div>
          </div>
        )}

        {currentPhase === 'oshikatsu-placement' && (
          <div className="space-y-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">オタクコマ配置フェーズ</h3>
              <p className="text-sm text-gray-600">
                購入したグッズを持ったオタクコマを花道ボードに配置しましょう。
                各マスには最大3個まで配置できます。
              </p>
            </div>
            
            {/* 各プレイヤーのオタクコマ配置UI */}
            <div className="grid gap-4">
              {gameSession.players
                .filter(player => player.oshikatsuDecision === 'participate')
                .map(player => (
                  <OtakuPiecePlacement 
                    key={player.id} 
                    playerId={player.id}
                  />
                ))}
            </div>
          </div>
        )}

        {currentPhase === 'fansa-time' && (
          <div className="bg-yellow-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">ファンサタイム</h3>
            <p className="text-sm text-gray-600">
              サイコロを振って推しのファンサスポットを決定し、ポイントを計算します。
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// フェーズ名の日本語表示
const getPhaseDisplayName = (phase: string): string => {
  const phaseNames: { [key: string]: string } = {
    'oshikatsu-goods': 'グッズ購入',
    'oshikatsu-placement': 'オタクコマ配置',
    'fansa-time': 'ファンサタイム'
  };
  
  return phaseNames[phase] || phase;
};

export default OshikatsuPhase;