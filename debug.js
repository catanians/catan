const db = require('./src/db');
require('dotenv').config();

(async () => {
  await db.init();
  const players = await db.queryItems({
    query: "SELECT * FROM c WHERE c.partitionKey = 'PLAYER' AND c.type = 'player'"
  });
  
  const matiasPlayers = players.filter(p => p.name.toLowerCase() === 'matias');
  console.log(JSON.stringify(matiasPlayers, null, 2));
})();

