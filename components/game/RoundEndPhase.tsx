import React from 'react';
import { Box, Typography, Card, CardContent, Button, Divider, Chip } from '@mui/material';
import { CheckCircle, ArrowForward, EmojiEvents } from '@mui/icons-material';
import { useGame } from '../../contexts/GameContext';
import { isGameComplete } from '../../utils/gameLogic';

const RoundEndPhase: React.FC = () => {
  const { gameSession, nextPhase } = useGame();
  
  if (!gameSession) {
    return null;
  }

  const currentRound = gameSession.currentRound;
  const currentRoundHistory = gameSession.gameState.roundHistory.find(
    round => round.roundNumber === currentRound
  );

  const isLastRound = currentRound >= 8;

  const handleNextRound = () => {
    if (isLastRound) {
      // ゲーム終了
      nextPhase(); // これで game-end フェーズに移行
    } else {
      // 次のラウンドへ
      nextPhase(); // これで次のラウンドの labor フェーズに移行
    }
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      {/* ラウンド終了ヘッダー */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <CheckCircle sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
        <Typography variant="h4" sx={{ mb: 2 }}>
          ラウンド {currentRound} 終了
        </Typography>
        {isLastRound ? (
          <Typography variant="h6" color="primary.main">
            全8ラウンド完了！
          </Typography>
        ) : (
          <Typography variant="h6" color="text.secondary">
            次のラウンドの準備をしています...
          </Typography>
        )}
      </Box>

      {/* 現在の順位表 */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 3 }}>
            現在の順位
          </Typography>
          
          {gameSession.players
            .sort((a, b) => b.points - a.points)
            .map((player, index) => (
              <Box key={player.id} sx={{ mb: 2 }}>
                <Card variant="outlined">
                  <CardContent sx={{ py: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography variant="h6" sx={{ mr: 2, minWidth: 40 }}>
                          {index + 1}位
                        </Typography>
                        <Typography variant="h6">
                          {player.name}
                        </Typography>
                        {index === 0 && (
                          <EmojiEvents sx={{ ml: 1, color: 'primary.main' }} />
                        )}
                      </Box>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Chip 
                          label={`${player.points}ポイント`}
                          color="primary"
                          variant="outlined"
                        />
                        <Chip 
                          label={`${player.money}金`}
                          color="secondary"
                          variant="outlined"
                        />
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Box>
            ))}
        </CardContent>
      </Card>

      {/* ラウンド結果サマリー */}
      {currentRoundHistory && (
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              ラウンド {currentRound} の結果
            </Typography>
            
            {/* 労働フェーズ結果 */}
            {currentRoundHistory.laborResults.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>
                  💼 労働フェーズ
                </Typography>
                <Box sx={{ pl: 2 }}>
                  {currentRoundHistory.laborResults.map(result => {
                    const player = gameSession.players.find(p => p.id === result.playerId);
                    return (
                      <Typography key={result.playerId} variant="body2" sx={{ mb: 0.5 }}>
                        • {player?.name}: カード{result.selectedCard} (サイコロ: {result.diceResult}) → {result.reward}金獲得
                      </Typography>
                    );
                  })}
                </Box>
              </Box>
            )}

            {/* 推しかつ決断結果 */}
            {currentRoundHistory.oshikatsuDecisions.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>
                  🤔 推しかつ決断
                </Typography>
                <Box sx={{ pl: 2 }}>
                  {currentRoundHistory.oshikatsuDecisions.map(decision => {
                    const player = gameSession.players.find(p => p.id === decision.playerId);
                    return (
                      <Typography key={decision.playerId} variant="body2" sx={{ mb: 0.5 }}>
                        • {player?.name}: {decision.decision === 'participate' ? '推しかつする' : '休む'}
                      </Typography>
                    );
                  })}
                </Box>
              </Box>
            )}

            {/* ファンサタイム結果 */}
            {currentRoundHistory.fansaResults.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>
                  ⭐ ファンサタイム
                </Typography>
                <Box sx={{ pl: 2 }}>
                  {currentRoundHistory.fansaResults.map(result => {
                    const player = gameSession.players.find(p => p.id === result.playerId);
                    return (
                      <Box key={result.playerId} sx={{ mb: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          • {player?.name}: {result.pointsEarned}ポイント獲得
                        </Typography>
                        {result.breakdown.length > 0 && (
                          <Box sx={{ pl: 2 }}>
                            {result.breakdown.map((detail, index) => (
                              <Typography key={index} variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                                - {detail}
                              </Typography>
                            ))}
                          </Box>
                        )}
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* 進行状況 */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            ゲーム進行状況
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Typography variant="body1" sx={{ mr: 2 }}>
              進行度:
            </Typography>
            <Box sx={{ 
              flex: 1, 
              height: 8, 
              backgroundColor: 'grey.300', 
              borderRadius: 4,
              overflow: 'hidden'
            }}>
              <Box sx={{ 
                width: `${(currentRound / 8) * 100}%`, 
                height: '100%', 
                backgroundColor: 'primary.main',
                transition: 'width 0.3s ease'
              }} />
            </Box>
            <Typography variant="body2" sx={{ ml: 2 }}>
              {currentRound}/8 ラウンド
            </Typography>
          </Box>
          
          <Typography variant="body2" color="text.secondary">
            {isLastRound 
              ? 'すべてのラウンドが完了しました。最終結果を確認しましょう！'
              : `残り ${8 - currentRound} ラウンドです。`
            }
          </Typography>
        </CardContent>
      </Card>

      {/* 次へ進むボタン */}
      <Box sx={{ textAlign: 'center' }}>
        <Button 
          variant="contained" 
          size="large"
          onClick={handleNextRound}
          startIcon={isLastRound ? <EmojiEvents /> : <ArrowForward />}
          sx={{ minWidth: 200 }}
        >
          {isLastRound ? '最終結果を見る' : '次のラウンドへ'}
        </Button>
      </Box>
    </Box>
  );
};

export default RoundEndPhase;