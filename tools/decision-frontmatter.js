// tools/decision-frontmatter.js: the front matter every file in docs/decisions/ carries, so decisions can be searched by
// field (grep "^area: gyms", "^issues: .*139"). One module for the writer, the write-time hook and tools/check.js.
//
// Shape (the first lines of the file):
//   ---
//   title: "the decision's heading text"
//   date: 2026-11-22          (same as the file name's date)
//   issues: [139, 163]        (empty list when the decision has no issue)
//   area: engine              (one of AREAS, the same words as the board's area: labels)
//   canonical: "the spec that holds the rule"
//   ---
const AREAS = ['moves', 'gyms', 'enemies', 'items', 'ui', 'engine', 'docs'];
const REQUIRED_KEYS = ['title', 'date', 'issues', 'area', 'canonical'];
const FRONT_MATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---(\r?\n|$)/;

// Parses the front matter of a file's text. Returns { fields, body } or null when the file has none.
function parse(text) {
  const found = FRONT_MATTER_PATTERN.exec(text);
  if (!found) return null;
  const fields = {};
  for (const line of found[1].split(/\r?\n/)) {
    const pair = /^([a-z]+):\s*(.*)$/.exec(line);
    if (pair) fields[pair[1]] = pair[2].trim();
  }
  return { fields, body: text.slice(found[0].length) };
}

const unquote = (value) => {
  if (!/^".*"$/.test(value)) return value;
  try {
    return JSON.parse(value);
  } catch (error) {
    return value.slice(1, -1);
  }
};

// Lists what is wrong with a decision file's text (an empty list means valid). fileName is optional; when given, the
// date must match the date the file name starts with.
function problems(text, fileName) {
  const parsed = parse(text);
  if (!parsed) return ['no front matter block at the top of the file (---, five fields, ---)'];
  const { fields } = parsed;
  const list = [];
  for (const key of REQUIRED_KEYS) if (!(key in fields)) list.push('missing field: ' + key);
  if ('title' in fields && !unquote(fields.title)) list.push('title is empty');
  if ('canonical' in fields && !unquote(fields.canonical))
    list.push('canonical is empty (name the spec that holds the rule)');
  if ('date' in fields) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fields.date)) list.push('date must look like 2026-11-22');
    else if (fileName && !fileName.startsWith(fields.date))
      list.push('date ' + fields.date + ' does not match the file name');
  }
  if ('issues' in fields && !/^\[\s*(\d+\s*(,\s*\d+\s*)*)?\]$/.test(fields.issues))
    list.push('issues must be a list of numbers, like [139, 163] or []');
  if ('area' in fields && !AREAS.includes(fields.area)) list.push('area must be one of: ' + AREAS.join(', '));
  return list;
}

// Builds the front matter block text for the given fields (issues is an array of numbers).
function build({ title, date, issues, area, canonical }, lineEnding = '\n') {
  return (
    [
      '---',
      'title: ' + JSON.stringify(title),
      'date: ' + date,
      'issues: [' + issues.join(', ') + ']',
      'area: ' + area,
      'canonical: ' + JSON.stringify(canonical),
      '---',
    ].join(lineEnding) + lineEnding
  );
}

module.exports = { AREAS, REQUIRED_KEYS, parse, problems, build };
