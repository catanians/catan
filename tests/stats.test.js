const statsEngine = require('../src/services/statsEngine');

describe('Stats Engine', () => {
  const players = [
    { id: 'p1', name: 'Alice' },
    { id: 'p2', name: 'Bob' },
    { id: 'p3', name: 'Charlie' },
    { id: 'p4', name: 'David' }
  ];

  const matches = [
    {
      division: 4,
      playedAt: '2026-07-17T12:00:00Z',
      placements: [
        { playerId: 'p1', playerName: 'Alice', place: 1, victoryPoints: 10 },
        { playerId: 'p2', playerName: 'Bob', place: 2, victoryPoints: 8 },
        { playerId: 'p3', playerName: 'Charlie', place: 3, victoryPoints: 7 },
        { playerId: 'p4', playerName: 'David', place: 4, victoryPoints: 6 }
      ]
    },
    {
      division: 4,
      playedAt: '2026-07-17T13:00:00Z',
      placements: [
        { playerId: 'p1', playerName: 'Alice', place: 1, victoryPoints: 10 },
        { playerId: 'p2', playerName: 'Bob', place: 3, victoryPoints: 7 },
        { playerId: 'p3', playerName: 'Charlie', place: 2, victoryPoints: 8 },
        { playerId: 'p4', playerName: 'David', place: 4, victoryPoints: 5 }
      ]
    },
    {
      division: 4,
      playedAt: '2026-07-17T14:00:00Z',
      placements: [
        { playerId: 'p2', playerName: 'Bob', place: 1, victoryPoints: 10 },
        { playerId: 'p1', playerName: 'Alice', place: 2, victoryPoints: 8 },
        { playerId: 'p3', playerName: 'Charlie', place: 3, victoryPoints: 6 },
        { playerId: 'p4', playerName: 'David', place: 4, victoryPoints: 5 }
      ]
    }
  ];

  test('should compute correct global statistics', () => {
    const stats = statsEngine.calculateStats(matches, players);

    const alice = stats.find(s => s.id === 'p1');
    expect(alice.totalWins).toBe(2);
    expect(alice.totalLosses).toBe(1);
    expect(alice.winRate).toBeCloseTo(0.6666, 3);
    expect(alice.maxStreak).toBe(2);
    expect(alice.placements[1]).toBe(2);
    expect(alice.placements[2]).toBe(1);

    const bob = stats.find(s => s.id === 'p2');
    expect(bob.totalWins).toBe(1);
    expect(bob.totalLosses).toBe(2);
    expect(bob.maxStreak).toBe(1);
  });
});
