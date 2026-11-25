// Shared helpers for the project hooks in .claude/hooks (see docs/AI Outputs/Issue-HOOKS if present, and CLAUDE.md).
// Every hook reads its input JSON from stdin, may print context for the assistant, and exits 2 with a stderr
// message to block. A hook that cannot read its input or hits an unexpected error fails open (exit 0).
const fs = require('fs'),
  os = require('os'),
  path = require('path');

const HOOK_DIR = __dirname;
const LOG_FILE = process.env.HOOK_LOG_FILE || path.join(HOOK_DIR, 'hook-log.txt');
const LOG_LIMIT_LINES = 400;

function readInput() {
  try {
    return JSON.parse(fs.readFileSync(0, 'utf8'));
  } catch (error) {
    return {};
  }
}

function projectDir(input) {
  return process.env.CLAUDE_PROJECT_DIR || (input && input.cwd) || process.cwd();
}

// The path of a file relative to the project root, with forward slashes; null when it lies outside the project.
function relativePath(input, filePath) {
  if (!filePath) return null;
  const root = projectDir(input);
  const relative = path.relative(root, path.resolve(root, filePath));
  if (relative.startsWith('..') || path.isAbsolute(relative)) return null;
  return relative.split(path.sep).join('/');
}

// One line per fire or block, newest last, trimmed to the last LOG_LIMIT_LINES lines. Never throws.
function logEvent(hookName, outcome, detail) {
  try {
    const stamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const line = [stamp, hookName, outcome, detail || ''].join(' | ') + '\n';
    let existing = '';
    try {
      existing = fs.readFileSync(LOG_FILE, 'utf8');
    } catch (error) {
      existing = '';
    }
    const kept = (existing + line).split('\n').filter(Boolean).slice(-LOG_LIMIT_LINES);
    fs.writeFileSync(LOG_FILE, kept.join('\n') + '\n');
  } catch (error) {
    // logging must never break a hook
  }
}

function stateDir() {
  return process.env.HOOK_STATE_DIR || path.join(os.tmpdir(), 'pokesurvivor-hooks');
}

// True the first time a key is seen in a session, false after. Used so a rule is injected once per session.
function firstTimeThisSession(sessionId, key) {
  try {
    const directory = stateDir();
    fs.mkdirSync(directory, { recursive: true });
    const marker = path.join(directory, String(sessionId || 'nosession').replace(/[^\w-]/g, '_') + '__' + key);
    if (fs.existsSync(marker)) return false;
    fs.writeFileSync(marker, '1');
    return true;
  } catch (error) {
    return true;
  }
}

// Adds text to the assistant's context for the event (PreToolUse, UserPromptSubmit, PostToolUse).
function addContext(eventName, text) {
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: eventName, additionalContext: text } }));
}

// Text over the limit is cut at a line break and ends with a note naming the section to read on from in fullTextFile.
function cutWithNote(text, limit, fullTextFile) {
  if (text.length <= limit) return text;
  const headingsIn = (part) => part.split('\n').filter((line) => line.startsWith('## '));
  const noteFrom = (place) =>
    '\n\n[TRUNCATED: read the rest in ' + fullTextFile + ', from "' + place + '" onward, before relaying this.]';
  const longestNote = Math.max(...['the start', ...headingsIn(text)].map((place) => noteFrom(place).length));
  const kept = text.slice(0, text.lastIndexOf('\n', limit - longestNote));
  return kept + noteFrom(headingsIn(kept).pop() || 'the start');
}

function blockWith(message) {
  process.stderr.write(message + '\n');
  process.exit(2);
}

// True when the transcript holds a Skill tool call for the named skill (plugin prefix allowed: "x:name").
function skillWasLoaded(transcriptPath, skillName) {
  if (!transcriptPath) return true; // cannot check: fail open
  let text;
  try {
    text = fs.readFileSync(transcriptPath, 'utf8');
  } catch (error) {
    return true;
  }
  for (const line of text.split('\n')) {
    if (!line.includes(skillName)) continue;
    let entry;
    try {
      entry = JSON.parse(line);
    } catch (error) {
      continue;
    }
    const content = entry && entry.message && entry.message.content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      const skill = part && part.type === 'tool_use' && part.name === 'Skill' && part.input && part.input.skill;
      if (skill && (skill === skillName || skill.endsWith(':' + skillName))) return true;
    }
  }
  return false;
}

module.exports = {
  HOOK_DIR,
  LOG_FILE,
  readInput,
  projectDir,
  relativePath,
  logEvent,
  firstTimeThisSession,
  addContext,
  cutWithNote,
  blockWith,
  skillWasLoaded,
};
