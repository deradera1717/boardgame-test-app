import React from 'react';
import { Box, Chip } from '@mui/material';
import { GoodsType } from '../../types/game';

interface GoodsChipProps {
  goods: GoodsType;
  size?: 'small' | 'medium' | 'large';
}

const goodsConfig = {
  uchiwa: {
    label: 'う',
    color: '#ff5722', // オレンジ
    name: 'うちわ'
  },
  penlight: {
    label: 'ペ',
    color: '#ffeb3b', // イエロー
    name: 'ペンライト'
  },
  sashiire: {
    label: '差',
    color: '#8bc34a', // ライトグリーン
    name: '差し入れ'
  }
};

const GoodsChip: React.FC<GoodsChipProps> = ({
  goods,
  size = 'medium'
}) => {
  const config = goodsConfig[goods];
  
  const sizeMap = {
    small: { width: 16, height: 16, fontSize: '8px' },
    medium: { width: 20, height: 20, fontSize: '10px' },
    large: { width: 24, height: 24, fontSize: '12px' }
  };

  return (
    <Box
      title={config.name}
      sx={{
        display: 'inline-block'
      }}
    >
      <Chip
        label={config.label}
        size="small"
        sx={{
          backgroundColor: config.color,
          color: 'black',
          ...sizeMap[size],
          borderRadius: '4px',
          border: '1px solid #333',
          '& .MuiChip-label': {
            padding: 0,
            fontSize: sizeMap[size].fontSize,
            fontWeight: 'bold'
          }
        }}
      />
    </Box>
  );
};

export default GoodsChip;