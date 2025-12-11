import React from 'react';
import { FanserviceSpotCard } from '../../types/game';

interface FanserviceSpotCardProps {
  card: FanserviceSpotCard;
  className?: string;
  showDetails?: boolean;
}

const FanserviceSpotCard: React.FC<FanserviceSpotCardProps> = ({ 
  card, 
  className = '', 
  showDetails = true 
}) => {
  // 8マスのグリッドを表現（2行×4列）
  const renderGrid = () => {
    const spots = [];
    for (let i = 0; i < 8; i++) {
      const isActiveSpot = card.spots.includes(i);
      const row = Math.floor(i / 4);
      const col = i % 4;
      
      spots.push(
        <div
          key={i}
          className={`
            w-6 h-6 border border-gray-400 flex items-center justify-center text-xs
            ${isActiveSpot ? 'bg-pink-300 border-pink-500' : 'bg-gray-100'}
          `}
          style={{
            gridRow: row + 1,
            gridColumn: col + 1
          }}
        >
          {isActiveSpot ? '★' : i}
        </div>
      );
    }
    return spots;
  };

  // 回転スタイルを適用
  const getRotationStyle = () => {
    return {
      transform: `rotate(${card.rotation}deg)`,
      transformOrigin: 'center'
    };
  };

  // 表裏の表示
  const getOrientationDisplay = () => {
    return card.orientation === 'front' ? '表' : '裏';
  };

  return (
    <div className={`fanservice-spot-card ${className}`}>
      <div className="bg-white border-2 border-gray-300 rounded-lg p-4 shadow-md">
        {showDetails && (
          <div className="mb-2 text-sm text-gray-600">
            <div>カード: {card.id}</div>
            <div>向き: {getOrientationDisplay()}</div>
            <div>回転: {card.rotation}°</div>
            <div>スポット: [{card.spots.join(', ')}]</div>
          </div>
        )}
        
        <div className="flex justify-center">
          <div 
            className="grid grid-cols-4 gap-1 p-2 bg-gray-50 rounded border"
            style={getRotationStyle()}
          >
            {renderGrid()}
          </div>
        </div>
        
        {card.orientation === 'back' && (
          <div className="mt-2 text-center text-sm text-red-600">
            ※ 裏向きのため実際のスポットは見えません
          </div>
        )}
      </div>
    </div>
  );
};

export default FanserviceSpotCard;