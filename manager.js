(function (root) {
  'use strict';

  class TournamentManager {
    constructor() {
      this.tree = null;
      this.history = [];
    }

    startTournament(size, teamNames) {
      const newTree = new root.TournamentTree(size);
      newTree.addTeams(teamNames);
      this.tree = newTree;
      this.history = [];
    }

    getTree() {
      if (!this.tree) {
        throw new Error('Create a tournament first.');
      }
      return this.tree;
    }

    clearTournament() {
      this.tree = null;
      this.history = [];
    }

    getHistory() {
      // Return a copy so the display cannot change the saved history order.
      return this.history.slice();
    }

    recordWinner(matchIndex, winner) {
      const tree = this.getTree();
      const teams = tree.getCompetingTeams(matchIndex);
      if (!teams) {
        throw new Error('This match is not ready yet.');
      }

      const round = tree.getNode(matchIndex).round;
      tree.setWinner(matchIndex, winner);

      this.history.push({
        matchIndex,
        round,
        teamOne: teams[0],
        teamTwo: teams[1],
        winner,
        completedAt: new Date().toLocaleString([], {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit'
        })
      });
    }

    undoLastMatch() {
      if (this.history.length === 0) {
        throw new Error('There are no completed matches to undo.');
      }

      const record = this.history[this.history.length - 1];
      this.getTree().undoWinner(record.matchIndex);
      this.history.pop();
      return record;
    }

    searchTeam(query) {
      const searchName = String(query ?? '').trim();
      if (!searchName) {
        return this._notFound('Enter a team name to search.');
      }
      if (!this.tree) {
        return this._notFound('Create a tournament first.');
      }

      const actualName = this.tree.getAllTeams().find(name =>
        name && name.toLocaleLowerCase() === searchName.toLocaleLowerCase()
      );
      if (!actualName) {
        return this._notFound('No team found with that name.');
      }

      if (this.tree.isTournamentComplete()
        && actualName.toLocaleLowerCase() === this.tree.getChampion().toLocaleLowerCase()) {
        return {
          found: true,
          teamName: actualName,
          status: 'Champion',
          details: 'Won the final and the tournament.'
        };
      }

      const lostMatch = this.history.some(record => {
        const played = actualName.toLocaleLowerCase() === record.teamOne.toLocaleLowerCase()
          || actualName.toLocaleLowerCase() === record.teamTwo.toLocaleLowerCase();
        return played && actualName.toLocaleLowerCase() !== record.winner.toLocaleLowerCase();
      });

      if (lostMatch) {
        return {
          found: true,
          teamName: actualName,
          status: 'Eliminated',
          details: 'The team has lost a completed match.'
        };
      }

      for (let index = 1; index < this.tree.size; index += 1) {
        if (!this.tree.isMatchReady(index) || this.tree.isMatchCompleted(index)) continue;

        const teams = this.tree.getCompetingTeams(index);
        if (actualName === teams[0]) {
          return this._foundTeam(actualName, `Next opponent: ${teams[1]}`);
        }
        if (actualName === teams[1]) {
          return this._foundTeam(actualName, `Next opponent: ${teams[0]}`);
        }
      }

      return this._foundTeam(actualName, 'Waiting for the other result(s) in its next match.');
    }

    _notFound(message) {
      return {
        found: false,
        teamName: '',
        status: 'Not found',
        details: message
      };
    }

    _foundTeam(teamName, details) {
      return {
        found: true,
        teamName,
        status: 'Still competing',
        details
      };
    }
  }

  root.TournamentManager = TournamentManager;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = TournamentManager;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
