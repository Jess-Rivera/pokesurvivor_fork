#!/usr/bin/env node
// PostToolUse hook (Edit, Write): after STATE.md is written, tells the assistant when it is over its 3 KB limit
// (CLAUDE.md "Keep docs lean"). The write has already happened, so this only reports (exit 2 shows stderr to the assistant).
const fs = require('fs'),
  path = require('path');
const { readInput, projectDir, relativePath, logEvent } = require('./lib');

const STATE_LIMIT_BYTES = 3 * 1024;

try {
  const input = readInput();
  const rel = relativePath(input, input.tool_input && input.tool_input.file_path);
  if (rel === 'STATE.md') {
    const bytes = fs.statSync(path.join(projectDir(input), 'STATE.md')).size;
    if (bytes > STATE_LIMIT_BYTES) {
      logEvent('doc-size', 'warned', 'STATE.md ' + bytes + ' bytes');
      process.stderr.write(
        'STATE.md is ' +
          bytes +
          ' bytes, over its 3 KB limit (CLAUDE.md "Keep docs lean"). Trim it: replace, do not append; history goes to DEVLOG.md.\n',
      );
      process.exit(2);
    }
  }
} catch (error) {
  // fail open
}
process.exit(0);
