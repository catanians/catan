const db = require('../src/db');
const playerService = require('../src/services/playerService');
const path = require('path');
const fs = require('fs');

describe('Player Service', () => {
  beforeAll(async () => {
    process.env.DB_MOCK = 'true';
    await db.init();
  });

  afterAll(() => {
    const mockPath = path.join(__dirname, '../data/db.json');
    if (fs.existsSync(mockPath)) {
      fs.unlinkSync(mockPath);
    }
  });

  test('should create players and list them', async () => {
    const player1 = await playerService.createPlayer('Alice');
    expect(player1.name).toBe('Alice');
    expect(player1.partitionKey).toBe('PLAYER');
    expect(player1.type).toBe('player');
    expect(player1.id).toBeDefined();

    const players = await playerService.getPlayers();
    expect(players.length).toBe(1);
    expect(players[0].name).toBe('Alice');
  });

  test('should reject creation of duplicate player names', async () => {
    await expect(playerService.createPlayer('Alice')).rejects.toThrow('Player with name Alice already exists');
  });
});
