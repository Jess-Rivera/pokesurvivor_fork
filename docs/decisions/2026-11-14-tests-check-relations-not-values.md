---
title: "tests check relations, not values (Jess)"
date: 2026-11-14
issues: []
area: engine
canonical: "docs/TEST-FIRST.md, The cycle, step 3."
---
# 2026-11-14, tests check relations, not values (Jess)

A check compares outputs the code produces with each other: parity with your path, a setting doing what its name says on
made-up inputs, wiring, and the validator's shape. No expected number is written into a test, and no check takes tuning
data as its expectation. Why: today's checks broke on every retune with nothing wrong (Misty's card count, her 2100 HP,
the 16f picks re-worked by hand for each new weight). How a leader reads in play stays Jess's feel test. New and touched
checks follow it now (16f, Misty's step B check); the rest are converted harness by harness under the sweep issue.
The Move review rule (CLAUDE.md) follows it too: a move intent scenario checks relations read from its MOVE-INTENT entry.

Canonical: docs/TEST-FIRST.md, The cycle, step 3.
