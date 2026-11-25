// tools/catchup.js: prints the whole "catch me up" briefing in one place (CONTEXT.md "Session start").
// Usage: node tools/catchup.js
//   prints to the terminal AND writes the same text to catchup-latest.md (gitignored, overwritten each run,
//   first line is the run date and time). Read-only: it never changes git or GitHub.
// Needs git, and gh (logged in, with the `project` scope for the board) for the GitHub sections. When gh is
// missing a section says "unavailable" and why, and the local sections still print. Quick can read catchup-latest.md.
const fs = require('fs'),
  path = require('path'),
  cp = require('child_process');
const root = path.resolve(__dirname, '..');
const OUTPUT_FILE = 'catchup-latest.md';
const PROJECT_NUMBER = '2';
const PROJECT_OWNER = 'Jess-Rivera';
const HOOK_LOG_LINES_SHOWN = 10;

// ---- pure helpers (checked by docs/proposals/catchup-harness.js) ----

// Splits a markdown file into { heading: [lines] } by its "## " headings.
function parseSections(markdown) {
  const sections = {};
  let current = null;
  for (const line of markdown.split(/\r?\n/)) {
    const heading = /^##\s+(.*)$/.exec(line);
    if (heading) {
      current = heading[1].trim();
      sections[current] = [];
    } else if (current) sections[current].push(line);
  }
  return sections;
}

// Finds the first section whose heading starts with the given text.
function findSection(sections, headingStart) {
  const key = Object.keys(sections).find((heading) => heading.startsWith(headingStart));
  return key ? sections[key] : [];
}

// Adds the issue title after "#N" when the title is known: "#138 [128 S8: Exp Candy drops]". Only the first mention
// gets it: a number in titledNumbers stays bare, and each number titled here is added to that set.
function annotateIssueNumbers(text, titleByNumber, titledNumbers) {
  return text.replace(/#(\d+)\b/g, (match, digits) => {
    const number = Number(digits);
    const title = titleByNumber.get(number);
    if (!title || titledNumbers.has(number)) return match;
    titledNumbers.add(number);
    return match + ' [' + title + ']';
  });
}

// Annotates the TODO.md Next lines, leaving the "Board fixes" item bare (a long list of numbers, up to the next item).
function annotateNextLines(nextLines, annotate) {
  let inBoardFixes = false;
  return nextLines.map((line) => {
    if (/^\d+[a-z]?\.\s/.test(line)) inBoardFixes = /^\d+[a-z]?\.\s+Board fixes/i.test(line);
    return inBoardFixes ? line : annotate(line);
  });
}

