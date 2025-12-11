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
    isGameEnded
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
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Typography variant="h4" gutterBottom align="center">
          推し活ボードゲーム テストプレイ
        </Typography>
        <Typography sx={{ mb: 4 }} align="center">
          ゲームボードとコンポーネント表示のテスト
        </Typography>
        <Box textAlign="center">
          <Button 
            variant="contained" 
            color="primary" 
            size="large"
            onClick={handleStartGame}
          >
            ゲーム開始
          </Button>
        </Box>
      </Container>
    );
  }

  // ゲーム終了画面
  if (isGameEnded()) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <GameResults onNewGame={handleNewGame} />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h5" gutterBottom align="center">
        推し活ボードゲーム - ゲーム中
      </Typography>
      
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
        <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
          {/* ゲームボード */}
          <Box sx={{ flex: 2, display: 'flex', justifyContent: 'center' }}>
            <HanamichiBoard
              board={gameSession.gameState.hanamichiBoardState}
              onSpotClick={handleSpotClick}
              onPieceDrop={handlePieceDrop}
            />
          </Box>

        {/* プレイヤー情報とオタクコマ */}
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" gutterBottom>
            プレイヤー情報
          </Typography>
          
          {gameSession.players.map((player) => {
            const isCurrentPlayer = isPlayerTurn(player.id);
            const hasCompletedAction = gameSession.turnManager.phaseActions[player.id];
            
            return (
              <Box key={player.id} sx={{ 
                mb: 3, 
                p: 2, 
                border: isCurrentPlayer ? '2px solid' : '1px solid #ccc',
                borderColor: isCurrentPlayer ? 'primary.main' : '#ccc',
                borderRadius: 1,
                backgroundColor: hasCompletedAction ? '#e8f5e8' : 'transparent'
              }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                    {player.name}
                    {isCurrentPlayer && <span style={{ color: 'blue' }}> (現在のターン)</span>}
                  </Typography>
                  
                  <Button
                    variant={hasCompletedAction ? "outlined" : "contained"}
                    size="small"
                    color={hasCompletedAction ? "success" : "primary"}
                    onClick={() => setPlayerActionCompleted(player.id, !hasCompletedAction)}
                  >
                    {hasCompletedAction ? "完了済み" : "アクション完了"}
                  </Button>
                </Box>
                
                <Typography variant="body2" sx={{ mb: 1 }}>
                  資金: {player.money}金 | ポイント: {player.points}
                </Typography>
                
                <Typography variant="body2" sx={{ mb: 1 }}>
                  オタクコマ:
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {player.otakuPieces
                    .filter(piece => !piece.boardSpotId) // ボードに配置されていないコマのみ表示
                    .map((piece) => (
                      <OtakuPieceComponent
                        key={piece.id}
                        piece={piece}
                        size="medium"
                        draggable={true}
                      />
                    ))}
                </Box>
              </Box>
            );
          })}

          {/* ゲーム状態表示 */}
          <Box sx={{ mt: 3, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
              ゲーム状態
            </Typography>
            <Typography variant="body2">
              ラウンド: {gameSession.currentRound}
            </Typography>
            <Typography variant="body2">
              フェーズ: {gameSession.currentPhase}
            </Typography>
            <Typography variant="body2" sx={{ 
              fontWeight: 'bold', 
              color: 'primary.main',
              backgroundColor: 'primary.light',
              p: 1,
              borderRadius: 1,
              mt: 1
            }}>
              アクティブプレイヤー: {getCurrentPlayer()?.name}
            </Typography>
            
            {/* 待機中プレイヤー表示 */}
            {getWaitingPlayers().length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                  アクション待ち:
                </Typography>
                {getWaitingPlayers().map(player => (
                  <Typography key={player.id} variant="body2" sx={{ ml: 1 }}>
                    • {player.name}
                  </Typography>
                ))}
              </Box>
            )}

            {/* フェーズ進行ボタン */}
            <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
              <Button 
                variant="outlined" 
                size="small"
                onClick={nextTurn}
                disabled={!isPlayerTurn(getCurrentPlayer()?.id || '')}
              >
                次のターン
              </Button>
              <Button 
                variant="contained" 
                size="small"
                onClick={nextPhase}
                disabled={!areAllPlayersReady()}
              >
                次のフェーズ
              </Button>
            </Box>

            {/* 全プレイヤー準備完了表示 */}
            {areAllPlayersReady() && (
              <Typography variant="body2" sx={{ 
                mt: 1, 
                color: 'success.main',
                fontWeight: 'bold'
              }}>
                全プレイヤー準備完了！
              </Typography>
            )}
          </Box>
        </Box>
      )}
    </Container>
  );
};

export default function OshiGame() {
  return (
    <GameProvider>
      <GameContent />
    </GameProvider>
  );
}
