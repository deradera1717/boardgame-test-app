"use client";

import React, { useState } from "react";
import { Container, Typography, Button, Box } from "@mui/material";
import { GameProvider, useGame } from "../../contexts/GameContext";
import HanamichiBoard from "../../components/game/HanamichiBoard";
import OtakuPieceComponent from "../../components/game/OtakuPiece";
import { Player, OtakuPiece } from "../../types/game";

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
  const { gameSession, initializeGame, movePiece } = useGame();
  const [isGameStarted, setIsGameStarted] = useState(false);

  const handleStartGame = () => {
    const players = createTestPlayers();
    initializeGame(players);
    setIsGameStarted(true);
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

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h5" gutterBottom align="center">
        推し活ボードゲーム - ゲーム中
      </Typography>
      
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
          
          {gameSession.players.map((player) => (
            <Box key={player.id} sx={{ mb: 3, p: 2, border: '1px solid #ccc', borderRadius: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                {player.name}
              </Typography>
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
          ))}

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
            <Typography variant="body2">
              アクティブプレイヤー: {gameSession.players[gameSession.activePlayerIndex]?.name}
            </Typography>
          </Box>
        </Box>
      </Box>
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