function issueNumbersIn(text) {
  return [...text.matchAll(/#(\d+)\b/g)].map((match) => Number(match[1]));
}

// A blocked issue is stale when its body names blockers ("blocked by #12") and every one of them is closed.
function blockersAllClosed(issueBody, openNumbers) {
  const found = /blocked by:?\s*((?:#\d+[\s,]*(?:and\s+)?)+)/i.exec(issueBody || '');
  if (!found) return false;
  const blockers = issueNumbersIn(found[1]);
  return blockers.length > 0 && blockers.every((number) => !openNumbers.has(number));
}

// ---- data sources (injected so the harness can run without git or gh) ----

function defaultRunner(command, args) {
  const result = cp.spawnSync(command, args, { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (result.error) throw new Error(command + ' not runnable: ' + result.error.message);
  if (result.status !== 0) throw new Error((result.stderr || '').trim().split('\n')[0] || command + ' failed');
  return result.stdout;
}

function defaultReadFile(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

// Runs a step; a failure becomes a short "unavailable" reason instead of stopping the report.
function attempt(step) {
  try {
    return { ok: true, value: step() };
  } catch (error) {
    return { ok: false, reason: String(error.message || error).split('\n')[0] };
  }
}

function unavailable(label, reason) {
  return ['_' + label + ' unavailable: ' + reason + '_'];
}

// ---- sections ----

function branchSection(run) {
  const lines = [];
  const branch = attempt(() => run('git', ['rev-parse', '--abbrev-ref', 'HEAD']).trim());
  if (!branch.ok) return unavailable('git', branch.reason);
  const dirty = attempt(() => run('git', ['status', '--porcelain']).trim());
  const lastCommit = attempt(() => run('git', ['log', '-1', '--format=%h %s']).trim());
  const upstream = attempt(() =>
    run('git', ['rev-list', '--left-right', '--count', 'HEAD...@{u}']).trim().split(/\s+/)
  );
  const ahead = attempt(() => run('git', ['rev-list', '--count', 'main..HEAD']).trim());
  const behind = attempt(() => run('git', ['rev-list', '--count', 'HEAD..origin/main']).trim());
  lines.push('- Branch: `' + branch.value + '`');
  lines.push(
    '- Working tree: ' +
      (dirty.ok
        ? dirty.value
          ? 'DIRTY (commit first, never edit a dirty tree after a tool switch)'
          : 'clean'
        : 'unknown')
  );
  if (upstream.ok)
    lines.push(
      '- Against its origin branch: ' +
        upstream.value[0] +
        ' ahead (push needed), ' +
        upstream.value[1] +
        ' behind (pull needed)'
    );
  else lines.push('- Against its origin branch: no upstream set (' + upstream.reason + ')');
  if (ahead.ok && behind.ok)
    lines.push('- Against main: adds ' + ahead.value + ' commits, main has ' + behind.value + ' this branch lacks');
  if (lastCommit.ok) lines.push('- Last commit: ' + lastCommit.value);
  return lines;
}

function loadGitHub(run) {
  const issues = attempt(() =>
    JSON.parse(
      run('gh', [
        'issue',
        'list',
        '--state',
        'all',
        '--limit',
        '1000',
        '--json',
        'number,title,state,labels,body,updatedAt',
      ])
    )
  );
  const board = attempt(() =>
    JSON.parse(
      run('gh', [
        'project',
        'item-list',
        PROJECT_NUMBER,
        '--owner',
        PROJECT_OWNER,
        '--format',
        'json',
        '--limit',
        '1000',
      ])
    )
  );
  return { issues, board };
}

function buildReport({ run = defaultRunner, readFile = defaultReadFile, now = new Date() } = {}) {
  const out = [];
  const pad = (number) => String(number).padStart(2, '0');
  const stamp =
    now.getFullYear() +
    '-' +
    pad(now.getMonth() + 1) +
    '-' +
    pad(now.getDate()) +
    ' ' +
    pad(now.getHours()) +
    ':' +
    pad(now.getMinutes());
  out.push('Catch-up run: ' + stamp);
  out.push('');

  const state = attempt(() => parseSections(readFile('STATE.md')));
  const todo = attempt(() => parseSections(readFile('TODO.md')));
  const { issues, board } = loadGitHub(run);

  const titleByNumber = new Map();
  const openNumbers = new Set();
  const labelsOf = (issue) => issue.labels.map((label) => label.name);
  if (issues.ok) {
    for (const issue of issues.value) {
      titleByNumber.set(issue.number, issue.title);
      if (issue.state === 'OPEN') openNumbers.add(issue.number);
    }
  }
  const openIssues = issues.ok ? issues.value.filter((issue) => issue.state === 'OPEN') : [];
  const titledNumbers = new Set();
  const annotate = (text) => annotateIssueNumbers(text, titleByNumber, titledNumbers);
  const label = (issue) =>
    annotateIssueNumbers('#' + issue.number, new Map([[issue.number, issue.title]]), titledNumbers);
  const ghReason = !issues.ok ? issues.reason : !board.ok ? board.reason : '';
  const needScopeHint = !board.ok && /scope/i.test(board.reason) ? ' (run `gh auth refresh -s project`)' : '';

  out.push('## 1. Branch and tree', '', ...branchSection(run), '');

  // 2. Suggested for today
  out.push('## 2. Suggested for today', '');
  const nextLines = todo.ok ? findSection(todo.value, 'Next').filter((line) => line.trim()) : [];
  if (nextLines.length) {
    out.push('From TODO.md "Next" (in its order):', '');
    out.push(...annotateNextLines(nextLines, annotate), '');
  } else out.push(...unavailable('TODO.md Next section', todo.ok ? 'section not found' : todo.reason), '');
  if (issues.ok) {
    const todoNumbers = new Set(issueNumbersIn(nextLines.join('\n')));
    const extras = openIssues.filter(
      (issue) =>
        labelsOf(issue).some((name) => name === 'priority:high' || name === 'ready') && !todoNumbers.has(issue.number)
    );
    out.push('Open `priority:high` or `ready` issues not on that list (' + extras.length + '):', '');
    out.push(
      ...(extras.length
        ? extras.map(
            (issue) => '- ' + label(issue) + (labelsOf(issue).includes('priority:high') ? ' (priority:high)' : '')
          )
        : ['- none']),
      ''
    );
  } else out.push(...unavailable('GitHub issues', ghReason), '');

  // 3. Owed by you
  out.push('## 3. Owed by you', '');
  if (board.ok) {
    const playtestCards = board.value.items.filter(
      (item) => /playtest/i.test(item.status || '') && item.content && item.content.number
    );
    out.push('Board cards in Needs Playtest (' + playtestCards.length + '):', '');
    out.push(...(playtestCards.length ? playtestCards.map((item) => '- ' + label(item.content)) : ['- none']), '');
  } else out.push(...unavailable('board', board.reason + needScopeHint), '');
  if (issues.ok) {
    const labeled = openIssues.filter((issue) => labelsOf(issue).includes('needs-playtest'));
    out.push('Open issues labeled `needs-playtest` (' + labeled.length + '):', '');
    out.push(...(labeled.length ? labeled.map((issue) => '- ' + label(issue)) : ['- none']), '');
  }
  const decisionLines = state.ok
    ? findSection(state.value, 'Open owner decisions').filter((line) => line.trim() && !line.startsWith('Rules:'))
    : [];
  out.push('Open owner decisions (from STATE.md, in full):', '');
  out.push(
    ...(decisionLines.length
      ? decisionLines.map(annotate)
      : unavailable('STATE.md decisions', state.ok ? 'section not found' : state.reason)),
    ''
  );

  // 4. Needs triage
  out.push('## 4. Needs triage', '');
  if (issues.ok) {
    const unlabeled = openIssues.filter((issue) => issue.labels.length === 0);
    const needsTriage = openIssues.filter((issue) => labelsOf(issue).includes('needs-triage'));
    const needsInfo = openIssues.filter((issue) => labelsOf(issue).includes('needs-info'));
    const staleBlocked = openIssues.filter(
      (issue) => labelsOf(issue).includes('blocked') && blockersAllClosed(issue.body, openNumbers)
    );
    const group = (title, list, extra) => {
      out.push(title + ' (' + list.length + '):', '');
      out.push(
        ...(list.length ? list.map((issue) => '- ' + label(issue) + (extra ? extra(issue) : '')) : ['- none']),
        ''
      );
    };
    group('Unlabeled', unlabeled);
    group('`needs-triage`', needsTriage);
    group(
      '`needs-info` (check for a reply since the last note)',
      needsInfo,
      (issue) => ', updated ' + issue.updatedAt.slice(0, 10)
    );
    group('`blocked` with every named blocker closed (likely stale label)', staleBlocked);
    if (unlabeled.length + needsTriage.length + needsInfo.length + staleBlocked.length > 0)
      out.push('Run /triage to work through these.', '');
  } else out.push(...unavailable('GitHub issues', ghReason), '');

  // 5. Drift
  out.push('## 5. Drift', '');
  const drift = [];
  if (issues.ok) {
    // Lines that say "closed" on purpose (board-fix notes) are skipped; any other mention of a closed issue is drift.
    const mentionedLines = [...nextLines, ...(state.ok ? findSection(state.value, 'START HERE') : [])].filter(
      (line) => !/\bclosed\b/i.test(line)
    );
    const listedNumbers = new Set(issueNumbersIn(mentionedLines.join('\n')));
    for (const number of [...listedNumbers].sort((a, b) => a - b)) {
      if (titleByNumber.has(number) && !openNumbers.has(number))
        drift.push('- ' + annotate('#' + number) + ' is CLOSED but TODO.md or STATE.md still mentions it');
    }
    const claimed = /(\d+) open issues/.exec(todo.ok ? Object.values(todo.value).flat().join('\n') : '');
    if (claimed && Number(claimed[1]) !== openNumbers.size)
      drift.push('- TODO.md says ' + claimed[1] + ' open issues, GitHub has ' + openNumbers.size);
  }
  if (issues.ok && board.ok) {
    const statusByNumber = new Map(
      board.value.items
        .filter((item) => item.content && item.content.number)
        .map((item) => [item.content.number, item.status])
    );
    for (const issue of openIssues) {
      if (!statusByNumber.has(issue.number)) drift.push('- ' + label(issue) + ' is open but not on the board');
      else if (/shipped/i.test(statusByNumber.get(issue.number) || ''))
        drift.push('- ' + label(issue) + ' is open but its card is in Shipped');
    }
    for (const [number, status] of statusByNumber) {
      if (titleByNumber.has(number) && !openNumbers.has(number) && !/shipped/i.test(status || ''))
        drift.push('- ' + annotate('#' + number) + ' is closed but its card is in ' + status);
    }
  }
  if (!issues.ok || !board.ok) drift.push(...unavailable('board and issue drift checks', ghReason));
  out.push(...(drift.length ? drift : ['- none found']), '');

  // 6. Sync
  out.push('## 6. Bring this machine up to date (you run these)', '');
  const branch = attempt(() => run('git', ['rev-parse', '--abbrev-ref', 'HEAD']).trim());
  const branchName = branch.ok ? branch.value : '<branch>';
  out.push(
    '```',
    'git status',
    'git fetch origin',
    'git checkout ' + branchName + '    # first time here: git checkout -b ' + branchName + ' origin/' + branchName,
    'git pull --ff-only    # if this fails the machines diverged: stop and tell the assistant',
    'git log --oneline main..' + branchName,
    'git log --oneline ' + branchName + '..origin/main',
    'node tools/check.js    # must end with "check: all passed"',
    '```',
    'Before leaving a machine: commit and push.',
    ''
  );

  // 7. Project hook log (written by .claude/hooks; lets Jess see what fired or blocked without asking)
  out.push('## 7. Project hook log (last ' + HOOK_LOG_LINES_SHOWN + ' entries)', '');
  const hookLog = attempt(() => readFile('.claude/hooks/hook-log.txt'));
  const hookLogLines = hookLog.ok ? hookLog.value.split('\n').filter(Boolean).slice(-HOOK_LOG_LINES_SHOWN) : [];
  out.push(...(hookLogLines.length ? hookLogLines.map((line) => '- ' + line) : ['- no hook events logged yet']));
  return out.join('\n') + '\n';
}

module.exports = {
  parseSections,
  findSection,
  annotateIssueNumbers,
  annotateNextLines,
  issueNumbersIn,
  blockersAllClosed,
  buildReport,
};

if (require.main === module) {
  const report = buildReport();
  process.stdout.write(report);
  fs.writeFileSync(path.join(root, OUTPUT_FILE), report);
}
