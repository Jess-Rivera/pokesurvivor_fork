#!/usr/bin/env node
// PreToolUse hook (Edit, Write): the first time in a session an edit touches a path covered by a rule in rules.js,
// the rule's short reminder is added to the assistant's context. Rules marked gate also block the first edit until the
// coding-principles skill has been loaded this session (the gate cannot see a plan written in chat; it catches the skip
// at the first edit). Exit 2 blocks, exit 0 allows; any unexpected error fails open.
const { readInput, relativePath, logEvent, firstTimeThisSession, addContext, blockWith, skillWasLoaded } = require('./lib');
const { matchRules } = require('./rules');

try {
  const input = readInput();
  const rel = relativePath(input, input.tool_input && input.tool_input.file_path);
  const matched = rel ? matchRules(rel) : [];
  if (matched.length) {
    const gated = matched.some((rule) => rule.gate);
    if (gated && !skillWasLoaded(input.transcript_path, 'coding-principles')) {
      logEvent('inject-rules', 'BLOCKED', rel + ' (coding-principles not loaded)');
      blockWith(
        'BLOCKED: load the coding-principles skill (Skill tool) and check the plan and this change against it before editing ' +
          rel +
          '. Then repeat the edit. If the plan did not apply it, revise the plan first.',
      );
    }
    const fresh = matched.filter((rule) => firstTimeThisSession(input.session_id, 'rule-' + rule.id));
    if (fresh.length) {
      logEvent('inject-rules', 'fired', fresh.map((rule) => rule.id).join(',') + ' <- ' + rel);
      addContext('PreToolUse', fresh.map((rule) => rule.text).join('\n'));
    }
  }
} catch (error) {
  // fail open
}
process.exit(0);
