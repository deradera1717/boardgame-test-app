import { isGameComplete, calculateFinalResults, cleanupRoundEnd, getNextGameState } from '../utils/gameLogic';
import { Player, GamePhase } from '../types/game';

describe('Round Management', () => {
  const createTestPlayers = (): Player[] => [
    {
      id: 'player1',
      name: 'プレイヤー1',
      color: 'red',
      money: 5,
      points: 10,
      otakuPieces: [
        { id: 'p1-otaku1', playerId: 'player1', isKagebunshin: false, boardSpotId: 0, goods: 'uchiwa' },
        { id: 'p1-otaku2', playerId: 'player1', isKagebunshin: false },
        { id: 'p1-kage1', playerId: 'player1', isKagebunshin: true, goods: 'sashiire' }
      ]
    },
    {
      id: 'player2',
      name: 'プレイヤー2',
      color: 'blue',
      money: 3,
      points: 15,
      otakuPieces: [
        { id: 'p2-otaku1', playerId: 'player2', isKagebunshin: false, boardSpotId: 1, goods: 'penlight' },
        { id: 'p2-otaku2', playerId: 'player2', isKagebunshin: false }
      ]
    }
  ];

  describe('isGameComplete', () => {
    test('should return false for rounds 1-7', () => {
      for (let round = 1; round <= 7; round++) {
        expect(isGameComplete(round, 'labor')).toBe(false);
        expect(isGameComplete(round, 'fansa-time')).toBe(false);
        expect(isGameComplete(round, 'round-end')).toBe(false);
      }
    });

    test('should return true when round exceeds 8', () => {
      expect(isGameComplete(9, 'labor')).toBe(true);
    });

    test('should return true for round 8 at round-end phase', () => {
      expect(isGameComplete(8, 'round-end')).toBe(true);
    });

    test('should return false for round 8 before round-end', () => {
      expect(isGameComplete(8, 'labor')).toBe(false);
      expect(isGameComplete(8, 'fansa-time')).toBe(false);
    });
  });

  describe('calculateFinalResults', () => {
    test('should calculate final scores and determine winner', () => {
      const players = createTestPlayers();
      const results = calculateFinalResults(players);

      expect(results.finalScores).toHaveLength(2);
      expect(results.finalScores[0].totalPoints).toBe(15); // プレイヤー2が1位
      expect(results.finalScores[0].playerName).toBe('プレイヤー2');
      expect(results.finalScores[1].totalPoints).toBe(10); // プレイヤー1が2位

      expect(results.winners).toHaveLength(1);
      expect(results.winners[0].playerName).toBe('プレイヤー2');
      expect(results.winners[0].totalPoints).toBe(15);

      expect(results.gameStats.totalRounds).toBe(8);
      expect(results.gameStats.highestScore).toBe(15);
      expect(results.gameStats.averageScore).toBe(13); // (10 + 15) / 2 = 12.5 → 13 (Math.round)
    });

    test('should handle tied winners', () => {
      const players = createTestPlayers();
      players[0].points = 15; // 同点にする

      const results = calculateFinalResults(players);

      expect(results.winners).toHaveLength(2);
      expect(results.winners.every(w => w.totalPoints === 15)).toBe(true);
    });
  });

  describe('cleanupRoundEnd', () => {
    test('should remove pieces from board and clear temporary states', () => {
      const players = createTestPlayers();
      players[0].selectedRewardCard = {
        id: 'card-A',
        name: 'A',
        rewards: { 1: 3, 2: 2, 3: 1, 4: 0, 5: 0, 6: 0 }
      };
      players[0].oshikatsuDecision = 'participate';

      const cleanedPlayers = cleanupRoundEnd(players);

      // ボードからオタクコマが回収されている
      expect(cleanedPlayers[0].otakuPieces.every(piece => piece.boardSpotId === undefined)).toBe(true);
      expect(cleanedPlayers[1].otakuPieces.every(piece => piece.boardSpotId === undefined)).toBe(true);

      // 影分身が削除されている
      expect(cleanedPlayers[0].otakuPieces.some(piece => piece.isKagebunshin)).toBe(false);

      // 一時的な選択状態がクリアされている
      expect(cleanedPlayers[0].selectedRewardCard).toBeUndefined();
      expect(cleanedPlayers[0].oshikatsuDecision).toBeUndefined();
    });

    test('should preserve goods on otaku pieces', () => {
      const players = createTestPlayers();
      const cleanedPlayers = cleanupRoundEnd(players);

      // グッズは保持される
      const player1Piece = cleanedPlayers[0].otakuPieces.find(p => p.id === 'p1-otaku1');
      expect(player1Piece?.goods).toBe('uchiwa');

      const player2Piece = cleanedPlayers[1].otakuPieces.find(p => p.id === 'p2-otaku1');
      expect(player2Piece?.goods).toBe('penlight');
    });
  });

  describe('getNextGameState', () => {
    test('should advance to next round after round-end', () => {
      const result = getNextGameState(3, 'round-end');
      expect(result.nextRound).toBe(4);
      expect(result.nextPhase).toBe('labor');
    });

    test('should end game after round 8', () => {
      const result = getNextGameState(8, 'round-end');
      expect(result.nextRound).toBe(8);
      expect(result.nextPhase).toBe('game-end');
    });

    test('should stay in same round for normal phase transitions', () => {
      const result = getNextGameState(5, 'labor');
      expect(result.nextRound).toBe(5);
      expect(result.nextPhase).toBe('oshikatsu-decision');
    });

    test('should end game when exceeding 8 rounds', () => {
      const result = getNextGameState(9, 'labor');
      expect(result.nextRound).toBe(9);
      expect(result.nextPhase).toBe('game-end');
    });
  });
});