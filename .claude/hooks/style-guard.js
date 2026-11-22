#!/usr/bin/env node
// PreToolUse hook (Edit, Write): blocks a write that ADDS an em-dash (CLAUDE.md "Prose style": no em-dashes anywhere).
// Existing em-dashes are left alone: an Edit is judged by new_string against old_string, a Write against the file now on disk.
// Exit 2 blocks with a message; any unexpected error fails open.
const fs = require('fs'),
  path = require('path');
const { readInput, projectDir, relativePath, logEvent, blockWith } = require('./lib');

const EM_DASH = String.fromCharCode(8212);
const SKIPPED_PATHS = /^(node_modules|pokeapi-master|assets|_delete_)\//;
const count = (text) => (text ? text.split(EM_DASH).length - 1 : 0);

try {
  const input = readInput();
  const toolInput = input.tool_input || {};
  const rel = relativePath(input, toolInput.file_path);
  if (rel && !SKIPPED_PATHS.test(rel)) {
    let added = 0;
    if (input.tool_name === 'Edit') {
      added = count(toolInput.new_string) - count(toolInput.old_string);
    } else if (input.tool_name === 'Write') {
      let existing = '';
      try {
        existing = fs.readFileSync(path.resolve(projectDir(input), toolInput.file_path), 'utf8');
      } catch (error) {
        existing = '';
      }
      added = count(toolInput.content) - count(existing);
    }
    if (added > 0) {
      logEvent('style-guard', 'BLOCKED', rel + ' (+' + added + ' em-dash)');
      blockWith(
        'BLOCKED: this write adds ' +
          added +
          ' em-dash(es) to ' +
          rel +
          '. CLAUDE.md "Prose style": no em-dashes anywhere. Use commas, parentheses, "since" or "because", then repeat the edit.',
      );
    }
  }
} catch (error) {
  // fail open
}
process.exit(0);
