const fs = require('fs');
const path = require('path');
const { CosmosClient } = require('@azure/cosmos');
const config = require('./config');

let container = null;
const mockFilePath = path.join(__dirname, '../data/db.json');
let mockDbData = [];

function loadMockData() {
  if (process.env.NODE_ENV === 'test') {
    mockDbData = [];
    return;
  }
  if (!fs.existsSync(path.dirname(mockFilePath))) {
    fs.mkdirSync(path.dirname(mockFilePath), { recursive: true });
  }
  if (fs.existsSync(mockFilePath)) {
    try {
      const fileContent = fs.readFileSync(mockFilePath, 'utf8');
      mockDbData = JSON.parse(fileContent);
    } catch (e) {
      mockDbData = [];
    }
  } else {
    mockDbData = [];
    fs.writeFileSync(mockFilePath, JSON.stringify(mockDbData, null, 2));
  }
}

function saveMockData() {
  if (process.env.NODE_ENV === 'test') return;
  fs.writeFileSync(mockFilePath, JSON.stringify(mockDbData, null, 2));
}

const db = {
  async init() {
    if (config.USE_MOCK) {
      loadMockData();
      return;
    }

    try {
      const client = new CosmosClient({
        endpoint: config.COSMOS_ENDPOINT,
        key: config.COSMOS_KEY
      });
      const { database } = await client.databases.createIfNotExists({ id: config.DATABASE_NAME });
      const { container: containerRef } = await database.containers.createIfNotExists({
        id: config.CONTAINER_NAME,
        partitionKey: '/partitionKey'
      });
      container = containerRef;
    } catch (err) {
      console.error('Cosmos DB init failed, falling back to mock JSON database.', err.message);
      config.USE_MOCK = true;
      loadMockData();
    }
  },

  async createItem(item) {
    if (config.USE_MOCK) {
      if (mockDbData.some(i => i.id === item.id && i.partitionKey === item.partitionKey)) {
        throw new Error('Conflict');
      }
      mockDbData.push(JSON.parse(JSON.stringify(item)));
      saveMockData();
      return { resource: item };
    }
    return await container.items.create(item);
  },

  async readItem(id, partitionKey) {
    if (config.USE_MOCK) {
      const item = mockDbData.find(i => i.id === id && i.partitionKey === partitionKey);
      return item ? JSON.parse(JSON.stringify(item)) : null;
    }
    try {
      const { resource } = await container.item(id, partitionKey).read();
      return resource || null;
    } catch (e) {
      if (e.statusCode === 404) return null;
      throw e;
    }
  },

  async upsertItem(item) {
    if (config.USE_MOCK) {
      const idx = mockDbData.findIndex(i => i.id === item.id && i.partitionKey === item.partitionKey);
      if (idx !== -1) {
        mockDbData[idx] = JSON.parse(JSON.stringify(item));
      } else {
        mockDbData.push(JSON.parse(JSON.stringify(item)));
      }
      saveMockData();
      return { resource: item };
    }
    return await container.items.upsert(item);
  },

  async queryItems(querySpec) {
    if (config.USE_MOCK) {
      let filtered = [...mockDbData];
      const params = querySpec.parameters || [];
      const queryStr = querySpec.query || '';

      // Parse partitionKey from query string or parameters
      let pkValue = null;
      const pkMatch = queryStr.match(/c\.partitionKey\s*=\s*'([^']+)'/i);
      if (pkMatch) {
        pkValue = pkMatch[1];
      } else {
        const pkParam = params.find(p => p.name === '@pk');
        if (pkParam) pkValue = pkParam.value;
      }

      // Parse type from query string or parameters
      let typeValue = null;
      const typeMatch = queryStr.match(/c\.type\s*=\s*'([^']+)'/i);
      if (typeMatch) {
        typeValue = typeMatch[1];
      } else {
        const typeParam = params.find(p => p.name === '@type');
        if (typeParam) typeValue = typeParam.value;
      }

      // Filter by partitionKey
      if (pkValue) {
        filtered = filtered.filter(i => i.partitionKey === pkValue);
      }

      // Filter by type
      if (typeValue) {
        filtered = filtered.filter(i => i.type === typeValue);
      }

      // Filter by division
      let divisionValue = null;
      const divMatch = queryStr.match(/c\.division\s*=\s*(\d+)/i);
      if (divMatch) {
        divisionValue = parseInt(divMatch[1], 10);
      } else {
        const divParam = params.find(p => p.name === '@division');
        if (divParam) divisionValue = divParam.value;
      }
      if (divisionValue !== null && divisionValue !== undefined) {
        filtered = filtered.filter(i => i.division === divisionValue);
      }

      // Filter by playerId
      let playerIdValue = null;
      const playerMatch = queryStr.match(/c\.playerId\s*=\s*'([^']+)'/i);
      if (playerMatch) {
        playerIdValue = playerMatch[1];
      } else {
        const playerParam = params.find(p => p.name === '@playerId');
        if (playerParam) playerIdValue = playerParam.value;
      }
      if (playerIdValue !== null && playerIdValue !== undefined) {
        filtered = filtered.filter(i => i.playerId === playerIdValue);
      }

      return filtered;
    }
    const { resources } = await container.items.query(querySpec).fetchAll();
    return resources;
  },

  async deleteItem(id, partitionKey) {
    if (config.USE_MOCK) {
      const idx = mockDbData.findIndex(i => i.id === id && i.partitionKey === partitionKey);
      if (idx !== -1) {
        mockDbData.splice(idx, 1);
        saveMockData();
      }
      return;
    }
    try {
      await container.item(id, partitionKey).delete();
    } catch (e) {
      if (e.statusCode !== 404) throw e;
    }
  }
};

module.exports = db;
