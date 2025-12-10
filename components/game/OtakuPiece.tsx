import React from 'react';
import { Box, Chip } from '@mui/material';
import { OtakuPiece, PlayerColor } from '../../types/game';
import GoodsChip from './GoodsChip';
import { useDragAndDrop } from '../../hooks/useDragAndDrop';

interface OtakuPieceProps {
  piece: OtakuPiece;
  size?: 'small' | 'medium' | 'large';
  draggable?: boolean;
  style?: React.CSSProperties;
  onDragStart?: (pieceId: string) => void;
}

const playerColorMap: Record<string, PlayerColor> = {
  'player1': 'red',
  'player2': 'blue', 
  'player3': 'green',
  'player4': 'yellow'
};

const colorStyles = {
  red: { backgroundColor: '#f44336', color: 'white' },
  blue: { backgroundColor: '#2196f3', color: 'white' },
  green: { backgroundColor: '#4caf50', color: 'white' },
  yellow: { backgroundColor: '#ff9800', color: 'black' }
};

const OtakuPieceComponent: React.FC<OtakuPieceProps> = ({
  piece,
  size = 'medium',
  draggable = true,
  style,
  onDragStart
}) => {
  const playerColor = playerColorMap[piece.playerId] || 'red';
  const { handleDragStart: handleDragStartHook, handleDragEnd, dragState } = useDragAndDrop();
  
  const sizeMap = {
    small: { width: 24, height: 24, fontSize: '10px' },
    medium: { width: 32, height: 32, fontSize: '12px' },
    large: { width: 40, height: 40, fontSize: '14px' }
  };

  const handleDragStart = (e: React.DragEvent) => {
    handleDragStartHook(e, piece.id, 'otaku-piece');
    if (onDragStart) {
      onDragStart(piece.id);
    }
  };

  const isDragging = dragState.isDragging && dragState.draggedItemId === piece.id;

  return (
    <Box
      draggable={draggable}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      sx={{
        position: 'relative',
        display: 'inline-block',
        cursor: draggable ? 'grab' : 'default',
        opacity: isDragging ? 0.5 : 1,
        transform: isDragging ? 'scale(1.1)' : 'scale(1)',
        transition: 'opacity 0.2s, transform 0.2s',
        '&:active': {
          cursor: draggable ? 'grabbing' : 'default'
        },
        '&:hover': {
          transform: draggable ? 'scale(1.05)' : 'scale(1)'
        },
        ...style
      }}
    >
      <Chip
        label="オ"
        size={size === 'small' ? 'small' : 'medium'}
        sx={{
          ...colorStyles[playerColor],
          ...sizeMap[size],
          borderRadius: '50%',
          opacity: piece.isKagebunshin ? 0.7 : 1,
          border: piece.isKagebunshin ? '2px dashed #666' : 'none',
          '& .MuiChip-label': {
            padding: 0,
            fontSize: sizeMap[size].fontSize,
            fontWeight: 'bold'
          }
        }}
      />
      
      {/* グッズチップ表示 */}
      {piece.goods && (
        <Box
          sx={{
            position: 'absolute',
            top: -4,
            right: -4,
            zIndex: 1
          }}
        >
          <GoodsChip goods={piece.goods} size="small" />
        </Box>
      )}
      
      {/* 影分身表示 */}
      {piece.isKagebunshin && (
        <Box
          sx={{
            position: 'absolute',
            bottom: -2,
            right: -2,
            fontSize: '8px',
            color: '#666',
            backgroundColor: 'white',
            borderRadius: '50%',
            width: 12,
            height: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid #ccc'
          }}
        >
          影
        </Box>
      )}
    </Box>
  );
};

export default OtakuPieceComponent;