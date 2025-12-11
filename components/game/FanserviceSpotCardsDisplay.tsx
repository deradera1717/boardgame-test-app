import React from 'react';
import { FanserviceSpotCard as FanserviceSpotCardType } from '../../types/game';
import FanserviceSpotCard from './FanserviceSpotCard';

interface FanserviceSpotCardsDisplayProps {
  cards: FanserviceSpotCardType[];
  title?: string;
  className?: string;
  showDetails?: boolean;
}

const FanserviceSpotCardsDisplay: React.FC<FanserviceSpotCardsDisplayProps> = ({
  cards,
  title = "ファンサスポットカード",
  className = '',
  showDetails = true
}) => {
  if (cards.length === 0) {
    return (
      <div className={`fanservice-spot-cards-display ${className}`}>
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        <div className="text-gray-500 text-center py-8">
          カードが選択されていません
        </div>
      </div>
    );
  }

  return (
    <div className={`fanservice-spot-cards-display ${className}`}>
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cards.map((card, index) => (
          <div key={card.id} className="flex flex-col items-center">
            <div className="mb-2 text-sm font-medium text-gray-700">
              カード {index + 1}
            </div>
            <FanserviceSpotCard 
              card={card} 
              showDetails={showDetails}
              className="w-full max-w-xs"
            />
          </div>
        ))}
      </div>
      
      {cards.length > 0 && (
        <div className="mt-4 text-sm text-gray-600 bg-blue-50 p-3 rounded">
          <div className="font-medium mb-1">ファンサスポット判定ルール:</div>
          <div>• サイコロ 1-2 → カード1のスポット</div>
          <div>• サイコロ 3-4 → カード2のスポット</div>
          <div>• サイコロ 5-6 → カード3のスポット</div>
        </div>
      )}
    </div>
  );
};

export default FanserviceSpotCardsDisplay;