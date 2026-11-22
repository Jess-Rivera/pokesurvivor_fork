// .claude/hooks offline checks (Node only). Usage from the repo root:  node docs/proposals/hooks-harness.js .
// Runs each project hook as a child process with sample stdin, the way Claude Code does, against a throwaway state dir and log.
// Relations, not values: each case asserts the exit code and whether the hook spoke, never a copy of the hook's own output.
const fs = require('fs'),
  os = require('os'),
  path = require('path'),
  cp = require('child_process');
const root = path.resolve(process.argv[2] || '.');
const hookPath = (name) => path.join(root, '.claude', 'hooks', name);
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'hooks-harness-'));
let fail = 0;
const bad = (message) => {
  fail++;
  console.log('FAIL', message);
};

const transcriptWithSkill = path.join(scratch, 'with-skill.jsonl');
const transcriptWithoutSkill = path.join(scratch, 'without-skill.jsonl');
const toolUse = (skill) => ({ type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Skill', input: { skill } }] } });
fs.writeFileSync(transcriptWithSkill, JSON.stringify(toolUse('coding-principles')) + '\n');
// A line that only MENTIONS the skill (a skill listing) must not count as loading it.
fs.writeFileSync(transcriptWithoutSkill, JSON.stringify({ type: 'user', message: { content: 'skills: coding-principles, grilling' } }) + '\n');

let sessionCounter = 0;
function run(hookName, input, options = {}) {
  const result = cp.spawnSync('node', [hookPath(hookName)], {
    input: JSON.stringify(input),
    encoding: 'utf8',
    env: {
      ...process.env,
      CLAUDE_PROJECT_DIR: options.projectDir || root,
      HOOK_STATE_DIR: path.join(scratch, 'state'),
      HOOK_LOG_FILE: path.join(scratch, 'hook-log.txt'),
    },
  });
  return { code: result.status, out: result.stdout || '', err: result.stderr || '' };
}
const editInput = (filePath, session, transcript, extra = {}) => ({
  session_id: session,
  transcript_path: transcript,
  tool_name: 'Edit',
  tool_input: { file_path: path.join(root, filePath), old_string: 'a', new_string: 'b', ...extra },
});
const newSession = () => 'session-' + ++sessionCounter;

// inject-rules: which rules fire for which path, the once-per-session rule, the exemption and the no-match control.
{
  const session = newSession();
  const first = run('inject-rules.js', editInput('js/ui/menu.js', session, transcriptWithSkill));
  if (first.code !== 0) bad('ui file with the skill loaded is allowed');
  if (!first.out.includes('[rule:game-code]') || !first.out.includes('[rule:ui]')) bad('a js/ui file gets both the game-code and ui rules (overlap)');
  const second = run('inject-rules.js', editInput('js/ui/menu.js', session, transcriptWithSkill));
  if (second.out.trim() !== '') bad('the same rules are not injected twice in one session');
  const other = run('inject-rules.js', editInput('js/ui/pause-menu.js', session, transcriptWithSkill));
  if (other.out.trim() !== '') bad('a second UI file in the same session adds nothing new');
}
{
  const blocked = run('inject-rules.js', editInput('js/systems/spawner.js', newSession(), transcriptWithoutSkill));
  if (blocked.code !== 2 || !/coding-principles/.test(blocked.err)) bad('game code without the skill loaded is blocked with a message');
  if (blocked.out.trim() !== '') bad('a blocked edit injects no rule text');
  const mention = run('inject-rules.js', editInput('dev.html', newSession(), transcriptWithoutSkill));
  if (mention.code !== 2) bad('a transcript that only mentions the skill does not count as loading it');
}
{
  const changelog = run('inject-rules.js', editInput('js/data/changelog.js', newSession(), transcriptWithoutSkill));
  if (changelog.code !== 0 || changelog.out.trim() !== '') bad('changelog.js is exempt: no gate, no injection');
  const data = run('inject-rules.js', editInput('js/data/drops.js', newSession(), transcriptWithSkill));
  if (!data.out.includes('[rule:data]')) bad('a data file gets the data rule');
  const lang = run('inject-rules.js', editInput('js/data/lang-en.js', newSession(), transcriptWithSkill));
  if (!lang.out.includes('[rule:lang-en]') || !lang.out.includes('[rule:data]')) bad('lang-en.js gets the lang-en rule and the data rule');
  const moves = run('inject-rules.js', editInput('js/systems/move-sim.js', newSession(), transcriptWithSkill));
  if (!moves.out.includes('[rule:moves]')) bad('a move runtime file gets the moves rule');
  const moveData = run('inject-rules.js', editInput('js/data/moves.js', newSession(), transcriptWithSkill));
  if (!moveData.out.includes('[rule:moves]')) bad('a move data file gets the moves rule');
}
{
  const toolsBlocked = run('inject-rules.js', editInput('tools/check.js', newSession(), transcriptWithoutSkill));
  if (toolsBlocked.code !== 2) bad('a tools script is gated on the skill too');
  const tools = run('inject-rules.js', editInput('tools/check.js', newSession(), transcriptWithSkill));
  if (!tools.out.includes('[rule:tools]') || tools.out.includes('[rule:game-code]')) bad('a tools script gets only the tools rule');
  const decision = run('inject-rules.js', editInput('docs/decisions/2026-11-22-x.md', newSession(), transcriptWithoutSkill));
  if (decision.code !== 0 || !decision.out.includes('[rule:decisions]')) bad('a decision file gets its rule and needs no skill');
  const plain = run('inject-rules.js', editInput('TODO.md', newSession(), transcriptWithoutSkill));
  if (plain.code !== 0 || plain.out.trim() !== '') bad('a path with no rule stays silent (control)');
}

// style-guard: adds block, edits that keep or remove an existing em-dash pass.
{
  const dash = String.fromCharCode(8212);
  const add = run('style-guard.js', editInput('TODO.md', newSession(), null, { old_string: 'a', new_string: 'a ' + dash + ' b' }));
  if (add.code !== 2 || !/em-dash/.test(add.err)) bad('an edit that adds an em-dash is blocked with a message');
  const keep = run('style-guard.js', editInput('TODO.md', newSession(), null, { old_string: 'x ' + dash, new_string: 'y ' + dash }));
  if (keep.code !== 0) bad('an edit that keeps an existing em-dash is allowed');
  const remove = run('style-guard.js', editInput('TODO.md', newSession(), null, { old_string: 'x ' + dash, new_string: 'x,' }));
  if (remove.code !== 0) bad('an edit that removes an em-dash is allowed');
  const writeOutside = run('style-guard.js', {
    session_id: newSession(),
    tool_name: 'Write',
    tool_input: { file_path: path.join(scratch, 'new-file.md'), content: 'a ' + dash + ' b' },
  });
  if (writeOutside.code !== 0) bad('a path outside the project is not judged');
  const writeNew = run('style-guard.js', {
    session_id: newSession(),
    tool_name: 'Write',
    tool_input: { file_path: path.join(root, 'zz-new-file-for-harness.md'), content: 'a ' + dash + ' b' },
  });
  if (writeNew.code !== 2) bad('a new file with an em-dash is blocked');
}

// heavy-read-guard: whole-file reads of big files block; ranges, images and ordinary files pass.
{
  const read = (filePath, extra = {}) => run('heavy-read-guard.js', { tool_name: 'Read', tool_input: { file_path: path.join(root, filePath), ...extra } });
  if (read('DEVLOG.md').code !== 2) bad('a whole-file read of DEVLOG.md is blocked');
  if (read('BALANCE.md').code !== 2) bad('a whole-file read of BALANCE.md is blocked');
  if (read('js/data/pokedex.js').code !== 2) bad('a whole-file read of a generated data file is blocked');
  if (read('DEVLOG.md', { limit: 40 }).code !== 0) bad('a read with a limit goes through');
  if (read('DEVLOG.md', { offset: 10 }).code !== 0) bad('a read with an offset goes through');
  if (read('assets/anything.png').code !== 0) bad('an image under assets is readable');
  if (read('CONTEXT.md').code !== 0) bad('an ordinary file is readable');
}

// catchup-trigger: only a catch-up prompt runs the script.
{
  const other = run('catchup-trigger.js', { session_id: newSession(), prompt: 'catching up on sleep, can you check the harness' });
  if (other.out.trim() !== '') bad('a prompt that is not a catch-up request adds nothing');
  const triggered = run('catchup-trigger.js', { session_id: newSession(), prompt: 'catch me up' });
  let parsed = null;
  try {
    parsed = JSON.parse(triggered.out);
  } catch (error) {
    parsed = null;
  }
  if (!parsed || !parsed.hookSpecificOutput || !/Catch-up run:/.test(parsed.hookSpecificOutput.additionalContext)) bad('"catch me up" hands the briefing to the assistant');
  if (parsed && parsed.hookSpecificOutput.hookEventName !== 'UserPromptSubmit') bad('the catch-up context names its event');
}

// doc-size: STATE.md over 3 KB reports, under 3 KB stays silent.
{
  const projectDir = path.join(scratch, 'project');
  fs.mkdirSync(projectDir, { recursive: true });
  const postWrite = (bytes) => {
    fs.writeFileSync(path.join(projectDir, 'STATE.md'), 'x'.repeat(bytes));
    return run('doc-size.js', { tool_name: 'Write', tool_input: { file_path: path.join(projectDir, 'STATE.md') } }, { projectDir });
  };
  if (postWrite(4000).code !== 2) bad('STATE.md over 3 KB is reported');
  if (postWrite(1000).code !== 0) bad('STATE.md under 3 KB is silent');
}

fs.rmSync(scratch, { recursive: true, force: true });
console.log(fail ? fail + ' FAILED' : 'hooks harness: all passed');
process.exit(fail ? 1 : 0);
