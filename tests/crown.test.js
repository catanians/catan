const db = require('../src/db');
const matchService = require('../src/services/matchService');
const path = require('path');
const fs = require('fs');

describe('Crown and Match Service', () => {
  beforeEach(async () => {
    process.env.DB_MOCK = 'true';
    await db.init();
  });

  afterEach(() => {
    const mockPath = path.join(__dirname, '../data/db.json');
    if (fs.existsSync(mockPath)) {
      fs.unlinkSync(mockPath);
    }
  });

  test('should handle crown lineage and matches correctly', async () => {
    // 1. First Match in Division 4. Winner: Alice. Crown goes to Alice.
    const match1Placements = [
      { playerId: 'p_alice', playerName: 'Alice', place: 1, victoryPoints: 10 },
      { playerId: 'p_bob', playerName: 'Bob', place: 2, victoryPoints: 8 },
      { playerId: 'p_charlie', playerName: 'Charlie', place: 3, victoryPoints: 7 },
      { playerId: 'p_david', playerName: 'David', place: 4, victoryPoints: 5 }
    ];
    const m1 = await matchService.createMatch(4, match1Placements);
    expect(m1.crownChallenged).toBe(true);
    expect(m1.crownDefended).toBe(false); // First setting is not a defense
    expect(m1.crownHolderBefore).toBeNull();
    expect(m1.crownHolderAfter).toBe('p_alice');

    // Check current crown state
    let crown4 = await db.readItem('crown_division_4', 'CROWN');
    expect(crown4.currentHolderId).toBe('p_alice');
    expect(crown4.defensesCount).toBe(0);

    // 2. Alice plays in next game, and wins. Crown is defended!
    const match2Placements = [
      { playerId: 'p_alice', playerName: 'Alice', place: 1, victoryPoints: 10 },
      { playerId: 'p_bob', playerName: 'Bob', place: 2, victoryPoints: 9 },
      { playerId: 'p_charlie', playerName: 'Charlie', place: 3, victoryPoints: 6 },
      { playerId: 'p_david', playerName: 'David', place: 4, victoryPoints: 5 }
    ];
    const m2 = await matchService.createMatch(4, match2Placements);
    expect(m2.crownChallenged).toBe(true);
    expect(m2.crownDefended).toBe(true);
    expect(m2.crownHolderAfter).toBe('p_alice');

    crown4 = await db.readItem('crown_division_4', 'CROWN');
    expect(crown4.defensesCount).toBe(1);

    // 3. Match without Alice. Crown is not challenged.
    const match3Placements = [
      { playerId: 'p_bob', playerName: 'Bob', place: 1, victoryPoints: 10 },
      { playerId: 'p_charlie', playerName: 'Charlie', place: 2, victoryPoints: 8 },
      { playerId: 'p_david', playerName: 'David', place: 3, victoryPoints: 6 },
      { playerId: 'p_eve', playerName: 'Eve', place: 4, victoryPoints: 5 }
    ];
    const m3 = await matchService.createMatch(4, match3Placements);
    expect(m3.crownChallenged).toBe(false);
    expect(m3.crownHolderAfter).toBe('p_alice');

    // 4. Alice plays and Bob wins. Bob takes the crown.
    const match4Placements = [
      { playerId: 'p_bob', playerName: 'Bob', place: 1, victoryPoints: 10 },
      { playerId: 'p_alice', playerName: 'Alice', place: 2, victoryPoints: 9 },
      { playerId: 'p_charlie', playerName: 'Charlie', place: 3, victoryPoints: 7 },
      { playerId: 'p_david', playerName: 'David', place: 4, victoryPoints: 4 }
    ];
    const m4 = await matchService.createMatch(4, match4Placements);
    expect(m4.crownChallenged).toBe(true);
    expect(m4.crownDefended).toBe(false);
    expect(m4.crownHolderAfter).toBe('p_bob');

    crown4 = await db.readItem('crown_division_4', 'CROWN');
    expect(crown4.currentHolderId).toBe('p_bob');
    expect(crown4.defensesCount).toBe(0);
  });
});
