(function (root) {
  'use strict';

  const ALLOWED_SIZES = [4, 8, 16];

  class TournamentTree {
    constructor(size) {
      if (!ALLOWED_SIZES.includes(Number(size))) {
        throw new Error('Choose a tournament size of 4, 8, or 16 teams.');
      }
      this.size = Number(size);
      this.totalNodes = 2 * this.size - 1;
      // Index 0 is intentionally unused so the course's array formulas apply.
      this.nodes = Array(this.totalNodes + 1);
      this._initialize();
    }

    _initialize() {
      for (let i = 1; i <= this.totalNodes; i += 1) {
        this.nodes[i] = {
          index: i,
          value: null,
          round: i >= this.size ? 'Team' : this._roundForIndex(i),
          matchNumber: i >= this.size ? i - this.size + 1 : i,
          completed: false
        };
      }
    }

    _roundForIndex(index) {
      const depth = Math.floor(Math.log2(index));
      const totalRounds = Math.log2(this.size);
      const roundFromFirst = totalRounds - depth;
      if (roundFromFirst === totalRounds) return 'Final';
      if (roundFromFirst === 1) {
        if (this.size === 4) return 'Semifinal';
        if (this.size === 8) return 'Quarterfinal';
        return 'Round of 16';
      }
      if (roundFromFirst === 2) return this.size === 8 ? 'Semifinal' : 'Quarterfinal';
      if (roundFromFirst === 3) return 'Semifinal';
      return `Round of ${this.size / (2 ** (roundFromFirst - 1))}`;
    }

    addTeams(teamNames) {
      if (!Array.isArray(teamNames) || teamNames.length !== this.size) {
        throw new Error(`Enter exactly ${this.size} team names.`);
      }
      const names = teamNames.map(name => String(name ?? '').trim());
      const seen = new Set();
      for (let i = 0; i < names.length; i += 1) {
        if (!names[i]) throw new Error(`Team ${i + 1} needs a name.`);
        const normalized = names[i].toLocaleLowerCase();
        if (seen.has(normalized)) throw new Error(`Team names must be unique. “${names[i]}” is repeated.`);
        seen.add(normalized);
      }
      // Validate first, then write, so a failed update never leaves a half-built tree.
      for (let i = 0; i < names.length; i += 1) {
        const index = this.size + i;
        this.nodes[index].value = names[i];
      }
      return this;
    }

    getLeftChild(index) { return index * 2 <= this.totalNodes ? index * 2 : null; }
    getRightChild(index) { return index * 2 + 1 <= this.totalNodes ? index * 2 + 1 : null; }
    getParent(index) { return index >= 1 && index <= this.totalNodes && index !== 1 ? Math.floor(index / 2) : null; }
    isLeaf(index) { return Number.isInteger(index) && index >= this.size && index <= this.totalNodes; }
    getRoot() { return this.nodes[1]; }
    getNode(index) { return Number.isInteger(index) && index >= 1 && index <= this.totalNodes ? this.nodes[index] : null; }
    getNumNodes() { return this.totalNodes; }
    getTournamentSize() { return this.size; }
    getTotalMatches() { return this.size - 1; }
    getHeight() { return Math.log2(this.size); }
    getAllTeams() { return this.nodes.slice(this.size).map(node => node.value); }

    getCompetingTeams(matchIndex) {
      if (!this._isMatchIndex(matchIndex)) return null;
      const left = this.nodes[this.getLeftChild(matchIndex)].value;
      const right = this.nodes[this.getRightChild(matchIndex)].value;
      return left != null && right != null ? [left, right] : null;
    }

    isMatchReady(matchIndex) {
      return this._isMatchIndex(matchIndex) && !this.nodes[matchIndex].completed && this.getCompetingTeams(matchIndex) !== null;
    }

    isMatchCompleted(matchIndex) {
      return this._isMatchIndex(matchIndex) && this.nodes[matchIndex].completed;
    }

    getWinner(matchIndex) {
      return this._isMatchIndex(matchIndex) && this.nodes[matchIndex].completed ? this.nodes[matchIndex].value : null;
    }

    setWinner(matchIndex, winner) {
      if (!this._isMatchIndex(matchIndex)) throw new Error('That match index is not valid.');
      if (this.nodes[matchIndex].completed) throw new Error('This match has already been completed.');
      const teams = this.getCompetingTeams(matchIndex);
      if (!teams) throw new Error('This match is waiting for both child nodes to provide a team.');
      if (!teams.includes(winner)) throw new Error('Choose one of the two teams in this match.');
      this.nodes[matchIndex].value = winner;
      this.nodes[matchIndex].completed = true;
      return this.nodes[matchIndex];
    }

    undoWinner(matchIndex) {
      if (!this._isMatchIndex(matchIndex)) throw new Error('That match index is not valid.');
      if (!this.nodes[matchIndex].completed) throw new Error('This match has not been completed.');
      let parent = this.getParent(matchIndex);
      while (parent !== null) {
        if (this.nodes[parent].completed) throw new Error('Undo later matches first.');
        parent = this.getParent(parent);
      }
      this.nodes[matchIndex].value = null;
      this.nodes[matchIndex].completed = false;
    }

    getCompletedMatches() {
      let count = 0;
      for (let i = 1; i < this.size; i += 1) if (this.nodes[i].completed) count += 1;
      return count;
    }
    getProgress() { return `${this.getCompletedMatches()} / ${this.getTotalMatches()} matches completed`; }
    isTournamentComplete() { return this.nodes[1].completed; }
    getChampion() { return this.isTournamentComplete() ? this.nodes[1].value : null; }
    resetTree() {
      const teams = this.getAllTeams();
      this._initialize();
      for (let i = 0; i < teams.length; i += 1) this.nodes[this.size + i].value = teams[i];
    }
    _isMatchIndex(index) { return Number.isInteger(index) && index >= 1 && index < this.size; }
  }

  root.TournamentTree = TournamentTree;
  if (typeof module !== 'undefined' && module.exports) module.exports = TournamentTree;
})(typeof globalThis !== 'undefined' ? globalThis : window);
