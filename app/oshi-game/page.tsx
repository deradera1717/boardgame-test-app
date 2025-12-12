"use client";

import React, { useState } from "react";
import { Container, Typography, Button, Box } from "@mui/material";
import { GameProvider, useGame } from "../../contexts/GameContext";
import HanamichiBoard from "../../components/game/HanamichiBoard";
import OtakuPieceComponent from "../../components/game/OtakuPiece";
import LaborPhase from "../../components/game/LaborPhase";
import OshikatsuDecisionPhase from "../../components/game/OshikatsuDecisionPhase";
import OshikatsuPhase from "../../components/game/OshikatsuPhase";
import RoundEndPhase from "../../components/game/RoundEndPhase";
import GameResults from "../../components/game/GameResults";
import ErrorDisplay from "../../components/game/ErrorDisplay";
import ErrorBoundary from "../../components/game/ErrorBoundary";
import PerformanceMonitor from "../../components/game/PerformanceMonitor";
import AccessibilityTester from "../../components/game/AccessibilityTester";
import ResponsiveContainer from "../../components/game/ResponsiveContainer";
import { Player } from "../../types/game";

// テスト用のプレイヤーデータ
const createTestPlayers = (): Player[] => [
  {
    id: 'player1',
    name: 'プレイヤー1',
    color: 'red',
    money: 3,
    points: 0,
    otakuPieces: [
      { id: 'p1-otaku1', playerId: 'player1', isKagebunshin: false },
      { id: 'p1-otaku2', playerId: 'player1', isKagebunshin: false },
      { id: 'p1-otaku3', playerId: 'player1', isKagebunshin: false },
      { id: 'p1-otaku4', playerId: 'player1', isKagebunshin: false }
    ]
  },
  {
    id: 'player2',
    name: 'プレイヤー2',
    color: 'blue',
    money: 3,
    points: 0,
    otakuPieces: [
      { id: 'p2-otaku1', playerId: 'player2', isKagebunshin: false },
      { id: 'p2-otaku2', playerId: 'player2', isKagebunshin: false },
      { id: 'p2-otaku3', playerId: 'player2', isKagebunshin: false },
      { id: 'p2-otaku4', playerId: 'player2', isKagebunshin: false }
    ]
  }
];

