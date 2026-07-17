const express = require('express');
const router = express.Router();
const matchService = require('../services/matchService');
const playerService = require('../services/playerService');
const statsEngine = require('../services/statsEngine');
const crownService = require('../services/crownService');

async function getAggregatedStats(division = null) {
  const [matches, players, currentCrowns, reigns] = await Promise.all([
    matchService.getMatches(),
    playerService.getPlayers(),
    crownService.getCurrentCrowns(),
    crownService.getReigns()
  ]);

  const playerStats = statsEngine.calculateStats(matches, players, division);
  
  // Sort playerStats: wins desc, winRate desc
  playerStats.sort((a, b) => {
    if (b.totalWins !== a.totalWins) return b.totalWins - a.totalWins;
    return b.winRate - a.winRate;
  });

  const divisionCrowns = division 
    ? currentCrowns.filter(c => c.division === parseInt(division, 10))
    : currentCrowns;

  const divisionReigns = division
    ? reigns.filter(r => r.division === parseInt(division, 10))
    : reigns;

  return {
    playerStats,
    crowns: divisionCrowns,
    reigns: divisionReigns
  };
}

router.get('/', async (req, res) => {
  try {
    const stats = await getAggregatedStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:division', async (req, res) => {
  try {
    const div = parseInt(req.params.division, 10);
    if (![4, 5, 6].includes(div)) {
      return res.status(400).json({ error: 'Division must be 4, 5, or 6' });
    }
    const stats = await getAggregatedStats(div);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
