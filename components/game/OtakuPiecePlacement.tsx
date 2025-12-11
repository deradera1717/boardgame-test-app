import React from 'react';
import { Box, Card, CardContent, Typography, Grid } from '@mui/material';
import { useGame } from '../../contexts/GameContext';
import OtakuPieceComponent from './OtakuPiece';

interface OtakuPiecePlacementProps {
  playerId: string;
  className?: string;
}

const OtakuPiecePlacement: React.FC<OtakuPiecePlacementProps> = ({ playerId, className = '' }) => {
  const { gameSession, getAvailableOtakuPieces } = useGame();

  if (!gameSession) {
    return null;
  }

  const player = gameSession.players.find(p => p.id === playerId);
  if (!player) {
    return null;
  }

  const availablePieces = getAvailableOtakuPieces(playerId);
  const piecesWithGoods = availablePieces.filter(piece => piece.goods);
  const piecesWithoutGoods = availablePieces.filter(piece => !piece.goods);

  return (
    <Box className={className}>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            オタクコマ配置 - {player.name}
          </Typography>
          
          <Typography variant="body2" color="text.secondary" gutterBottom>
            グッズを持つオタクコマを花道ボードにドラッグ&ドロップで配置してください
          </Typography>

          {piecesWithGoods.length > 0 ? (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 2 }}>
                配置可能なオタクコマ（グッズ付き）:
              </Typography>
              
              <Grid container spacing={2}>
                {piecesWithGoods.map((piece) => (
                  <Grid key={piece.id}>
                    <Box
                      sx={{
                        p: 1,
                        border: '2px dashed #2196f3',
                        borderRadius: 1,
                        backgroundColor: '#f5f5f5',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        minWidth: 80,
                        cursor: 'grab',
                        '&:hover': {
                          backgroundColor: '#e3f2fd'
                        }
                      }}
                    >
                      <OtakuPieceComponent
                        piece={piece}
                        size="medium"
                        draggable={true}
                      />
                      <Typography variant="caption" sx={{ mt: 1, textAlign: 'center' }}>
                        {piece.isKagebunshin ? '影分身' : 'オタクコマ'}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Box>
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body1" color="text.secondary">
                配置可能なグッズ付きオタクコマがありません
              </Typography>
              <Typography variant="body2" color="text.secondary">
                グッズ購入フェーズでグッズを購入してください
              </Typography>
            </Box>
          )}

          {piecesWithoutGoods.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle2" sx={{ mb: 2 }}>
                待機中のオタクコマ（グッズなし）:
              </Typography>
              
              <Grid container spacing={2}>
                {piecesWithoutGoods.map((piece) => (
                  <Grid key={piece.id}>
                    <Box
                      sx={{
                        p: 1,
                        border: '1px solid #ccc',
                        borderRadius: 1,
                        backgroundColor: '#fafafa',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        minWidth: 80,
                        opacity: 0.6
                      }}
                    >
                      <OtakuPieceComponent
                        piece={piece}
                        size="medium"
                        draggable={false}
                      />
                      <Typography variant="caption" sx={{ mt: 1, textAlign: 'center' }}>
                        グッズなし
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          <Box sx={{ mt: 3, p: 2, backgroundColor: '#f0f0f0', borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary">
              <strong>配置ルール:</strong>
              <br />• 各マスには最大3個まで配置可能
              <br />• グッズを持つオタクコマのみ配置可能
              <br />• 影分身も通常のオタクコマと同様に配置可能
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default OtakuPiecePlacement;