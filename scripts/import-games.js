/**
 * Bulk Import Script for Historical Catan Matches
 * 
 * HOW TO USE:
 * 1. Fill in the GAMES array below with your past matches
 * 2. Make sure your local server is running (npm start)
 * 3. Run: node scripts/import-games.js
 * 
 * FORMAT:
 *   { date: 'YYYY-MM-DD', placements: ['1st', '2nd', '3rd', '4th', ...] }
 *   - placements array length determines division (4, 5, or 6 players)
 *   - 1st player in the array = winner, last = last place
 */

const GAMES = [
  // ---- EXAMPLE GAMES (replace with your real data) ----

  // { date: '2025-01-15', placements: ['Ian', 'Adarsh', 'Taylor', 'Jonah'] },
  // { date: '2025-01-22', placements: ['Adarsh', 'Ian', 'Amaan', 'Taylor', 'Jonah'] },
  // { date: '2025-02-01', placements: ['Taylor', 'Jonah', 'Ian', 'Adarsh'] },

  // ---- ADD YOUR GAMES BELOW ----

];

// ---- SCRIPT (do not edit below) ----

const SERVER = 'http://localhost:3000';

async function importGames() {
  if (GAMES.length === 0) {
    console.log('No games to import. Fill in the GAMES array first!');
    return;
  }

  // Sort by date so crown logic processes in chronological order
  GAMES.sort((a, b) => new Date(a.date) - new Date(b.date));

  console.log(`Importing ${GAMES.length} games...\n`);

  for (let i = 0; i < GAMES.length; i++) {
    const game = GAMES[i];
    const division = game.placements.length;
    const playedAt = new Date(game.date + 'T12:00:00Z').toISOString();

    try {
      const res = await fetch(`${SERVER}/api/matches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ division, placements: game.placements, playedAt })
      });

      if (!res.ok) {
        const err = await res.json();
        console.log(`  [FAIL] Game ${i + 1} (${game.date}): ${err.error}`);
      } else {
        const match = await res.json();
        console.log(`  [OK]   Game ${i + 1} (${game.date}): ${game.placements[0]} won (${division}p)`);
      }
    } catch (err) {
      console.log(`  [ERR]  Game ${i + 1} (${game.date}): ${err.message}`);
    }
  }

  console.log('\nDone!');
}

importGames();
