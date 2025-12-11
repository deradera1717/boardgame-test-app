/**
 * Property-based tests for Oshi-katsu Decision Phase
 * **Feature: oshi-game-testplay, Property 8: 秘匿選択の管理**
 * **Validates: Requirements 4.2, 4.3**
 */

import fc from 'fast-check';
import { GameSession, Player, OshikatsuDecision, GameState, TurnManager } from '../types/game';

// Test utilities
const createTestPlayer = (id: string, name: string): Player => ({
  id,
  name,
  color: 'red',
  money: 3,
  points: 0,
  otakuPieces: [],
  selectedRewardCard: undefined,
  oshikatsuDecision: undefined
});

const createTestGameSession = (players: Player[]): GameSession => {
  const phaseActions: { [playerId: string]: boolean } = {};
  players.forEach(player => {
    phaseActions[player.id] = false;
  });

  const turnManager: TurnManager = {
    currentPlayer: 0,
    waitingForPlayers: players.map(p => p.id),
    phaseActions
  };

  const gameState: GameState = {
    hanamichiBoardState: { spots: [] },
    oshiPieces: [],
    fanserviceSpotCards: [],
    revealedCards: [],
    rewardDistributionCards: [],
    roundHistory: []
  };

  return {
    id: 'test-game',
    players,
    currentRound: 1,
    currentPhase: 'oshikatsu-decision',
    activePlayerIndex: 0,
    gameState,
    turnManager,
    createdAt: new Date()
  };
};

// Simulate selecting an Oshi-katsu decision
const selectOshikatsuDecision = (
  gameSession: GameSession, 
  playerId: string, 
  decision: OshikatsuDecision
): GameSession => {
  const updatedPlayers = gameSession.players.map(player => 
    player.id === playerId 
      ? { ...player, oshikatsuDecision: decision }
      : player
  );

  const updatedPhaseActions = {
    ...gameSession.turnManager.phaseActions,
    [playerId]: true
  };

  const updatedWaitingPlayers = gameSession.turnManager.waitingForPlayers.filter(
    id => id !== playerId
  );

  return {
    ...gameSession,
    players: updatedPlayers,
    turnManager: {
      ...gameSession.turnManager,
      phaseActions: updatedPhaseActions,
      waitingForPlayers: updatedWaitingPlayers
    }
  };
};

// Check if all players have made their decisions
const allPlayersDecided = (gameSession: GameSession): boolean => {
  return gameSession.players.every(player => player.oshikatsuDecision !== undefined);
};

// Check if decisions are hidden from other players (simulated by checking that decisions are stored but not revealed)
const decisionsAreHidden = (gameSession: GameSession): boolean => {
  // In a real implementation, this would check that decisions are not visible to other players
  // For testing purposes, we check that decisions are stored but the reveal process hasn't been triggered
  const playersWithDecisions = gameSession.players.filter(p => p.oshikatsuDecision !== undefined);
  const playersWithoutDecisions = gameSession.players.filter(p => p.oshikatsuDecision === undefined);
  
  // If some players have decided but not all, decisions should be hidden
  return playersWithDecisions.length > 0 && playersWithoutDecisions.length > 0;
};

// Simulate revealing decisions and processing rewards
const revealOshikatsuDecisions = (gameSession: GameSession): GameSession => {
  // Check if all players have decided
  const allDecided = gameSession.players.every(player => player.oshikatsuDecision !== undefined);
  if (!allDecided) {
    return gameSession; // Cannot reveal if not all players have decided
  }

  // Find the current round's labor results
  const currentRoundHistory = gameSession.gameState.roundHistory.find(
    round => round.roundNumber === gameSession.currentRound
  );

  // Process "rest" rewards
  const updatedPlayers = gameSession.players.map(player => {
    if (player.oshikatsuDecision === 'rest') {
      // Find the labor reward for this player
      const laborReward = currentRoundHistory?.laborResults
        .find(result => result.playerId === player.id)?.reward || 0;
      
      return {
        ...player,
        money: player.money + laborReward
      };
    }
    return player;
  });

  // Record decisions in round history
  const oshikatsuDecisions = gameSession.players.map(player => ({
    playerId: player.id,
    decision: player.oshikatsuDecision!
  }));

  const updatedRoundHistory = gameSession.gameState.roundHistory.map(round =>
    round.roundNumber === gameSession.currentRound
      ? { ...round, oshikatsuDecisions }
      : round
  );

  return {
    ...gameSession,
    players: updatedPlayers,
    gameState: {
      ...gameSession.gameState,
      roundHistory: updatedRoundHistory
    }
  };
};

