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
        tilePreference: player.tilePreference || null,
        totalWins: 0,
        totalLosses: 0,
        winRate: 0,
        placements: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
        currentStreak: 0,
        maxStreak: 0,
        gamesWithStatsCount: 0,
        totalVps: 0,
        totalMiscPoints: 0,
        totalMetropolises: 0,
        totalCities: 0,
        totalSettlements: 0,
        totalLongestRoads: 0
      };
    }

    for (const match of sortedMatches) {
      for (const p of match.placements) {
        const pId = p.playerId;
        if (!stats[pId]) {
          stats[pId] = {
            id: pId,
            name: p.playerName,
            tilePreference: null,
            totalWins: 0,
            totalLosses: 0,
            winRate: 0,
            placements: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
            currentStreak: 0,
            maxStreak: 0,
            gamesWithStatsCount: 0,
            totalVps: 0,
            totalMiscPoints: 0,
            totalMetropolises: 0,
            totalCities: 0,
            totalSettlements: 0,
            totalLongestRoads: 0
          };
        }

        const pStats = stats[pId];
        
        if (!match.isSimpleMatch || p.place === 1) {
          pStats.placements[p.place] = (pStats.placements[p.place] || 0) + 1;
        }

        const hasDetails = p.settlements !== null && p.settlements !== undefined;
        if (hasDetails) {
          pStats.gamesWithStatsCount += 1;
          const vp = (p.victoryPoints !== null && p.victoryPoints !== undefined) ? (parseInt(p.victoryPoints, 10) || 0) : 0;
          const settlements = parseInt(p.settlements, 10) || 0;
          const cities = parseInt(p.cities, 10) || 0;
          const metropolises = typeof p.metropolis === 'boolean' ? (p.metropolis ? 1 : 0) : (parseInt(p.metropolis, 10) || 0);
          const longestRoad = p.longestRoad ? 1 : 0;

          const miscPoints = vp - (settlements + (2 * cities) + (2 * metropolises) + (2 * longestRoad));

          pStats.totalVps += vp;
          pStats.totalMiscPoints += miscPoints;
          pStats.totalMetropolises += metropolises;
          pStats.totalCities += cities;
          pStats.totalSettlements += settlements;
          pStats.totalLongestRoads += longestRoad;
        }

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
      
      const count = pStats.gamesWithStatsCount;
      pStats.avgVps = count > 0 ? (pStats.totalVps / count).toFixed(1) : '-';
      pStats.avgMiscPoints = count > 0 ? (pStats.totalMiscPoints / count).toFixed(1) : '-';
      pStats.avgSettlements = count > 0 ? (pStats.totalSettlements / count).toFixed(1) : '-';
      pStats.avgCities = count > 0 ? (pStats.totalCities / count).toFixed(1) : '-';
      pStats.avgMetropolises = count > 0 ? (pStats.totalMetropolises / count).toFixed(1) : '-';
      pStats.longestRoadRate = count > 0 ? Math.round((pStats.totalLongestRoads / count) * 100) + '%' : '-';
      
      return pStats;
    });
  }
};

module.exports = statsEngine;
