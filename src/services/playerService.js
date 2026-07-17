const db = require('../db');
const { v4: uuidv4 } = require('uuid');

const playerService = {
  async createPlayer(name) {
    if (!name || name.trim() === '') {
      throw new Error('Player name is required');
    }
    const trimmedName = name.trim();

    // Check duplicate name
    const players = await this.getPlayers();
    const duplicate = players.some(p => p.name.toLowerCase() === trimmedName.toLowerCase());
    if (duplicate) {
      throw new Error(`Player with name ${trimmedName} already exists`);
    }

    const player = {
      id: `player_${uuidv4()}`,
      partitionKey: 'PLAYER',
      type: 'player',
      name: trimmedName,
      createdAt: new Date().toISOString()
    };

    await db.createItem(player);
    return player;
  },

  async getPlayers() {
    return await db.queryItems({
      query: "SELECT * FROM c WHERE c.partitionKey = 'PLAYER' AND c.type = 'player'"
    });
  }
};

module.exports = playerService;