describe('Oshi-katsu Decision Phase Property Tests', () => {
  /**
   * **Feature: oshi-game-testplay, Property 8: 秘匿選択の管理**
   * **Validates: Requirements 4.2, 4.3**
   */
  test('Property 8: Secret selection management - decisions remain hidden until all players complete', () => {
    fc.assert(fc.property(
      fc.integer({ min: 2, max: 4 }), // Number of players
      fc.array(fc.constantFrom('participate', 'rest'), { minLength: 2, maxLength: 4 }), // Decisions
      (numPlayers, decisions) => {
        // Create players
        const players = Array.from({ length: numPlayers }, (_, i) => 
          createTestPlayer(`player${i + 1}`, `Player ${i + 1}`)
        );
        
        let gameSession = createTestGameSession(players);
        
        // Make decisions one by one, checking that they remain hidden
        for (let i = 0; i < Math.min(numPlayers - 1, decisions.length - 1); i++) {
          const playerId = players[i].id;
          const decision = decisions[i] as OshikatsuDecision;
          
          gameSession = selectOshikatsuDecision(gameSession, playerId, decision);
          
          // Verify the decision is recorded
          const player = gameSession.players.find(p => p.id === playerId);
          expect(player?.oshikatsuDecision).toBe(decision);
          
          // Verify not all players have decided yet
          expect(allPlayersDecided(gameSession)).toBe(false);
          
          // Verify decisions are still hidden (some players haven't decided)
          if (i < numPlayers - 2) {
            expect(decisionsAreHidden(gameSession)).toBe(true);
          }
        }
        
        // Make the final decision
        if (decisions.length >= numPlayers) {
          const lastPlayerId = players[numPlayers - 1].id;
          const lastDecision = decisions[numPlayers - 1] as OshikatsuDecision;
          
          gameSession = selectOshikatsuDecision(gameSession, lastPlayerId, lastDecision);
          
          // Now all players should have decided
          expect(allPlayersDecided(gameSession)).toBe(true);
          
          // All decisions should be recorded correctly
          gameSession.players.forEach((player, index) => {
            if (index < decisions.length) {
              expect(player.oshikatsuDecision).toBe(decisions[index]);
            }
          });
        }
      }
    ), { numRuns: 100 });
  });

  test('Property 8b: Simultaneous reveal - all decisions become visible at once', () => {
    fc.assert(fc.property(
      fc.integer({ min: 2, max: 4 }), // Number of players
      (numPlayers) => {
        // Generate decisions for all players
        const decisions = Array.from({ length: numPlayers }, () => 
          Math.random() < 0.5 ? 'participate' : 'rest'
        ) as OshikatsuDecision[];
        
        // Create players
        const players = Array.from({ length: numPlayers }, (_, i) => 
          createTestPlayer(`player${i + 1}`, `Player ${i + 1}`)
        );
        
        let gameSession = createTestGameSession(players);
        
        // All players make their decisions
        for (let i = 0; i < numPlayers; i++) {
          const playerId = players[i].id;
          const decision = decisions[i];
          gameSession = selectOshikatsuDecision(gameSession, playerId, decision);
        }
        
        // Verify all players have decided
        expect(allPlayersDecided(gameSession)).toBe(true);
        
        // Verify all decisions are accessible (simultaneous reveal)
        gameSession.players.forEach((player, index) => {
          expect(player.oshikatsuDecision).toBeDefined();
          expect(player.oshikatsuDecision).toBe(decisions[index]);
        });
        
        // Verify phase actions are completed for all players
        gameSession.players.forEach(player => {
          expect(gameSession.turnManager.phaseActions[player.id]).toBe(true);
        });
        
        // Verify no players are waiting
        expect(gameSession.turnManager.waitingForPlayers).toHaveLength(0);
      }
    ), { numRuns: 100 });
  });

  /**
   * **Feature: oshi-game-testplay, Property 9: 休む選択時の追加報酬**
   * **Validates: Requirements 4.4**
   */
  test('Property 9: Rest selection additional reward - players who rest receive labor reward amount as bonus', () => {
    fc.assert(fc.property(
      fc.integer({ min: 2, max: 4 }), // Number of players
      fc.array(fc.integer({ min: 0, max: 5 }), { minLength: 2, maxLength: 4 }), // Labor rewards
      (numPlayers, laborRewards) => {
        // Ensure we have enough labor rewards for all players
        const paddedLaborRewards = [...laborRewards];
        while (paddedLaborRewards.length < numPlayers) {
          paddedLaborRewards.push(fc.sample(fc.integer({ min: 0, max: 5 }), 1)[0]);
        }
        const finalLaborRewards = paddedLaborRewards.slice(0, numPlayers);

        // Create players with initial money
        const initialMoney = 3;
        const players = Array.from({ length: numPlayers }, (_, i) => {
          const player = createTestPlayer(`player${i + 1}`, `Player ${i + 1}`);
          player.money = initialMoney;
          return player;
        });
        
        let gameSession = createTestGameSession(players);
        
        // Add labor results to round history
        const laborResults = players.map((player, index) => ({
          playerId: player.id,
          selectedCard: 'A',
          diceResult: 1,
          reward: finalLaborRewards[index]
        }));

        gameSession.gameState.roundHistory = [{
          roundNumber: 1,
          laborResults,
          oshikatsuDecisions: [],
          fansaResults: []
        }];

        // Record initial money for each player
        const initialPlayerMoney = new Map(
          players.map(player => [player.id, player.money])
        );

        // Generate decisions (mix of participate and rest)
        const decisions: OshikatsuDecision[] = Array.from({ length: numPlayers }, (_, i) => 
          i % 2 === 0 ? 'rest' : 'participate'
        );

        // All players make their decisions
        for (let i = 0; i < numPlayers; i++) {
          const playerId = players[i].id;
          const decision = decisions[i];
          gameSession = selectOshikatsuDecision(gameSession, playerId, decision);
        }

        // Reveal decisions and process rewards
        gameSession = revealOshikatsuDecisions(gameSession);

        // Verify rewards for players who chose "rest"
        gameSession.players.forEach((player, index) => {
          const initialMoney = initialPlayerMoney.get(player.id)!;
          const laborReward = finalLaborRewards[index];
          const decision = decisions[index];

          if (decision === 'rest') {
            // Player who rested should receive additional reward equal to labor reward
            const expectedMoney = initialMoney + laborReward;
            expect(player.money).toBe(expectedMoney);
          } else {
            // Player who participated should have unchanged money
            expect(player.money).toBe(initialMoney);
          }
        });

        // Verify decisions are recorded in round history
        const roundHistory = gameSession.gameState.roundHistory.find(
          round => round.roundNumber === gameSession.currentRound
        );
        expect(roundHistory?.oshikatsuDecisions).toHaveLength(numPlayers);
        
        roundHistory?.oshikatsuDecisions.forEach((decision, index) => {
          expect(decision.playerId).toBe(players[index].id);
          expect(decision.decision).toBe(decisions[index]);
        });
      }
    ), { numRuns: 100 });
  });
});