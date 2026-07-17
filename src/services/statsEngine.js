const statsEngine = {
  calculateStats(matches, players, division = null) {
    const filteredMatches = division
      ? matches.filter(m => m.division === parseInt(division, 10))
      : matches;

    const sortedMatches = [...filteredMatches].sort((a, b) => new Date(a.playedAt) - new Date(b.playedAt));

    const stats = {};
    for (const player of players) {
      stats[player.id] = {
        id: player.id,
        name: player.name,
        totalWins: 0,
        totalLosses: 0,
        winRate: 0,
        placements: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
        currentStreak: 0,
        maxStreak: 0
      };
    }

    for (const match of sortedMatches) {
      for (const p of match.placements) {
        const pId = p.playerId;
        if (!stats[pId]) {
          stats[pId] = {
            id: pId,
            name: p.playerName,
            totalWins: 0,
            totalLosses: 0,
            winRate: 0,
            placements: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
            currentStreak: 0,
            maxStreak: 0
          };
        }

        const pStats = stats[pId];
        pStats.placements[p.place] = (pStats.placements[p.place] || 0) + 1;

        if (p.place === 1) {
          pStats.totalWins += 1;
          pStats.currentStreak += 1;
          if (pStats.currentStreak > pStats.maxStreak) {
            pStats.maxStreak = pStats.currentStreak;
          }
        } else {
          pStats.totalLosses += 1;
          pStats.currentStreak = 0;
        }
      }
    }

    return Object.values(stats).map(pStats => {
      const totalGames = pStats.totalWins + pStats.totalLosses;
      pStats.winRate = totalGames > 0 ? (pStats.totalWins / totalGames) : 0;
      return pStats;
    });
  }
};

module.exports = statsEngine;
