#!/usr/bin/env node
// PreToolUse hook (Read): blocks a whole-file read of the large files CLAUDE.md says to skip ("Efficient repository
// exploration"). A read with an offset or limit goes through, and image files are always readable.
// Exit 2 blocks with a message; any unexpected error fails open.
const { readInput, relativePath, logEvent, blockWith } = require('./lib');

const HEAVY = [
  /^DEVLOG\.md$/,
  /^BALANCE\.md$/,
  /^docs\/(DEVLOG-archive|DECISIONS-archive|TODO-archive)\.md$/,
  /^docs\/move_rework_holding\//,
  /^js\/data\/(sprites-meta|pokedex|pokesprite-index|moves-generated|learnsets)\.js$/,
  /^js\/app\.min\.js$/,
  /^pokeapi-master\//,
  /^node_modules\//,
  /^assets\//,
];
const IMAGE_FILE = /\.(png|jpe?g|gif|webp|bmp|svg)$/i;

try {
  const input = readInput();
  const toolInput = input.tool_input || {};
  const rel = relativePath(input, toolInput.file_path);
  const hasRange = toolInput.offset != null || toolInput.limit != null;
  if (rel && !hasRange && !IMAGE_FILE.test(rel) && HEAVY.some((pattern) => pattern.test(rel))) {
    logEvent('heavy-read-guard', 'BLOCKED', rel);
    blockWith(
      'BLOCKED: ' +
        rel +
        ' is a large file CLAUDE.md says to skip. Search it first (Grep for the keyword) and then Read a range with offset and limit.',
    );
  }
} catch (error) {
  // fail open
}
process.exit(0);
