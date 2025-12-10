import React from 'react';
import { Box, Chip } from '@mui/material';
import { OshiPiece } from '../../types/game';

interface OshiPieceProps {
  oshi: OshiPiece;
  size?: 'small' | 'medium' | 'large';
}

const oshiColors = {
  A: { backgroundColor: '#e91e63', color: 'white' }, // ピンク
  B: { backgroundColor: '#9c27b0', color: 'white' }, // パープル
  C: { backgroundColor: '#673ab7', color: 'white' }  // ディープパープル
};

const OshiPieceComponent: React.FC<OshiPieceProps> = ({
  oshi,
  size = 'medium'
}) => {
  const sizeMap = {
    small: { width: 20, height: 20, fontSize: '10px' },
    medium: { width: 28, height: 28, fontSize: '12px' },
    large: { width: 36, height: 36, fontSize: '14px' }
  };

  return (
    <Box
      sx={{
        display: 'inline-block',
        position: 'relative'
      }}
    >
      <Chip
        label={oshi.id}
        size={size === 'small' ? 'small' : 'medium'}
        sx={{
          ...oshiColors[oshi.id],
          ...sizeMap[size],
          borderRadius: '50%',
          border: '2px solid #fff',
          boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
          '& .MuiChip-label': {
            padding: 0,
            fontSize: sizeMap[size].fontSize,
            fontWeight: 'bold'
          }
        }}
      />
      
      {/* 推しの輝きエフェクト */}
      <Box
        sx={{
          position: 'absolute',
          top: -2,
          left: -2,
          right: -2,
          bottom: -2,
          borderRadius: '50%',
          background: `linear-gradient(45deg, ${oshiColors[oshi.id].backgroundColor}40, transparent)`,
          animation: 'sparkle 2s ease-in-out infinite',
          '@keyframes sparkle': {
            '0%, 100%': { opacity: 0.3 },
            '50%': { opacity: 0.7 }
          }
        }}
      />
    </Box>
  );
};

export default OshiPieceComponent;