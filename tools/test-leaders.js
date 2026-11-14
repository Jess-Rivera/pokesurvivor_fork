// tools/test-leaders.js: the test leaders for the harnesses (39a part G, decision
// 2026-11-14-39-opening-split-and-profile-test). Mechanics tests fight each authored leader's real team, triggers and
// lines without its personality (the default leader's Decider), so retuning a personality never moves them. Personality
// tests run inside real(), against the shipped entries. It edits only the harness's loaded copy of the gym list
// (G.Gyms), never js/data/gyms.js. A dev tool: it never ships in the game.
// Usage, once the engine is loaded:
//   const testLeaders = require(path.join(R, 'tools/test-leaders.js'))(G);
//   testLeaders.real(() => { ... });
'use strict';

// LEADER-AI "INTELLIGENCE AND STYLE" and #39: the ai keys that make a personality (a new personality key goes here too)
const PERSONALITY_KEYS = ['goalWeights', 'tagMultipliers', 'range', 'swapWill', 'risk', 'stubbornness', 'intelligence'];

/** A copy of a leader's ai settings without its personality keys. */
function withoutPersonality(ai) {
  const copy = Object.assign({}, ai);
  for (const key of PERSONALITY_KEYS) delete copy[key];
  return copy;
}

/** Puts the test leaders in place now. Returns real(run): runs `run` against the shipped leaders, then the test leaders
 *  are back. */
module.exports = function useTestLeaders(G) {
  const shipped = new Map(
    G.Gyms.allRegions()
      .flatMap((region) => region.gyms)
      .filter((gym) => gym.ai)
      .map((gym) => [gym, gym.ai])
  );
  const showTestLeaders = () => shipped.forEach((ai, gym) => (gym.ai = withoutPersonality(ai)));
  const showShippedLeaders = () => shipped.forEach((ai, gym) => (gym.ai = ai));
  showTestLeaders();
  return {
    real(run) {
      showShippedLeaders();
      try {
        return run();
      } finally {
        showTestLeaders();
      }
    },
  };
};
