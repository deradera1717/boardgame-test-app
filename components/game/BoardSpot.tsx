import React, { useState } from 'react';
import { Box, Paper } from '@mui/material';
import { BoardSpot } from '../../types/game';
import OtakuPieceComponent from './OtakuPiece';
import OshiPieceComponent from './OshiPiece';
import { useDragAndDrop } from '../../hooks/useDragAndDrop';

interface BoardSpotProps {
  spot?: BoardSpot;
  onSpotClick?: (spotId: number) => void;
  onPieceDrop?: (pieceId: string, spotId: number) => void;
}

const BoardSpotComponent: React.FC<BoardSpotProps> = ({
  spot,
  onSpotClick,
  onPieceDrop
}) => {
  const [isHovering, setIsHovering] = useState(false);
  const { handleDragOver, handleDrop } = useDragAndDrop();

  const handleClick = () => {
    if (spot && onSpotClick) {
      onSpotClick(spot.id);
    }
  };

  const handleDragOverSpot = (e: React.DragEvent) => {
    handleDragOver(e);
    setIsHovering(true);
  };

  const handleDragLeave = () => {
    setIsHovering(false);
  };

  const handleDropSpot = (e: React.DragEvent) => {
    setIsHovering(false);
    handleDrop(e, (itemId: string, itemType: string) => {
      if (spot && onPieceDrop && itemType === 'otaku-piece') {
        onPieceDrop(itemId, spot.id);
      }
    });
  };

  const canAcceptMorePieces = !spot || spot.otakuPieces.length < 3;

  return (
    <Paper
      elevation={isHovering ? 3 : 1}
      onClick={handleClick}
      onDragOver={handleDragOverSpot}
      onDragLeave={handleDragLeave}
      onDrop={handleDropSpot}
      sx={{
        width: 120,
        height: 120,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        cursor: 'pointer',
        backgroundColor: isHovering && canAcceptMorePieces 
          ? '#e3f2fd' 
          : canAcceptMorePieces 
            ? '#fff' 
            : '#ffebee',
        border: spot?.oshiPiece 
          ? '3px solid #ff4081' 
          : isHovering && canAcceptMorePieces
            ? '2px dashed #2196f3'
            : '1px solid #ccc',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          backgroundColor: canAcceptMorePieces ? '#f0f0f0' : '#ffcdd2',
        }
      }}
    >
      {/* スポットID表示 */}
      <Box
        sx={{
          position: 'absolute',
          top: 2,
          left: 2,
          fontSize: '10px',
          color: '#666'
        }}
      >
        {spot?.id}
      </Box>

      {/* 推しコマ表示 */}
      {spot?.oshiPiece && (
        <Box sx={{ position: 'absolute', top: 5, right: 5 }}>
          <OshiPieceComponent oshi={spot.oshiPiece} />
        </Box>
      )}

      {/* オタクコマ表示 */}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 0.5,
          alignItems: 'center',
          justifyContent: 'center',
          mt: spot?.oshiPiece ? 2 : 0
        }}
      >
        {spot?.otakuPieces.map((piece, index) => (
          <OtakuPieceComponent
            key={piece.id}
            piece={piece}
            size="small"
            style={{
              transform: `scale(${0.8 - index * 0.1})`,
              zIndex: index
            }}
          />
        ))}
      </Box>

      {/* 配置制限表示 */}
      {spot && spot.otakuPieces.length >= 3 && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 2,
            fontSize: '8px',
            color: '#f44336',
            fontWeight: 'bold'
          }}
        >
          満員
        </Box>
      )}
    </Paper>
  );
};

export default BoardSpotComponent;