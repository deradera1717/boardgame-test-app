import React from 'react';
import { Box, Typography, Card, CardContent, Button, Divider, Chip } from '@mui/material';
import { EmojiEvents, Star, MonetizationOn } from '@mui/icons-material';
import { useGame } from '../../contexts/GameContext';

interface GameResultsProps {
  onNewGame?: () => void;
}

const GameResults: React.FC<GameResultsProps> = ({ onNewGame }) => {
  const { getFinalResults, gameSession } = useGame();
  
  const results = getFinalResults();
  
  if (!results || !gameSession) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="h6">結果を読み込み中...</Typography>
      </Box>
    );
  }

  const { finalScores, winners, gameStats } = results;

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      {/* ゲーム終了ヘッダー */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h3" sx={{ mb: 2, color: 'primary.main' }}>
          🎉 ゲーム終了！ 🎉
        </Typography>
        <Typography variant="h6" sx={{ mb: 1 }}>
          8ラウンド完了
        </Typography>
        <Typography variant="body1" color="text.secondary">
          お疲れ様でした！
        </Typography>
      </Box>

      {/* 勝者発表 */}
      <Card sx={{ mb: 4, background: 'linear-gradient(45deg, #FFD700 30%, #FFA500 90%)' }}>
        <CardContent sx={{ textAlign: 'center' }}>
          <EmojiEvents sx={{ fontSize: 48, color: 'white', mb: 2 }} />
          <Typography variant="h4" sx={{ color: 'white', mb: 2 }}>
            🏆 勝者 🏆
          </Typography>
          {winners.map((winner, index) => (
            <Typography key={winner.playerId} variant="h5" sx={{ color: 'white', mb: 1 }}>
              {winner.playerName}
              <Chip 
                label={`${winner.totalPoints}ポイント`}
                sx={{ ml: 2, backgroundColor: 'white', color: 'primary.main' }}
              />
            </Typography>
          ))}
          {winners.length > 1 && (
            <Typography variant="body1" sx={{ color: 'white', mt: 1 }}>
              同点勝利！
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* 最終順位表 */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h5" sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
            <Star sx={{ mr: 1, color: 'primary.main' }} />
            最終順位
          </Typography>
          
          {finalScores.map((score, index) => {
            const isWinner = winners.some(w => w.playerId === score.playerId);
            return (
              <Box key={score.playerId} sx={{ mb: 2 }}>
                <Card 
                  variant="outlined" 
                  sx={{ 
                    backgroundColor: isWinner ? 'primary.light' : 'background.paper',
                    border: isWinner ? '2px solid' : '1px solid',
                    borderColor: isWinner ? 'primary.main' : 'divider'
                  }}
                >
                  <CardContent sx={{ py: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography variant="h6" sx={{ mr: 2, minWidth: 40 }}>
                          {index + 1}位
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                          {score.playerName}
                        </Typography>
                        {isWinner && (
                          <EmojiEvents sx={{ ml: 1, color: 'primary.main' }} />
                        )}
                      </Box>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="body2" color="text.secondary">
                            ポイント
                          </Typography>
                          <Typography variant="h6" sx={{ color: 'primary.main' }}>
                            {score.totalPoints}
                          </Typography>
                        </Box>
                        
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="body2" color="text.secondary">
                            残り資金
                          </Typography>
                          <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center' }}>
                            <MonetizationOn sx={{ fontSize: 16, mr: 0.5 }} />
                            {score.totalMoney}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Box>
            );
          })}
        </CardContent>
      </Card>

      {/* ゲーム統計 */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            📊 ゲーム統計
          </Typography>
          
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 2 }}>
            <Box sx={{ textAlign: 'center', p: 2, backgroundColor: 'background.default', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">
                総ラウンド数
              </Typography>
              <Typography variant="h5" sx={{ color: 'primary.main' }}>
                {gameStats.totalRounds}
              </Typography>
            </Box>
            
            <Box sx={{ textAlign: 'center', p: 2, backgroundColor: 'background.default', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">
                最高スコア
              </Typography>
              <Typography variant="h5" sx={{ color: 'success.main' }}>
                {gameStats.highestScore}
              </Typography>
            </Box>
            
            <Box sx={{ textAlign: 'center', p: 2, backgroundColor: 'background.default', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">
                平均スコア
              </Typography>
              <Typography variant="h5" sx={{ color: 'info.main' }}>
                {gameStats.averageScore}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* ラウンド履歴サマリー */}
      {gameSession.gameState.roundHistory.length > 0 && (
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              📈 ラウンド履歴
            </Typography>
            
            <Box sx={{ maxHeight: 300, overflowY: 'auto' }}>
              {gameSession.gameState.roundHistory.map((round, index) => (
                <Box key={round.roundNumber} sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                    ラウンド {round.roundNumber}
                  </Typography>
                  
                  {/* 労働結果 */}
                  {round.laborResults.length > 0 && (
                    <Box sx={{ mb: 1, pl: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        労働フェーズ:
                      </Typography>
                      {round.laborResults.map(result => (
                        <Typography key={result.playerId} variant="body2" sx={{ ml: 1 }}>
                          • {gameSession.players.find(p => p.id === result.playerId)?.name}: 
                          カード{result.selectedCard} → {result.reward}金
                        </Typography>
                      ))}
                    </Box>
                  )}
                  
                  {/* ファンサ結果 */}
                  {round.fansaResults.length > 0 && (
                    <Box sx={{ mb: 1, pl: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        ファンサタイム:
                      </Typography>
                      {round.fansaResults.map(result => (
                        <Typography key={result.playerId} variant="body2" sx={{ ml: 1 }}>
                          • {gameSession.players.find(p => p.id === result.playerId)?.name}: 
                          {result.pointsEarned}ポイント獲得
                        </Typography>
                      ))}
                    </Box>
                  )}
                  
                  {index < gameSession.gameState.roundHistory.length - 1 && (
                    <Divider sx={{ mt: 1 }} />
                  )}
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>
      )}

      {/* アクションボタン */}
      <Box sx={{ textAlign: 'center', mt: 4 }}>
        {onNewGame && (
          <Button 
            variant="contained" 
            size="large" 
            onClick={onNewGame}
            sx={{ mr: 2 }}
          >
            新しいゲームを開始
          </Button>
        )}
        
        <Button 
          variant="outlined" 
          size="large"
          onClick={() => window.location.reload()}
        >
          ページを再読み込み
        </Button>
      </Box>
    </Box>
  );
};

export default GameResults;