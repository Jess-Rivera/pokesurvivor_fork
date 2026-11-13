---
name: writing-check
description: Check and edit human-facing prose so it reads plainly and not like AI output. Use when writing or revising changelog entries, issue and comment drafts, commit messages, PR descriptions, DEVLOG, STATE, TODO, decision files or other docs, and when Jess asks to "check the writing", "de-AI this", or "proofread".
---

<!-- Adapted from the "writing" skill in iliaal/ai-skills (MIT license, a mirror of the whetstone plugin), rewritten
in our own words for this repo on 2026-11-13. Changes: the vocabulary and pattern lists are condensed into this file,
this repo's surfaces and formats are added (changelog, commits, issues, DEVLOG, decisions), the scoring rubric and the
README and publishing rules are dropped, and CLAUDE.md prose rules are binding. Source:
https://github.com/iliaal/ai-skills/tree/master/skills/writing -->

# Writing check

Make human-facing prose plain and specific while keeping its meaning, facts, numbers and degree of certainty exactly
as they were. CLAUDE.md wins wherever this file differs.

## Modes
- Edit (default): return the corrected text only. No list of changes unless asked, and never inside the delivered
  text (a commit body or issue comment saying "tightened wording" is itself the tell).
- Check: when asked to flag without rewriting, quote each problem line, name the pattern, give the fix in a few
  words, and stop.
- Proofread: when asked to proofread, or to fix one named span, fix clear errors in that span only.

## Not for
- Machine-facing text (skill files, tool descriptions, harness messages). Those need precise specification
  language, not conversational voice.
- Code, identifiers, file paths, issue numbers, cross-document IDs and inherited Spanish strings. Leave them exactly
  as written.

## Hard rules (CLAUDE.md, always)
- No em-dashes, anywhere. Restructure the sentence: split it, or use a comma, parentheses, "since" or "because". Do
  not swap the dash for a semicolon mechanically.
- Cross-document IDs keep their defining file's prefix (CLAUDE.md "Cross-document IDs").
- Respect each doc's size budget: DEVLOG about 6 lines per entry, a decision about 10 lines, STATE under 3 KB.

## Core habits
- Lead with the concrete fact or result. Name the actor (Jess, the spawner, the leader AI), use active voice, give
  the number.
- Plain words: "use" not "utilize", "start" not "initiate", "because" not "due to the fact that", "to" not "in
  order to".
- One name per thing. Use the GLOSSARY.md term and do not rotate synonyms.
- Keep hedges exactly as strong as the source. Dropping "probably" changes the claim.
- Cut empty intensifiers. Keep adverbs that carry degree or mechanism.

## Patterns to remove
Vocabulary to flag, then judge in context (a technical use can be legitimate): delve, crucial, pivotal, foster,
leverage, robust, seamless, enhance, showcase, underscore, testament, tapestry, landscape, multifaceted, interplay,
cutting-edge, groundbreaking, game-changer, transformative, and Moreover, Furthermore or Additionally opening a
sentence.

Structures, which matter more than words:
- Forced groups of three.
- "It's not X, it's Y" or "Not X. But Y." State Y.
- Trailing -ing tails ("ensuring stability", "highlighting the change").
- "serves as", "stands as" or "boasts" where "is" or "has" would do.
- Colon reveals ("The best part: it works"). Write a plain sentence and keep colons for lists and labels.
- A closing line that turns the point into a slogan or metaphor. Delete it and end on the last concrete sentence.
- Idioms standing in for a literal phrase ("does the heavy lifting", "earns its keep").
- Signposts and meta lines ("In this section", "Let me walk you through", "Here's the thing").
- Process narration about how the time was spent ("First I checked X, then reran Y"). Keep the finding.
- Bare tallies with no decision attached ("resolved 11 items"). Say what was decided. Counts that are the evidence
  (checks passed, harness results) stay, exact.
- Sweeping absolutes (always, never, every) where a specific claim is true.
- Sycophantic openers and closers ("Great question", "I hope this helps").
- Bold on every other phrase, or every bullet opening with a bold label when plain bullets would do.

## Repo surfaces
- Changelog (js/data/changelog.js): player-facing English, one short line per change under new, chg or fix. Say
  what the player sees, not which code changed. The file must still parse after the edit (CLAUDE.md changelog rule).
- Commit messages: an imperative subject of about 72 characters or fewer, a blank line, then a short body with what
  changed, why, and which issues it touches. No Co-Authored-By line and no AI signature.
- Issues and comments: a clear title, a concrete "Done when" condition, numbers and file names over adjectives. No
  AI disclaimer.
- DEVLOG, STATE, TODO: what changed, what was decided, what broke, where we stopped. No story of the session.
- New in-game English strings: short and plain, matching the tone of nearby strings.

## Verify
Read the result once as Jess would. Meaning, facts, numbers and certainty are unchanged, and the edit is
proportional: a sentence that was already fine stays as it was.
