/* ============ gym-present.js: presentation for the gym sim events (docs/SIM-PRESENT-BOUNDARY.md) ============
 * systems/gym.js (the sim) emits plain-data events on G.SimBus; this file turns them into toasts and sounds. It owns every word and sound
 * of the gym schedule. Registered once at boot. Engine globals are read lazily when an event arrives.
 * Events: 'gym:escalate' { leader, bump }, 'gym:calm' { leader }, 'gym:badge' { badge, stat, pct } (stat and pct are null without a boost).
 */
G.GymPresent = (() => {
  G.SimBus.on('gym:escalate', ev => {
    G.Spawner.say(ev.leader + ' gets stronger, and so does the world!', 3, true);
    G.Audio.sfx('rift');
  });
  G.SimBus.on('gym:calm', ev => {
    G.Spawner.say('The world calms with ' + ev.leader + ' defeated.', 3, true);
  });
  G.SimBus.on('gym:badge', ev => {
    const boost = ev.stat ? ' +' + Math.round(ev.pct * 100) + '% ' + G.Gyms.STAT_LABEL[ev.stat] + ' for the whole team,' : '';
    G.Spawner.say(ev.badge + ' earned!' + boost + ' and a level up', 3.6, true);
  });
  return {};
})();
