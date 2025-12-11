import React, { useState } from 'react';
import { Box, Button, Card, CardContent, Typography, Grid, Alert } from '@mui/material';
import { GoodsType } from '../../types/game';
import { useGame } from '../../contexts/GameContext';
import GoodsChip from './GoodsChip';

interface GoodsPurchaseProps {
  playerId: string;
  className?: string;
}

const goodsConfig = {
  uchiwa: {
    name: 'うちわ',
    price: 1,
    description: '隣接する推しから1ポイント獲得',
    color: '#ff5722'
  },
  penlight: {
    name: 'ペンライト',
    price: 1,
    description: '向かい側の推しから1ポイント獲得',
    color: '#ffeb3b'
  },
  sashiire: {
    name: '差し入れ',
    price: 2,
    description: '目の前の推しからのポイントを2倍にする（影分身作成可能）',
    color: '#8bc34a'
  }
};

const GoodsPurchase: React.FC<GoodsPurchaseProps> = ({ playerId, className = '' }) => {
  const { gameSession, purchaseGoods, createKagebunshin, getAvailableOtakuPieces } = useGame();
  const [message, setMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');

  if (!gameSession) {
    return null;
  }

  const player = gameSession.players.find(p => p.id === playerId);
  if (!player) {
    return null;
  }

  const availablePieces = getAvailableOtakuPieces(playerId);
  const availablePiecesWithoutGoods = availablePieces.filter(piece => !piece.goods);
  const sashiirePieces = availablePieces.filter(piece => piece.goods === 'sashiire' && !piece.isKagebunshin);

  const handlePurchase = (goodsType: GoodsType) => {
    const success = purchaseGoods(playerId, goodsType);
    
    if (success) {
      setMessage(`${goodsConfig[goodsType].name}を購入しました！`);
      setMessageType('success');
    } else {
      if (player.money < goodsConfig[goodsType].price) {
        setMessage('資金が不足しています');
      } else if (availablePiecesWithoutGoods.length === 0) {
        setMessage('利用可能なオタクコマがありません');
      } else {
        setMessage('購入に失敗しました');
      }
      setMessageType('error');
    }

    // メッセージを3秒後にクリア
    setTimeout(() => setMessage(''), 3000);
  };

  const handleCreateKagebunshin = (originalPieceId: string) => {
    const kagebunshinId = createKagebunshin(playerId, originalPieceId);
    
    if (kagebunshinId) {
      setMessage('影分身を作成しました！');
      setMessageType('success');
    } else {
      setMessage('影分身の作成に失敗しました');
      setMessageType('error');
    }

    // メッセージを3秒後にクリア
    setTimeout(() => setMessage(''), 3000);
  };

  const canPurchase = (goodsType: GoodsType) => {
    return player.money >= goodsConfig[goodsType].price && availablePiecesWithoutGoods.length > 0;
  };

  return (
    <Box className={className}>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            グッズ購入 - {player.name}
          </Typography>
          
          <Typography variant="body2" color="text.secondary" gutterBottom>
            所持金: {player.money}金 | 利用可能なオタクコマ: {availablePiecesWithoutGoods.length}個
          </Typography>

          {message && (
            <Alert severity={messageType} sx={{ mb: 2 }}>
              {message}
            </Alert>
          )}

          <Grid container spacing={2}>
            {(Object.keys(goodsConfig) as GoodsType[]).map((goodsType) => {
              const config = goodsConfig[goodsType];
              const canBuy = canPurchase(goodsType);
              
              return (
                <Grid size={{ xs: 12, sm: 4 }} key={goodsType}>
                  <Card 
                    variant="outlined" 
                    sx={{ 
                      height: '100%',
                      opacity: canBuy ? 1 : 0.6,
                      border: canBuy ? '2px solid #2196f3' : '1px solid #ccc'
                    }}
                  >
                    <CardContent sx={{ textAlign: 'center', p: 2 }}>
                      <Box sx={{ mb: 1 }}>
                        <GoodsChip goods={goodsType} size="large" />
                      </Box>
                      
                      <Typography variant="subtitle1" fontWeight="bold">
                        {config.name}
                      </Typography>
                      
                      <Typography variant="h6" color="primary" sx={{ mb: 1 }}>
                        {config.price}金
                      </Typography>
                      
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: 40 }}>
                        {config.description}
                      </Typography>
                      
                      <Button
                        variant="contained"
                        fullWidth
                        disabled={!canBuy}
                        onClick={() => handlePurchase(goodsType)}
                        sx={{ 
                          backgroundColor: canBuy ? config.color : undefined,
                          '&:hover': {
                            backgroundColor: canBuy ? config.color : undefined,
                            opacity: 0.8
                          }
                        }}
                      >
                        購入
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>

          {/* 影分身作成セクション */}
          {sashiirePieces.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                影分身作成
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                差し入れを持つオタクコマから影分身を作成できます
              </Typography>
              
              <Grid container spacing={1}>
                {sashiirePieces.map((piece) => (
                  <Grid key={piece.id}>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => handleCreateKagebunshin(piece.id)}
                      sx={{ minWidth: 120 }}
                    >
                      影分身作成
                    </Button>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default GoodsPurchase;