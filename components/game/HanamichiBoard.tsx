import React from 'react';
import { Box, Paper } from '@mui/material';
import { HanamichiBoard as HanamichiBoardType, BoardSpot } from '../../types/game';
import BoardSpotComponent from './BoardSpot';

interface HanamichiBoardProps {
  board: HanamichiBoardType;
  onSpotClick?: (spotId: number) => void;
  onPieceDrop?: (pieceId: string, spotId: number) => void;
}

const HanamichiBoard: React.FC<HanamichiBoardProps> = ({
  board,
  onSpotClick,
  onPieceDrop
}) => {
  // 2×4グリッドの配置を作成
  const renderBoard = () => {
    const rows = [];
    for (let row = 0; row < 2; row++) {
      const cols = [];
      for (let col = 0; col < 4; col++) {
        const spotId = row * 4 + col; // 0-7のID
        const spot = board.spots.find(s => s.id === spotId);
        
        cols.push(
          <Box key={spotId} sx={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
            <BoardSpotComponent
              spot={spot}
              onSpotClick={onSpotClick}
              onPieceDrop={onPieceDrop}
            />
          </Box>
        );
      }
      rows.push(
        <Box key={row} sx={{ display: 'flex', gap: 1, mb: 1 }}>
          {cols}
        </Box>
      );
    }
    return rows;
  };

  return (
    <Paper 
      elevation={3} 
      sx={{ 
        p: 2, 
        backgroundColor: '#f5f5f5',
        border: '2px solid #333',
        borderRadius: 2
      }}
    >
      <Box sx={{ mb: 1, textAlign: 'center', fontWeight: 'bold' }}>
        花道ボード
      </Box>
      <Box sx={{ width: '100%', maxWidth: 600 }}>
        {renderBoard()}
      </Box>
    </Paper>
  );
};

export default HanamichiBoard;