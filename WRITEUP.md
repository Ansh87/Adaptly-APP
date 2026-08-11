# SATGene: One-Page Write-Up

**Live demo:** https://satgene.netlify.app/ (click "Try Demo Student," no signup needed)
**Repo:** https://github.com/Ansh87/SATgene-APP

## The problem

Good SAT tutoring works because a tutor constantly watches a student, notices exactly
where they're stuck, and adjusts what to practice next. That kind of attention is
expensive and rare. The students who'd benefit most from it, at underserved schools
with no test-prep budget, are the least likely to get it. What they get instead is
either nothing, or generic practice sets that don't know what they, specifically,
keep getting wrong. SATGene builds the diagnosing-and-adjusting part of a tutor as
software, so it costs nothing to access and never runs out of patience.

## How the agent works

SATGene follows one loop: **Results, Diagnose, Practice, Measure, Adapt.**

1. **Results.** A student logs SAT/practice scores and mistakes (or the agent reads
   answers from adaptive practice sessions directly).
2. **Diagnose.** A deterministic engine (`src/agent.js`, no AI, fully unit-testable)
   turns that evidence into a mastery score (0 to 100, or "Not assessed" until there's
   real evidence) for each of 8 SAT skill areas, then ranks them with a weighted
   priority formula: mastery weakness, recent mistakes, incorrect-answer rate,
   confidence, recency, and time pressure to the test date.
3. **Decide.** The top-ranked skill becomes the **Next Best Action**, a specific
   recommendation with a data-grounded reason ("2 of your last 2 Math mistakes were
   in Advanced Math"), not a generic suggestion.
4. **Practice.** The student practices that exact skill in an adaptive question set
   (original, SATGene-authored questions, never copied from College Board or any
   vendor) that gets harder or easier based on each answer. When they're stuck, a
   4-level Socratic "Guide Me" walks them toward the answer without just giving it
   away; an "Explain differently" option calls an AI tutor for a second explanation,
   with an instant, non-AI fallback if that call fails.
5. **Measure and adapt.** Every answer updates mastery immediately. The next time the
   student opens the app, the agent has already re-diagnosed on its own: "SATGene
   Noticed" surfaces what changed, and "Why did my plan change?" explains the new
   priority in plain language. Nothing here requires the student to press "regenerate."

This is deliberately not a chatbot. A chatbot answers what it's asked. SATGene decides
what to work on without being asked, and the decision is grounded in the student's own
logged evidence, never invented. A skill with no direct practice evidence stays labeled
"Not assessed" rather than showing a fabricated percentage.

## Impact for underserved schools

- **Works with zero AI cost.** Every decision the agent makes, mastery, priority,
  next action, mission, re-diagnosis, runs as plain deterministic logic. The two
  optional AI touches (a richer plan narrative, an alternate tutor explanation) have
  built-in non-AI fallbacks, so a school with no API budget still gets a fully
  functioning adaptive tutor.
- **No content paywall.** Adaptive practice uses SATGene's own original question bank;
  everything else routes to free official resources (Bluebook, the Student Question
  Bank, Khan Academy) before ever mentioning a paid vendor.
- **No barrier to try it.** Demo Student mode gives any student the complete
  experience with realistic sample data in one click. No account, no setup, nothing
  saved.
- **Built to be usable by everyone.** Keyboard navigation, live-region announcements
  for dynamic updates, and no color-only signaling throughout.

## What's next

Weekly reminder scheduling, expanding the original question bank's skill coverage,
and a lightweight teacher/counselor view so a school can see aggregate weak areas
across a whole class without ever seeing individual student mistakes.
