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
          <Box 
            key={spotId} 
            sx={{ 
              flex: 1, 
              display: 'flex', 
              justifyContent: 'center',
              transition: 'transform 0.2s ease-in-out',
              '&:hover': {
                transform: 'scale(1.02)'
              }
            }}
          >
            <BoardSpotComponent
              spot={spot}
              onSpotClick={onSpotClick}
              onPieceDrop={onPieceDrop}
            />
          </Box>
        );
      }
      rows.push(
        <Box 
          key={row} 
          sx={{ 
            display: 'flex', 
            gap: { xs: 0.5, sm: 1 }, 
            mb: { xs: 0.5, sm: 1 }
          }}
        >
          {cols}
        </Box>
      );
    }
    return rows;
  };

  return (
    <Paper 
      elevation={4} 
      sx={{ 
        p: { xs: 1.5, sm: 2 }, 
        backgroundColor: 'background.paper',
        border: '3px solid',
        borderColor: 'primary.main',
        borderRadius: 3,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15)',
          transform: 'translateY(-2px)'
        }
      }}
      role="grid"
      aria-label="花道ボード - 2行4列のゲームボード"
    >
      <Box 
        sx={{ 
          mb: { xs: 1, sm: 2 }, 
          textAlign: 'center', 
          fontWeight: 'bold',
          fontSize: { xs: '1rem', sm: '1.2rem' },
          color: 'primary.main',
          textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
        }}
        component="h2"
      >
        🎭 花道ボード
      </Box>
      <Box 
        sx={{ 
          width: '100%', 
          maxWidth: { xs: 350, sm: 500, md: 600 },
          margin: '0 auto'
        }}
      >
        {renderBoard()}
      </Box>
    </Paper>
  );
};

export default HanamichiBoard;