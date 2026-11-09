---
name: grilling
description: Grill the user relentlessly about a plan, decision, or idea. Use when the user wants to stress-test their thinking, or uses any 'grill' trigger phrases.
---

<!-- Adapted from mattpocock/skills (landing-skills/grilling, the untouched original). Local changes: the round
format block is replaced by a pointer, and the "This repo" section at the end overrides the rest where they differ. -->

Interview the user relentlessly until you reach a shared understanding. Map this as a **design tree**: every decision branches into the decisions that hang off it.

Work the tree in **rounds**. The **frontier** is every decision whose prerequisites are already settled: the questions you can ask _now_ without guessing at answers you haven't heard yet. Ask the frontier in one round, each question with your recommended answer. Then wait for the user's answers before the next round. Format: see "This repo" below.

Word each question so "yes" accepts your recommended answer.

Each round the user answers reshapes the tree: settled decisions push the frontier outward and unblock questions that depended on them. Recompute the frontier and ask the next round. A question whose answer depends on another question still open in this round belongs to a _later_ round, not this one.

Finding _facts_ is your job, never the user's. When a frontier question needs a fact from the environment (filesystem, tools, etc.), find it rather than asking the user. Don't block on it: a running exploration is an unsettled prerequisite, so only the questions downstream of it wait; ask the rest of the frontier now. The _decisions_ are the user's: put each to them and wait.

The session is done when the frontier is empty: every branch of the design tree visited, nothing left silently assumed. Do not act on it until the user confirms you have reached a shared understanding.

## This repo

These rules win over the text above wherever they differ.

**Opening (before round 1, Jess 2026-11-09).** Every grilling session starts from the user's high-level overview of the topic, never from questions.
1. Get the overview. If the user sent one with the grilling prompt, use it. Otherwise ask for it in one short message and wait, unless the conversation already gives you a good grasp of the topic (then say so and go to step 2).
2. Play it back: give your understanding of the high-level overview in a few lines (the goal, what is in and out of scope, the constraints you see), then the biggest frontiers, meaning the top branches of the design tree, each in one line with why it matters. Flag anything in the overview you read as ambiguous.
3. Then start round 1 from that overview and those frontiers. If the user corrects the play-back, take the correction first and recompute the frontiers before asking.

**Format.** Ask each round as plain text in chat, never as emoji-marked text, and do not use the AskUserQuestion tool for rounds of more than 4 questions (it needs one call per 4 questions, which costs more turns). A round looks like:

Round N

1. **Short title**: the question, one or two sentences.
   a) Option (Recommended)
   b) Option
   c) Option

2. ...

End every round with one line: "Reply with answers ('1 a, 2 b'), 'all yes' to accept every recommendation, 'good enough' to stop, or 'keep going' for another round." A reply may mix a letter, free text, and "rest yes". For a round of 4 questions or fewer, AskUserQuestion is fine and preferred, since clicking beats typing. No emoji.

**Round cap.** Default is 2 rounds, then summarize. Round 1 holds up to 10 questions and later rounds up to 8 (the most upstream first, the rest wait for the next round). There is no stop/continue question: the user decides by saying "good enough" or "keep going". A round beyond 2 happens only when the user asks for it ("keep going", "we need more", "grill me"). After round 2, stop and ask nothing further unless they ask for more; end with the wrap-up below.

**Facts.** Search the repo yourself first, following CLAUDE.md "Efficient repository exploration". Use a sub-agent only when a single grep or read would not answer it (a broad sweep across many files). Sub-agents cost the user; do not spawn them for lookups you can do in one or two tool calls.

**Unsure answers.** If the user is unsure, tag it `[Open]` and mark any dependent work blocked on that decision. Never assume the answer.

**Local-first.** If a branch of the tree drifts into Firebase, cloud saves, or the multiplayer stack, flag it and do not grill further down that branch (CLAUDE.md "Local-first").

**Wrap-up.** When the grilling ends, list what was settled, each with its requirement tag (`[Approved]` for confirmed answers, `[Open]` for unsure ones, `[Proposed]` for recommendations the user did not confirm). Name where each belongs: DECISIONS.md (a ruling, ~10 lines), a GitHub issue (a task), or the relevant spec. Draft these in chat and write nothing until the user says OK. Rulings go in DECISIONS.md (docs/decisions/ after the split slice); new or changed game terms go in GLOSSARY.md, updated inline once the user resolves them.
