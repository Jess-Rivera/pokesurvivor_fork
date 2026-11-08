#!/usr/bin/env node
// PreToolUse hook (Bash and PowerShell): the assistant may commit and manage GitHub issues/PRs/board,
// everything else that changes the repo or the remote is blocked. Policy lives in CLAUDE.md "Git".
// Allowlist, not blocklist: an unknown git or gh subcommand is blocked until we decide about it.
// Exit 2 + stderr = blocked (the assistant sees the message). Exit 0 = allowed.

const GIT_ALLOWED = new Set([
  'status', 'diff', 'log', 'show', 'blame', 'ls-files', 'ls-tree', 'rev-parse', 'rev-list', 'cat-file',
  'show-ref', 'for-each-ref', 'merge-base', 'name-rev', 'describe', 'shortlog', 'grep', 'check-ignore',
  'diff-tree', 'ls-remote', 'fetch', 'add', 'commit',
]);
// Subcommands allowed only in a read-only form: [subcommand, regex the remaining args must match].
const GIT_READONLY = {
  branch: /^(\s*(-a|-r|-v|-vv|--list|--all|--remotes|--show-current|--merged|--no-merged|--contains)\b[^;&|]*)?$/,
  config: /^\s*(--get\b|--get-all\b|--get-regexp\b|--list\b|-l\b)/,
  remote: /^\s*(-v|show\s+\S+|get-url\s+\S+)?\s*$/,
  stash: /^\s*(list|show)\b/,
  reflog: /^\s*(show\b|--)?/,
};
const GIT_ALWAYS_BLOCKED_FLAGS = /(--amend\b|--no-verify\b|--force\b|\s-f\b)/;

const GH_ALLOWED = [
  /^issue (create|edit|comment|close|reopen|list|view|status)\b/,
  /^pr (create|edit|comment|list|view|status|diff|checks)\b/,
  /^project (list|view|field-list|item-list|item-create|item-add|item-edit)\b/,
  /^label (list|create|edit)\b/,
  /^repo view\b/,
  /^run (list|view)\b/,
  /^search\b/,
  /^auth status\b/,
  /^(--version|version)\b/,
];

function block(command, why) {
  process.stderr.write(
    `BLOCKED: ${why}\nCommand: ${command}\n` +
      'Policy (CLAUDE.md "Git"): I may commit on the current branch and manage GitHub issues, PRs and the board. ' +
      'Branch switching, merge, push, reset, and other repo changes are Jess-only. Give Jess the exact commands instead.\n',
  );
  process.exit(2);
}

function checkGit(command, args) {
  // Skip global options (-C <dir>, -c k=v, --no-pager, ...) to find the subcommand.
  const tokens = args.trim().split(/\s+/);
  let i = 0;
  while (i < tokens.length && tokens[i].startsWith('-')) {
    i += tokens[i] === '-C' || tokens[i] === '-c' ? 2 : 1;
  }
  const sub = tokens[i] || '';
  const rest = tokens.slice(i + 1).join(' ');
  if (GIT_ALWAYS_BLOCKED_FLAGS.test(' ' + rest) && !/^(log|show|diff|blame|grep|status)$/.test(sub)) {
    block(command, `git ${sub} with a forbidden flag (amend, force, no-verify)`);
  }
  if (GIT_ALLOWED.has(sub)) return;
  if (GIT_READONLY[sub]) {
    if (GIT_READONLY[sub].test(rest)) return;
    block(command, `git ${sub} is allowed only in a read-only form`);
  }
  block(command, `git ${sub || '(no subcommand)'} is not on the allowed list`);
}

function checkGh(command, args) {
  const a = args.trim();
  if (/^api\b/.test(a)) {
    if (/(-X|--method)\s+(?!GET\b)\S+/i.test(a) || /\s(-f|-F|--field|--raw-field|--input)\b/.test(a)) {
      block(command, 'gh api writes are blocked (only GET reads are allowed)');
    }
    return;
  }
  if (GH_ALLOWED.some((re) => re.test(a))) return;
  block(command, `gh ${a.split(/\s+/).slice(0, 2).join(' ')} is not on the allowed list (merge, delete, release, repo changes are Jess-only)`);
}

// Drop heredoc bodies and quoted text so words inside commit messages never trigger a rule.
function strip(command) {
  return command.replace(/<<-?\s*['"]?\w+['"]?[\s\S]*$/, '');
}
function stripQuotes(text) {
  return text.replace(/"[^"]*"|'[^']*'/g, '""');
}

function check(raw) {
  const command = strip(raw);
  // Coarse backstop for the destructive ones, wherever they hide (bash -c "...", aliases, pipes).
  if (/\bgit\b(\s+-\S+(\s+\S+)?)*\s+push\b/.test(command) || /\bgit\b[^\n;&|]*\breset\s+--hard\b/.test(command)) {
    block(command, 'git push / reset --hard is never allowed from here');
  }
  // Per-segment check, only where git/gh sits at command position (so words inside commit messages are ignored).
  for (const segment of stripQuotes(command).split(/&&|\|\||;|\||\r?\n/)) {
    const m = segment.trim().match(/^(?:[A-Za-z_][A-Za-z0-9_]*=\S*\s+)*(git|gh)(?:\.exe)?\s+(.*)$/s);
    if (!m) continue;
    if (m[1] === 'git') checkGit(command, m[2]);
    else checkGh(command, m[2]);
  }
}

let input = '';
process.stdin.on('data', (d) => (input += d));
process.stdin.on('end', () => {
  let command = '';
  try {
    command = JSON.parse(input).tool_input.command || '';
  } catch (e) {
    process.exit(0);
  }
  check(command);
  process.exit(0);
});