const GameContent: React.FC = () => {
  const { 
    gameSession, 
    initializeGame, 
    movePiece, 
    nextTurn, 
    nextPhase, 
    setPlayerActionCompleted,
    isPlayerTurn,
    areAllPlayersReady,
    getCurrentPlayer,
    getWaitingPlayers,
    isGameEnded,
    currentError,
    clearError,
    validateGameState,
    repairGameStateIfNeeded
  } = useGame();
  const [isGameStarted, setIsGameStarted] = useState(false);

  const handleStartGame = () => {
    const players = createTestPlayers();
    initializeGame(players);
    setIsGameStarted(true);
  };

  const handleNewGame = () => {
    setIsGameStarted(false);
    // ゲームセッションは新しく開始する時にリセットされる
  };

  const handlePieceDrop = (pieceId: string, spotId: number) => {
    movePiece(pieceId, spotId);
  };

  const handleSpotClick = (spotId: number) => {
    console.log(`スポット ${spotId} がクリックされました`);
  };

  if (!isGameStarted || !gameSession) {
    return (
      <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 }, minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <Box className="animate-fade-in" sx={{ textAlign: 'center' }}>
          <Typography 
            variant="h3" 
            component="h1"
            gutterBottom 
            sx={{ 
              fontWeight: 'bold',
              background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 2
            }}
          >
            推し活ボードゲーム
          </Typography>
          <Typography 
            variant="h5" 
            component="h2"
            sx={{ mb: 4, color: 'text.secondary' }}
          >
            テストプレイ
          </Typography>
          <Typography sx={{ mb: 6, fontSize: '1.1rem', maxWidth: '600px', mx: 'auto' }} align="center">
            最大4人のプレイヤーで推しのファンサスポットを予測し、オタクコマを配置してポイントを競うボードゲームです
          </Typography>
          <Box>
            <Button 
              variant="contained" 
              color="primary" 
              size="large"
              onClick={handleStartGame}
              sx={{ 
                py: 2, 
                px: 4, 
                fontSize: '1.2rem',
                borderRadius: 3,
                boxShadow: '0 4px 15px rgba(33, 150, 243, 0.3)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 6px 20px rgba(33, 150, 243, 0.4)'
                }
              }}
              aria-label="ゲームを開始する"
            >
              ゲーム開始
            </Button>
          </Box>
        </Box>
      </Container>
    );
  }

  // ゲーム終了画面
  if (isGameEnded()) {
    return (
      <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 }, minHeight: '100vh' }}>
        <Box className="animate-fade-in">
          <GameResults onNewGame={handleNewGame} />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 }, minHeight: '100vh' }}>
      <Box className="animate-fade-in">
        <Typography 
          variant="h4" 
          component="h1"
          gutterBottom 
          align="center"
          sx={{ 
            fontWeight: 'bold',
            mb: { xs: 2, md: 3 },
            fontSize: { xs: '1.5rem', md: '2rem' }
          }}
        >
          推し活ボードゲーム - ゲーム中
        </Typography>
        
        {/* エラー表示 */}
        {currentError && (
          <Box sx={{ mb: 3 }} className="animate-slide-in">
            <ErrorDisplay 
              error={currentError} 
              onDismiss={clearError}
            />
          </Box>
        )}
      
      {/* 労働フェーズの表示 */}
      {gameSession.currentPhase === 'labor' && (
        <Box sx={{ mb: 4 }}>
          <LaborPhase currentPlayerId={getCurrentPlayer()?.id || ''} />
        </Box>
      )}
      
      {/* 推しかつ決断フェーズの表示 */}
      {gameSession.currentPhase === 'oshikatsu-decision' && (
        <Box sx={{ mb: 4 }}>
          <OshikatsuDecisionPhase currentPlayerId={getCurrentPlayer()?.id || ''} />
        </Box>
      )}
      
      {/* 推し活フェーズの表示 */}
      {['oshikatsu-goods', 'oshikatsu-placement', 'fansa-time'].includes(gameSession.currentPhase) && (
        <Box sx={{ mb: 4 }}>
          <OshikatsuPhase />
        </Box>
      )}
      
      {/* ラウンド終了フェーズの表示 */}
      {gameSession.currentPhase === 'round-end' && (
        <Box sx={{ mb: 4 }}>
          <RoundEndPhase />
        </Box>
      )}
      
        {/* ラウンド終了フェーズでは通常のゲームボードを非表示 */}
        {gameSession.currentPhase !== 'round-end' && (
          <ResponsiveContainer
            mobileLayout="stack"
            tabletLayout="grid"
            desktopLayout="sidebar"
          >
            {/* ゲームボード */}
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'center',
              width: '100%'
            }}>
              <HanamichiBoard
                board={gameSession.gameState.hanamichiBoardState}
                onSpotClick={handleSpotClick}
                onPieceDrop={handlePieceDrop}
              />
            </Box>

            {/* プレイヤー情報とオタクコマ */}
            <Box sx={{ 
              width: '100%',
              maxWidth: { xs: '600px', lg: 'none' },
              mx: { xs: 'auto', lg: 0 }
            }}>
              <Typography 
                variant="h6" 
                component="h2"
                gutterBottom
                sx={{ fontSize: { xs: '1.1rem', md: '1.25rem' } }}
              >
                プレイヤー情報
              </Typography>
            
              {gameSession.players.map((player, index) => {
                const isCurrentPlayer = isPlayerTurn(player.id);
                const hasCompletedAction = gameSession.turnManager.phaseActions[player.id];
                
                return (
                  <Box 
                    key={player.id} 
                    className={isCurrentPlayer ? "animate-pulse" : "animate-fade-in"}
                    sx={{ 
                      mb: { xs: 2, md: 3 }, 
                      p: { xs: 1.5, md: 2 }, 
                      border: isCurrentPlayer ? '3px solid' : '1px solid',
                      borderColor: isCurrentPlayer ? 'primary.main' : 'grey.300',
                      borderRadius: 2,
                      backgroundColor: hasCompletedAction 
                        ? 'success.light' 
                        : isCurrentPlayer 
                          ? 'primary.light' 
                          : 'background.paper',
                      boxShadow: isCurrentPlayer ? 3 : 1,
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      transform: isCurrentPlayer ? 'scale(1.02)' : 'scale(1)',
                      '&:hover': {
                        boxShadow: 4,
                        transform: 'scale(1.01)'
                      }
                    }}
                    role="region"
                    aria-label={`${player.name}のプレイヤー情報`}
                  >
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      mb: 1,
                      flexDirection: { xs: 'column', sm: 'row' },
                      gap: { xs: 1, sm: 0 }
                    }}>
                      <Typography 
                        variant="subtitle1" 
                        component="h3"
                        sx={{ 
                          fontWeight: 'bold',
                          fontSize: { xs: '1rem', md: '1.1rem' }
                        }}
                      >
                        {player.name}
                        {isCurrentPlayer && (
                          <Box 
                            component="span" 
                            sx={{ 
                              color: 'primary.main',
                              fontWeight: 'bold',
                              ml: 1,
                              fontSize: { xs: '0.8rem', md: '0.9rem' }
                            }}
                            aria-label="現在のターン"
                          >
                            (現在のターン)
                          </Box>
                        )}
                      </Typography>
                      
                      <Button
                        variant={hasCompletedAction ? "outlined" : "contained"}
                        size="small"
                        color={hasCompletedAction ? "success" : "primary"}
                        onClick={() => setPlayerActionCompleted(player.id, !hasCompletedAction)}
                        sx={{
                          minWidth: { xs: '120px', md: '140px' },
                          transition: 'all 0.2s ease-in-out',
                          '&:hover': {
                            transform: 'translateY(-1px)'
                          }
                        }}
                        aria-label={hasCompletedAction ? `${player.name}のアクション完了を取り消す` : `${player.name}のアクションを完了にする`}
                      >
                        {hasCompletedAction ? "完了済み" : "アクション完了"}
                      </Button>
                    </Box>
                    
                    <Box sx={{ 
                      display: 'grid', 
                      gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                      gap: 1,
                      mb: 2
                    }}>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          fontWeight: 'medium',
                          fontSize: { xs: '0.9rem', md: '1rem' }
                        }}
                      >
                        💰 資金: <strong>{player.money}金</strong>
                      </Typography>
                      <Typography 
                        variant="body2"
                        sx={{ 
                          fontWeight: 'medium',
                          fontSize: { xs: '0.9rem', md: '1rem' }
                        }}
                      >
                        ⭐ ポイント: <strong>{player.points}</strong>
                      </Typography>
                    </Box>
                    
                    <Typography 
                      variant="body2" 
                      component="h4"
                      sx={{ 
                        mb: 1,
                        fontWeight: 'medium',
                        fontSize: { xs: '0.9rem', md: '1rem' }
                      }}
                    >
                      オタクコマ:
                    </Typography>
                    <Box 
                      sx={{ 
                        display: 'flex', 
                        gap: 1, 
                        flexWrap: 'wrap',
                        justifyContent: { xs: 'center', sm: 'flex-start' }
                      }}
                      role="group"
                      aria-label={`${player.name}のオタクコマ`}
                    >
                      {player.otakuPieces
                        .filter(piece => !piece.boardSpotId) // ボードに配置されていないコマのみ表示
                        .map((piece) => (
                          <Box
                            key={piece.id}
                            sx={{
                              transition: 'transform 0.2s ease-in-out',
                              '&:hover': {
                                transform: 'scale(1.1)'
                              }
                            }}
                          >
                            <OtakuPieceComponent
                              piece={piece}
                              size="medium"
                              draggable={true}
                            />
                          </Box>
                        ))}
                      {player.otakuPieces.filter(piece => !piece.boardSpotId).length === 0 && (
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            color: 'text.secondary',
                            fontStyle: 'italic',
                            fontSize: { xs: '0.8rem', md: '0.9rem' }
                          }}
                        >
                          全てのコマがボードに配置済み
                        </Typography>
                      )}
                    </Box>
                  </Box>
                );
              })}

              {/* ゲーム状態表示 */}
              <Box 
                sx={{ 
                  mt: { xs: 2, md: 3 }, 
                  p: { xs: 1.5, md: 2 }, 
                  backgroundColor: 'background.paper',
                  borderRadius: 2,
                  boxShadow: 2,
                  border: '1px solid',
                  borderColor: 'divider'
                }}
                className="animate-slide-in"
                role="region"
                aria-label="ゲーム状態"
              >
                <Typography 
                  variant="subtitle1" 
                  component="h3"
                  sx={{ 
                    fontWeight: 'bold',
                    mb: 2,
                    fontSize: { xs: '1rem', md: '1.1rem' }
                  }}
                >
                  🎮 ゲーム状態
                </Typography>
                
                <Box sx={{ 
                  display: 'grid', 
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                  gap: 1,
                  mb: 2
                }}>
                  <Typography 
                    variant="body2"
                    sx={{ fontSize: { xs: '0.9rem', md: '1rem' } }}
                  >
                    🔄 ラウンド: <strong>{gameSession.currentRound}</strong>
                  </Typography>
                  <Typography 
                    variant="body2"
                    sx={{ fontSize: { xs: '0.9rem', md: '1rem' } }}
                  >
                    📋 フェーズ: <strong>{gameSession.currentPhase}</strong>
                  </Typography>
                </Box>
                
                <Box sx={{ 
                  p: { xs: 1, md: 1.5 },
                  backgroundColor: 'primary.light',
                  borderRadius: 1,
                  mb: 2,
                  border: '2px solid',
                  borderColor: 'primary.main'
                }}>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      fontWeight: 'bold',
                      color: 'primary.contrastText',
                      textAlign: 'center',
                      fontSize: { xs: '0.9rem', md: '1rem' }
                    }}
                  >
                    👤 アクティブプレイヤー: {getCurrentPlayer()?.name}
                  </Typography>
                </Box>
                
                {/* 待機中プレイヤー表示 */}
                {getWaitingPlayers().length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography 
                      variant="body2" 
                      component="h4"
                      sx={{ 
                        fontWeight: 'bold',
                        mb: 1,
                        fontSize: { xs: '0.9rem', md: '1rem' }
                      }}
                    >
                      ⏳ アクション待ち:
                    </Typography>
                    <Box sx={{ pl: 1 }}>
                      {getWaitingPlayers().map(player => (
                        <Typography 
                          key={player.id} 
                          variant="body2" 
                          sx={{ 
                            fontSize: { xs: '0.8rem', md: '0.9rem' },
                            color: 'text.secondary'
                          }}
                        >
                          • {player.name}
                        </Typography>
                      ))}
                    </Box>
                  </Box>
                )}

                {/* フェーズ進行ボタン */}
                <Box sx={{ 
                  display: 'flex', 
                  gap: 1, 
                  flexWrap: 'wrap',
                  justifyContent: { xs: 'center', sm: 'flex-start' }
                }}>
                  <Button 
                    variant="outlined" 
                    size="small"
                    onClick={nextTurn}
                    disabled={!isPlayerTurn(getCurrentPlayer()?.id || '')}
                    sx={{
                      transition: 'all 0.2s ease-in-out',
                      '&:hover:not(:disabled)': {
                        transform: 'translateY(-1px)'
                      }
                    }}
                    aria-label="次のターンに進む"
                  >
                    次のターン
                  </Button>
                  <Button 
                    variant="contained" 
                    size="small"
                    onClick={nextPhase}
                    disabled={!areAllPlayersReady()}
                    sx={{
                      transition: 'all 0.2s ease-in-out',
                      '&:hover:not(:disabled)': {
                        transform: 'translateY(-1px)',
                        boxShadow: 4
                      }
                    }}
                    aria-label="次のフェーズに進む"
                  >
                    次のフェーズ
                  </Button>
                  <Button 
                    variant="outlined" 
                    size="small"
                    color="warning"
                    onClick={() => {
                      const errors = validateGameState();
                      if (errors.length > 0) {
                        console.log('ゲーム状態エラー:', errors);
                        repairGameStateIfNeeded();
                      } else {
                        console.log('ゲーム状態は正常です');
                      }
                    }}
                    sx={{
                      transition: 'all 0.2s ease-in-out',
                      '&:hover': {
                        transform: 'translateY(-1px)'
                      }
                    }}
                    aria-label="ゲーム状態をチェックする"
                  >
                    状態チェック
                  </Button>
                </Box>

                {/* 全プレイヤー準備完了表示 */}
                {areAllPlayersReady() && (
                  <Box 
                    sx={{ 
                      mt: 2,
                      p: 1,
                      backgroundColor: 'success.light',
                      borderRadius: 1,
                      textAlign: 'center'
                    }}
                    className="animate-bounce"
                  >
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: 'success.contrastText',
                        fontWeight: 'bold',
                        fontSize: { xs: '0.9rem', md: '1rem' }
                      }}
                    >
                      ✅ 全プレイヤー準備完了！
                    </Typography>
                  </Box>
                )}
                </Box>
            </Box>
          </ResponsiveContainer>
        )}
      </Box>
    </Container>
  );
};

export default function OshiGame() {
  return (
    <ErrorBoundary>
      <GameProvider>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
          <GameContent />
          <PerformanceMonitor componentName="OshiGame" showDetails={true} />
          <AccessibilityTester autoCheck={true} />
        </div>
      </GameProvider>
    </ErrorBoundary>
  );
}
