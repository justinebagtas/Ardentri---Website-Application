const test = require('node:test');
const assert = require('node:assert/strict');
const TournamentTree = require('../tree.js');
require('../manager.js');
const TournamentManager = globalThis.TournamentManager;

function names(size) { return Array.from({ length: size }, (_, i) => `Team ${i + 1}`); }

test('supports 4, 8, and 16 teams with the required array formulas', () => {
  for (const size of [4, 8, 16]) {
    const tree = new TournamentTree(size).addTeams(names(size));
    assert.equal(tree.getNumNodes(), 2 * size - 1);
    assert.equal(tree.nodes.length, 2 * size);
    assert.equal(tree.getRoot().index, 1);
    assert.equal(tree.getHeight(), Math.log2(size));
    assert.equal(tree.getTotalMatches(), size - 1);
    assert.equal(tree.getNode(size).value, 'Team 1');
    assert.equal(tree.getNode(2 * size - 1).value, `Team ${size}`);
    assert.equal(tree.getLeftChild(2), 4);
    assert.equal(tree.getRightChild(2), 5);
    assert.equal(tree.getParent(5), 2);
    assert.equal(tree.isLeaf(size), true);
    assert.equal(tree.isLeaf(size - 1), false);
  }
});

test('validates team names before changing any leaf', () => {
  const tree = new TournamentTree(4).addTeams(names(4));
  assert.throws(() => tree.addTeams(['Alpha', 'Beta', 'alpha', 'Delta']), /unique/i);
  assert.deepEqual(tree.getAllTeams(), names(4));
  assert.throws(() => tree.addTeams(['Alpha', '', 'Gamma', 'Delta']), /name/i);
});

test('winners advance through child match nodes to the root champion', () => {
  const tree = new TournamentTree(4).addTeams(names(4));
  assert.deepEqual(tree.getCompetingTeams(2), ['Team 1', 'Team 2']);
  assert.equal(tree.isMatchReady(1), false);
  tree.setWinner(2, 'Team 1');
  tree.setWinner(3, 'Team 3');
  assert.deepEqual(tree.getCompetingTeams(1), ['Team 1', 'Team 3']);
  tree.setWinner(1, 'Team 3');
  assert.equal(tree.isTournamentComplete(), true);
  assert.equal(tree.getChampion(), 'Team 3');
  assert.equal(tree.getCompletedMatches(), 3);
});

test('blocks premature matches and prevents undoing a result used by a completed parent', () => {
  const tree = new TournamentTree(4).addTeams(names(4));
  assert.throws(() => tree.setWinner(1, 'Team 1'), /waiting|ready/i);
  tree.setWinner(2, 'Team 1');
  tree.setWinner(3, 'Team 3');
  tree.setWinner(1, 'Team 1');
  assert.throws(() => tree.undoWinner(2), /later matches first/i);
  tree.undoWinner(1);
  tree.undoWinner(3);
  assert.equal(tree.isMatchCompleted(3), false);
});

test('manager records history, searches team status, and undoes the latest result', () => {
  const manager = new TournamentManager();
  manager.startTournament(4, names(4));
  manager.recordWinner(2, 'Team 1');
  assert.equal(manager.getHistory()[0].matchIndex, 2); // Internal array index remains available for undo.
  assert.equal(manager.getHistory()[0].matchIndex, 2); // History uses the same visible match ID as the bracket.
  assert.equal(manager.searchTeam('team 1').status, 'Still competing');
  assert.equal(manager.searchTeam('Team 2').status, 'Eliminated');
  manager.recordWinner(3, 'Team 3');
  assert.equal(manager.getHistory()[1].matchIndex, 3);
  assert.equal(manager.getHistory()[1].matchIndex, 3); // Semifinal IDs follow their tree indices.
  manager.recordWinner(1, 'Team 1');
  assert.equal(manager.getHistory()[2].matchIndex, 1); // The final is Match 1 in both views.
  assert.equal(manager.searchTeam('Team 1').status, 'Champion');
  assert.equal(manager.getHistory().length, 3);
  const undone = manager.undoLastMatch();
  assert.equal(undone.matchIndex, 1);
  assert.equal(manager.getHistory().length, 2);
  assert.equal(manager.getTree().isTournamentComplete(), false);
});

test('reset preserves team leaves but clears all match results', () => {
  const tree = new TournamentTree(4).addTeams(names(4));
  tree.setWinner(2, 'Team 1');
  tree.resetTree();
  assert.deepEqual(tree.getAllTeams(), names(4));
  assert.equal(tree.getCompletedMatches(), 0);
  assert.equal(tree.getNode(2).value, null);
});

test('every supported tournament size can complete through ready matches only', () => {
  for (const size of [4, 8, 16]) {
    const tree = new TournamentTree(size).addTeams(names(size));
    let safety = 0;
    while (!tree.isTournamentComplete() && safety < size) {
      let madeProgress = false;
      for (let i = size - 1; i >= 1; i -= 1) {
        if (tree.isMatchReady(i)) {
          const competitors = tree.getCompetingTeams(i);
          tree.setWinner(i, competitors[0]);
          madeProgress = true;
        }
      }
      assert.equal(madeProgress, true, `expected a ready match for ${size} teams`);
      safety += 1;
    }
    assert.equal(tree.isTournamentComplete(), true, `${size}-team bracket should finish`);
    assert.equal(tree.getCompletedMatches(), size - 1);
    assert.equal(tree.getChampion(), 'Team 1');
  }
});
