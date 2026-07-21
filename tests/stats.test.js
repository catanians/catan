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

  test('should compute correct avgVps and avgMiscPoints excluding simple matches', () => {
    const testMatches = [
      {
        division: 4,
        isSimpleMatch: false,
        playedAt: '2026-07-17T12:00:00Z',
        placements: [
          { playerId: 'p1', playerName: 'Alice', place: 1, victoryPoints: 10, settlements: 2, cities: 2, metropolis: 0, longestRoad: true },
          { playerId: 'p2', playerName: 'Bob', place: 2, victoryPoints: 8, settlements: 2, cities: 2, metropolis: 0, longestRoad: false }
        ]
      },
      {
        division: 4,
        isSimpleMatch: false,
        playedAt: '2026-07-17T13:00:00Z',
        placements: [
          { playerId: 'p1', playerName: 'Alice', place: 1, victoryPoints: 10, settlements: 3, cities: 2, metropolis: 1, longestRoad: false },
          { playerId: 'p2', playerName: 'Bob', place: 2, victoryPoints: 7, settlements: 1, cities: 2, metropolis: 0, longestRoad: false }
        ]
      },
      {
        division: 4,
        isSimpleMatch: true,
        playedAt: '2026-07-17T14:00:00Z',
        placements: [
          { playerId: 'p1', playerName: 'Alice', place: 2, victoryPoints: 8, settlements: null, cities: null, metropolis: null, longestRoad: null },
          { playerId: 'p2', playerName: 'Bob', place: 1, victoryPoints: 10, settlements: null, cities: null, metropolis: null, longestRoad: null }
        ]
      }
    ];

    const stats = statsEngine.calculateStats(testMatches, players);
    const alice = stats.find(s => s.id === 'p1');
    const bob = stats.find(s => s.id === 'p2');

    // Alice:
    // Game 1: VP=10, Set=2, Cit=2, Metro=0, Road=true (2 VP) -> misc = 10 - (2 + 4 + 0 + 2) = 2
    // Game 2: VP=10, Set=3, Cit=2, Metro=1, Road=false (0 VP) -> misc = 10 - (3 + 4 + 2 + 0) = 1
    // Game 3: Simple match (ignored for detailed averages)
    // Avg VP = (10 + 10) / 2 = 10.0
    // Avg Misc = (2 + 1) / 2 = 1.5
    expect(alice.gamesWithStatsCount).toBe(2);
    expect(alice.avgVps).toBe('10.0');
    expect(alice.avgMiscPoints).toBe('1.5');

    // Bob:
    // Game 1: VP=8, Set=2, Cit=2, Metro=0, Road=false -> misc = 8 - (2 + 4 + 0 + 0) = 2
    // Game 2: VP=7, Set=1, Cit=2, Metro=0, Road=false -> misc = 7 - (1 + 4 + 0 + 0) = 2
    // Game 3: Simple match (ignored)
    // Avg VP = (8 + 7) / 2 = 7.5
    // Avg Misc = (2 + 2) / 2 = 2.0
    expect(bob.gamesWithStatsCount).toBe(2);
    expect(bob.avgVps).toBe('7.5');
    expect(bob.avgMiscPoints).toBe('2.0');
  });
});
