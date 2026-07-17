const express = require('express');
const router = express.Router();
const playerService = require('../services/playerService');

router.get('/', async (req, res) => {
  try {
    const players = await playerService.getPlayers();
    res.json(players);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    const player = await playerService.createPlayer(name);
    res.status(201).json(player);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
