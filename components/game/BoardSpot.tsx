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
      elevation={isHovering ? 6 : 2}
      onClick={handleClick}
      onDragOver={handleDragOverSpot}
      onDragLeave={handleDragLeave}
      onDrop={handleDropSpot}
      sx={{
        width: { xs: 80, sm: 100, md: 120 },
        height: { xs: 80, sm: 100, md: 120 },
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        cursor: 'pointer',
        backgroundColor: isHovering && canAcceptMorePieces 
          ? 'primary.light' 
          : canAcceptMorePieces 
            ? 'background.paper' 
            : 'error.light',
        border: spot?.oshiPiece 
          ? '3px solid' 
          : isHovering && canAcceptMorePieces
            ? '3px dashed'
            : '2px solid',
        borderColor: spot?.oshiPiece 
          ? 'secondary.main' 
          : isHovering && canAcceptMorePieces
            ? 'primary.main'
            : 'divider',
        borderRadius: 2,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: isHovering ? 'scale(1.05)' : 'scale(1)',
        boxShadow: isHovering 
          ? '0 8px 25px rgba(0, 0, 0, 0.15)' 
          : '0 2px 8px rgba(0, 0, 0, 0.1)',
        '&:hover': {
          backgroundColor: canAcceptMorePieces ? 'grey.100' : 'error.light',
          transform: 'scale(1.05)',
        },
        '&:focus': {
          outline: '3px solid',
          outlineColor: 'primary.main',
          outlineOffset: '2px'
        }
      }}
      tabIndex={0}
      role="gridcell"
      aria-label={`ボードスポット${spot?.id}${spot?.oshiPiece ? ` - 推し${spot.oshiPiece.id}が配置済み` : ''}${spot?.otakuPieces.length ? ` - オタクコマ${spot.otakuPieces.length}個配置済み` : ''}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {/* スポットID表示 */}
      <Box
        sx={{
          position: 'absolute',
          top: { xs: 1, sm: 2 },
          left: { xs: 1, sm: 2 },
          fontSize: { xs: '8px', sm: '10px' },
          color: 'text.secondary',
          fontWeight: 'bold',
          backgroundColor: 'background.paper',
          borderRadius: '50%',
          width: { xs: 16, sm: 20 },
          height: { xs: 16, sm: 20 },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 1
        }}
        aria-hidden="true"
      >
        {spot?.id}
      </Box>

      {/* 推しコマ表示 */}
      {spot?.oshiPiece && (
        <Box 
          sx={{ 
            position: 'absolute', 
            top: { xs: 2, sm: 5 }, 
            right: { xs: 2, sm: 5 },
            animation: 'bounce 0.6s ease-in-out'
          }}
        >
          <OshiPieceComponent oshi={spot.oshiPiece} />
        </Box>
      )}

      {/* オタクコマ表示 */}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: { xs: 0.25, sm: 0.5 },
          alignItems: 'center',
          justifyContent: 'center',
          mt: spot?.oshiPiece ? { xs: 1.5, sm: 2 } : 0,
          width: '100%',
          height: '100%',
          position: 'relative'
        }}
        role="group"
        aria-label={`オタクコマ${spot?.otakuPieces.length || 0}個`}
      >
        {spot?.otakuPieces.map((piece, index) => (
          <Box
            key={piece.id}
            sx={{
              transition: 'all 0.3s ease-in-out',
              animation: `fadeIn 0.3s ease-out ${index * 0.1}s both`,
              '&:hover': {
                transform: 'scale(1.2)',
                zIndex: 10
              }
            }}
          >
            <OtakuPieceComponent
              piece={piece}
              size="small"
              draggable={false}
              style={{
                transform: `scale(${0.9 - index * 0.05})`,
                zIndex: index
              }}
            />
          </Box>
        ))}
      </Box>

      {/* 配置制限表示 */}
      {spot && spot.otakuPieces.length >= 3 && (
        <Box
          sx={{
            position: 'absolute',
            bottom: { xs: 1, sm: 2 },
            right: { xs: 1, sm: 2 },
            fontSize: { xs: '7px', sm: '8px' },
            color: 'error.main',
            fontWeight: 'bold',
            backgroundColor: 'error.light',
            px: 0.5,
            py: 0.25,
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'error.main'
          }}
          className="animate-pulse"
          role="status"
          aria-label="このスポットは満員です"
        >
          満員
        </Box>
      )}

      {/* ドロップ可能エリア表示 */}
      {isHovering && canAcceptMorePieces && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'primary.light',
            opacity: 0.8,
            borderRadius: 2,
            animation: 'pulse 1s infinite'
          }}
          aria-hidden="true"
        >
          <Box
            sx={{
              fontSize: { xs: '1.5rem', sm: '2rem' },
              color: 'primary.main'
            }}
          >
            ⬇️
          </Box>
        </Box>
      )}
    </Paper>
  );
};

export default BoardSpotComponent;