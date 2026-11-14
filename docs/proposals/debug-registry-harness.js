// docs/proposals/debug-registry-harness.js: G.Debug is whole after debug.js is split into several files (F6,
// docs/ASCII Concept Maps/F6 - Debug Split Plan.md). Node only; tools/check.js runs it.
// Usage from the repo root:  node docs/proposals/debug-registry-harness.js
// Loads the real js/core/debug.js and every js/core/debug-*.js file in dev.html order, without ?dev, against a bare G.
// Checks, all relations read from the files themselves (no list of command names is written here):
//   (1) every command a file's header documents as G.Debug.<name> is a function on G.Debug (G.Debug.on is the flag);
//   (2) no file overwrites a name an earlier file already put on G.Debug;
//   (3) without ?dev, every command a later file adds returns without touching the game (it reads no G module).
// Prints only failures, then one summary line.
const fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const root = path.resolve(__dirname, '../..');

let failures = 0,
  checks = 0;
const ok = (condition, message) => {
  checks++;
  if (!condition) {
    failures++;
    console.log('FAIL  ' + message);
  }
};

/** The debug files in dev.html order: debug.js first, then each debug-*.js script it loads. */
function debugFilesInLoadOrder() {
  const dev = fs.readFileSync(path.join(root, 'dev.html'), 'utf8');
  const debugScript = /<script defer src="(js\/core\/debug(?:-[\w-]+)?\.js)"><\/script>/g;
  return [...dev.matchAll(debugScript)].map((match) => match[1]);
}
const files = debugFilesInLoadOrder();
ok(
  files[0] === 'js/core/debug.js' && files.length > 1,
  'dev.html loads debug.js, then its split files: ' + files.join(', ')
);

/** The names a file's header comment documents as G.Debug.<name>. */
function documentedNames(source) {
  const header = (source.match(/^\/\*[\s\S]*?\*\//) || [''])[0];
  return [...new Set([...header.matchAll(/G\.Debug\.(\w+)/g)].map((match) => match[1]))];
}

// a page with no ?dev; console output is swallowed, a key listener is never needed (the hotkey is ?dev only)
const quietConsole = { log() {}, warn() {}, error() {}, info() {} };
const sandbox = vm.createContext({
  G: {},
  console: quietConsole,
  location: { search: '' },
  addEventListener() {},
  document: {},
});
sandbox.window = sandbox;

const addedBy = {};
for (const file of files) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  const before = Object.assign({}, sandbox.G.Debug || {});
  try {
    vm.runInContext(source, sandbox, { filename: file });
  } catch (error) {
    ok(false, file + ': threw while loading: ' + error.message);
    continue;
  }
  const debug = sandbox.G.Debug || {};
  // (2) no overwrite
  const overwritten = Object.keys(before).filter((name) => debug[name] !== before[name]);
  ok(!overwritten.length, file + ': overwrites ' + overwritten.join(', ') + ' (another file already holds it)');
  addedBy[file] = Object.keys(debug).filter((name) => !(name in before));
  // (1) documented means present
  const missing = documentedNames(source).filter((name) => name !== 'on' && typeof debug[name] !== 'function');
  ok(!missing.length, file + ': documents G.Debug.' + missing.join(', G.Debug.') + ' but it is not on G.Debug');
}
ok(sandbox.G.Debug && sandbox.G.Debug.on === false, 'G.Debug.on is false without ?dev');

// (3) without ?dev, the split files' commands touch nothing: any G module read past G.Debug fails it
const touched = [];
const realG = sandbox.G;
sandbox.G = new Proxy(realG, {
  get(target, key) {
    if (key !== 'Debug') touched.push(String(key));
    return target[key];
  },
});
for (const file of files.slice(1)) {
  for (const name of addedBy[file] || []) {
    touched.length = 0;
    let result;
    try {
      result = realG.Debug[name]();
    } catch (error) {
      ok(false, file + ': G.Debug.' + name + '() threw without ?dev: ' + error.message);
      continue;
    }
    ok(!touched.length, file + ': G.Debug.' + name + '() read G.' + touched.join(', G.') + ' without ?dev');
    ok(!result, file + ': G.Debug.' + name + '() returned ' + JSON.stringify(result) + ' without ?dev');
  }
}
sandbox.G = realG;

const added = files.slice(1).reduce((sum, file) => sum + (addedBy[file] || []).length, 0);
const summary = files.length + ' files, ' + added + ' split commands, ' + checks + ' checks';
const verdict = failures ? 'debug-registry-harness: ' + failures + ' FAILED' : 'debug-registry-harness: ok';
console.log(verdict + ' (' + summary + ')');
process.exit(failures ? 1 : 0);
