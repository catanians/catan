const db = require('../db');
const { v4: uuidv4 } = require('uuid');

const crownService = {
  async processMatchCrown(matchId, division, placements, playedAt) {
    const crownStateId = `crown_division_${division}`;
    let crownState = await db.readItem(crownStateId, 'CROWN');
    const winner = placements.find(p => p.place === 1);

    if (!winner) {
      throw new Error('Match placements must have a first-place winner (place = 1)');
    }

    if (!crownState) {
      // Inaugural reign
      crownState = {
        id: crownStateId,
        partitionKey: 'CROWN',
        type: 'crown_state',
        division,
        currentHolderId: winner.playerId,
        currentHolderName: winner.playerName,
        acquiredMatchId: matchId,
        acquiredAt: playedAt,
        defensesCount: 0,
        interimHolderId: null,
        interimHolderName: null,
        interimAcquiredAt: null,
        interimConsecutiveWins: 0
      };
      await db.createItem(crownState);

      const reign = {
        id: `reign_${uuidv4()}`,
        partitionKey: 'CROWN_REIGN',
        type: 'crown_reign',
        division,
        playerId: winner.playerId,
        playerName: winner.playerName,
        startedMatchId: matchId,
        startedAt: playedAt,
        endedMatchId: null,
        endedAt: null,
        successfulDefenses: 0
      };
      await db.createItem(reign);

      return {
        crownChallenged: true,
        crownDefended: false,
        crownHolderBefore: null,
        crownHolderAfter: winner.playerId
      };
    }

    const currentHolderId = crownState.currentHolderId;
    const isHolderPresent = placements.some(p => p.playerId === currentHolderId);

    if (isHolderPresent) {
      // Real belt is on the line. Wipe any interim status.
      crownState.interimHolderId = null;
      crownState.interimHolderName = null;
      crownState.interimAcquiredAt = null;
      crownState.interimConsecutiveWins = 0;

      const holderWon = winner.playerId === currentHolderId;

      if (holderWon) {
        crownState.defensesCount += 1;
        await db.upsertItem(crownState);

        const reigns = await db.queryItems({
          query: "SELECT * FROM c WHERE c.partitionKey = 'CROWN_REIGN' AND c.division = @division AND c.playerId = @playerId",
          parameters: [
            { name: '@division', value: division },
            { name: '@playerId', value: currentHolderId }
          ]
        });
        const activeReign = reigns.find(r => r.endedMatchId === null);
        if (activeReign) {
          activeReign.successfulDefenses += 1;
          await db.upsertItem(activeReign);
        }

        return {
          crownChallenged: true,
          crownDefended: true,
          crownHolderBefore: currentHolderId,
          crownHolderAfter: currentHolderId
        };
      } else {
        const previousHolderId = currentHolderId;

        // End active reign
        const reigns = await db.queryItems({
          query: "SELECT * FROM c WHERE c.partitionKey = 'CROWN_REIGN' AND c.division = @division AND c.playerId = @playerId",
          parameters: [
            { name: '@division', value: division },
            { name: '@playerId', value: currentHolderId }
          ]
        });
        const activeReign = reigns.find(r => r.endedMatchId === null);
        if (activeReign) {
          activeReign.endedMatchId = matchId;
          activeReign.endedAt = playedAt;
          await db.upsertItem(activeReign);
        }

        // Start new reign
        const newReign = {
          id: `reign_${uuidv4()}`,
          partitionKey: 'CROWN_REIGN',
          type: 'crown_reign',
          division,
          playerId: winner.playerId,
          playerName: winner.playerName,
          startedMatchId: matchId,
          startedAt: playedAt,
          endedMatchId: null,
          endedAt: null,
          successfulDefenses: 0
        };
        await db.createItem(newReign);

        // Update state
        crownState.currentHolderId = winner.playerId;
        crownState.currentHolderName = winner.playerName;
        crownState.acquiredMatchId = matchId;
        crownState.acquiredAt = playedAt;
        crownState.defensesCount = 0;
        await db.upsertItem(crownState);

        return {
          crownChallenged: true,
          crownDefended: false,
          crownHolderBefore: previousHolderId,
          crownHolderAfter: winner.playerId
        };
      }
    } else {
      // Crown Holder is ABSENT. Interim logic applies.
      if (winner.playerId === crownState.interimHolderId) {
        // Existing interim champ wins again
        crownState.interimConsecutiveWins += 1;

        if (crownState.interimConsecutiveWins >= 2) {
          // PROMOTION TO FULL CHAMPION!
          const previousHolderId = crownState.currentHolderId;

          // End the old real champ's reign
          const reigns = await db.queryItems({
            query: "SELECT * FROM c WHERE c.partitionKey = 'CROWN_REIGN' AND c.division = @division AND c.playerId = @playerId",
            parameters: [
              { name: '@division', value: division },
              { name: '@playerId', value: previousHolderId }
            ]
          });
          const activeReign = reigns.find(r => r.endedMatchId === null);
          if (activeReign) {
            activeReign.endedMatchId = matchId;
            activeReign.endedAt = playedAt;
            await db.upsertItem(activeReign);
          }

          // Start new real reign for promoted interim champ
          const newReign = {
            id: `reign_${uuidv4()}`,
            partitionKey: 'CROWN_REIGN',
            type: 'crown_reign',
            division,
            playerId: winner.playerId,
            playerName: winner.playerName,
            startedMatchId: matchId,
            startedAt: playedAt,
            endedMatchId: null,
            endedAt: null,
            successfulDefenses: 0,
            wasInterim: true
          };
          await db.createItem(newReign);

          // Update state to make them real champ, wipe interim
          crownState.currentHolderId = winner.playerId;
          crownState.currentHolderName = winner.playerName;
          crownState.acquiredMatchId = matchId;
          crownState.acquiredAt = playedAt;
          crownState.defensesCount = 0;
          
          crownState.interimHolderId = null;
          crownState.interimHolderName = null;
          crownState.interimAcquiredAt = null;
          crownState.interimConsecutiveWins = 0;

          await db.upsertItem(crownState);

          return {
            crownChallenged: true, // It resulted in a real crown change
            crownDefended: false,
            crownHolderBefore: previousHolderId,
            crownHolderAfter: winner.playerId,
            interimPromotion: true
          };
        } else {
          // Not promoted yet, just incrementing wins
          await db.upsertItem(crownState);
          return {
            crownChallenged: false,
            crownDefended: false,
            crownHolderBefore: crownState.currentHolderId,
            crownHolderAfter: crownState.currentHolderId,
            interimUpdated: true
          };
        }
      } else {
        // Someone else wins the interim belt
        crownState.interimHolderId = winner.playerId;
        crownState.interimHolderName = winner.playerName;
        crownState.interimAcquiredAt = playedAt;
        crownState.interimConsecutiveWins = 1;
        
        await db.upsertItem(crownState);
        
        return {
          crownChallenged: false,
          crownDefended: false,
          crownHolderBefore: crownState.currentHolderId,
          crownHolderAfter: crownState.currentHolderId,
          interimUpdated: true
        };
      }
    }
  },

  async getReigns() {
    return await db.queryItems({
      query: "SELECT * FROM c WHERE c.partitionKey = 'CROWN_REIGN'"
    });
  },

  async getCurrentCrowns() {
    return await db.queryItems({
      query: "SELECT * FROM c WHERE c.partitionKey = 'CROWN'"
    });
  },  async resolvePlacement(p, idx, players, division) {
    if (typeof p === 'string') {
      const trimmedName = p.trim();
      let player = players.find(pl => pl.name.toLowerCase() === trimmedName.toLowerCase());
      if (!player) {
        player = {
          id: `player_${uuidv4()}`,
          partitionKey: 'PLAYER',
          type: 'player',
          name: trimmedName,
          createdAt: new Date().toISOString()
        };
        await db.createItem(player);
        players.push(player);
      }
      return {
        playerId: player.id,
        playerName: player.name,
        victoryPoints: idx === 0 ? 10 : (idx === 1 ? 8 : (idx === 2 ? 7 : (idx === 3 ? 6 : (idx === 4 ? 5 : 4)))),
        place: idx + 1,
        settlements: null,
        cities: null,
        metropolis: null,
        longestRoad: null
      };
    }

    const resolved = { ...p };
    if (!resolved.playerId && resolved.playerName) {
      const trimmedName = resolved.playerName.trim();
      let player = players.find(pl => pl.name.toLowerCase() === trimmedName.toLowerCase());
      if (!player) {
        player = {
          id: `player_${uuidv4()}`,
          partitionKey: 'PLAYER',
          type: 'player',
          name: trimmedName,
          createdAt: new Date().toISOString()
        };
        await db.createItem(player);
        players.push(player);
      }
      resolved.playerId = player.id;
      resolved.playerName = player.name;
    }

    if (resolved.victoryPoints !== null && resolved.victoryPoints !== undefined) {
      let vp = parseInt(resolved.victoryPoints, 10);
      resolved.victoryPoints = isNaN(vp) ? null : vp;
    } else {
      resolved.victoryPoints = null;
    }

    resolved.settlements = resolved.settlements !== undefined ? resolved.settlements : null;
    resolved.cities = resolved.cities !== undefined ? resolved.cities : null;
    resolved.metropolis = resolved.metropolis !== undefined ? resolved.metropolis : null;
    resolved.longestRoad = resolved.longestRoad !== undefined ? resolved.longestRoad : null;

    return resolved;
  },

  async rebuildCrownTimeline() {
    // 1. Delete all current crown state records and reigns
    const crowns = await this.getCurrentCrowns();
    for (const c of crowns) {
      await db.deleteItem(c.id, 'CROWN');
    }
    const reigns = await this.getReigns();
    for (const r of reigns) {
      await db.deleteItem(r.id, 'CROWN_REIGN');
    }

    // 2. Get all matches sorted chronologically
    const matches = await db.queryItems({
      query: "SELECT * FROM c WHERE c.partitionKey = 'MATCH' AND c.type = 'match'"
    });
    matches.sort((a, b) => new Date(a.playedAt) - new Date(b.playedAt));

    const players = await db.queryItems({
      query: "SELECT * FROM c WHERE c.partitionKey = 'PLAYER' AND c.type = 'player'"
    });

    // 3. Re-process matches in order
    for (const match of matches) {
      let needsFix = match.placements.some(p => typeof p === 'string' || !p.playerId || p.place === undefined || p.place === null);
      if (!needsFix) {
        // Double check winner has place === 1
        const hasWinner = match.placements.some(p => p.place === 1);
        if (!hasWinner) needsFix = true;
      }

      if (needsFix) {
        const resolvedPlacements = [];
        for (let idx = 0; idx < match.placements.length; idx++) {
          resolvedPlacements.push(await this.resolvePlacement(match.placements[idx], idx, players, match.division));
        }
        resolvedPlacements.sort((a, b) => {
          if (a.place !== undefined && b.place !== undefined) {
            return a.place - b.place;
          }
          return (b.victoryPoints || 0) - (a.victoryPoints || 0);
        });
        
        let currentRank = 1;
        resolvedPlacements.forEach((p, idx) => {
          if (p.place !== undefined) {
            currentRank = p.place;
          } else {
            if (idx > 0 && (p.victoryPoints || 0) < (resolvedPlacements[idx - 1].victoryPoints || 0)) {
              currentRank = idx + 1;
            }
            p.place = currentRank;
          }
        });
        match.placements = resolvedPlacements;
        await db.upsertItem(match);
      }

      const crownResult = await crownService.processMatchCrown(match.id, match.division, match.placements, match.playedAt);
      
      // Update match with new crown results
      match.crownChallenged = crownResult.crownChallenged;
      match.crownDefended = crownResult.crownDefended;
      match.crownHolderBefore = crownResult.crownHolderBefore;
      match.crownHolderAfter = crownResult.crownHolderAfter;
      
      await db.upsertItem(match);
    }
  }
};

module.exports = crownService;
