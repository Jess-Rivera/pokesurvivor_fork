#!/usr/bin/env node
// PreToolUse hook (Write): a file written into docs/decisions/ must open with the five-field front matter block
// (tools/decision-frontmatter.js). Blocks with the list of what is wrong. Edit calls are not judged here (they cannot
// create a file); tools/check.js fails any decision file that ends up without valid front matter.
// Exit 2 blocks with a message; any unexpected error fails open.
const path = require('path');
const { readInput, projectDir, relativePath, logEvent, blockWith } = require('./lib');

try {
  const input = readInput();
  const toolInput = input.tool_input || {};
  const rel = relativePath(input, toolInput.file_path);
  if (input.tool_name === 'Write' && rel && /^docs\/decisions\/[^/]+\.md$/.test(rel)) {
    const frontMatter = require(path.join(projectDir(input), 'tools', 'decision-frontmatter.js'));
    const problemList = frontMatter.problems(toolInput.content || '', path.basename(rel));
    if (problemList.length) {
      logEvent('decision-frontmatter-guard', 'BLOCKED', rel + ' (' + problemList.length + ' problem(s))');
      blockWith(
        'BLOCKED: ' +
          rel +
          ' needs front matter at the top: ' +
          problemList.join('; ') +
          '. Shape: ---, title, date, issues, area, canonical, --- (see tools/decision-frontmatter.js). Then repeat the write.',
      );
    }
  }
} catch (error) {
  // fail open
}
process.exit(0);
