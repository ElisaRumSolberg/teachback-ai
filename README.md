# TeachBack AI — Evaluation Engine (no UI yet)

Core engine only: given a topic, a student explanation, and a confidence score, calls an
LLM against a fixed rubric and returns structured JSON (score, understood/partial/missing
concepts, misconceptions, a Socratic follow-up question). No frontend, no database — the
goal is to prove the evaluation itself is accurate and consistent before building anything
on top of it.

## Setup

```bash
npm install
cp .env.example .env
# put ONE key in .env: FEATHERLESS_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY, or GEMINI_API_KEY
```

Built for Pixel Forge AI Hackathon: Featherless (sponsor) gives 1 month of API access free via
promo code `PIXELFORGE26` at featherless.ai — sign up, create an API key under Account > API
Keys, put it in `FEATHERLESS_API_KEY`. It's OpenAI-compatible with 40,000+ open models; default
here is `deepseek-ai/DeepSeek-V3.2`, override with `FEATHERLESS_MODEL`.

## Run the API

```bash
npm run server
curl -X POST http://localhost:3000/api/evaluate \
  -H "Content-Type: application/json" \
  -d '{"topic":"Binary Search","confidence":90,"explanation":"Binary search checks the middle value and keeps the half that could contain the target."}'
```

Supported topics right now: `Binary Search`, `Recursion`, `SQL JOINs` (see `src/rubrics.ts`).

## Run the test suite

Runs 14 hand-written cases (correct / partial / wrong / misconception / very-short /
irrelevant / prompt-injection) once each and checks the score lands in the expected range:

```bash
npm run test:suite
```

## Run the consistency check

The more important question for a hackathon MVP: does the SAME explanation get roughly the
SAME score every time? Runs a few cases N times each (default 5) and reports score
min/max/range/stddev plus per-concept classification agreement:

```bash
npm run test:consistency
# or: CONSISTENCY_RUNS=10 CONSISTENCY_CASES="BS-02,REC-04" npm run test:consistency
```

A case is flagged `UNSTABLE` if repeated runs on identical input swing the score by more
than 10 points, and a concept is flagged `FLAKY` if its classification (understood/partial/
missing/misconception) doesn't agree across at least 80% of runs. If you see instability,
fix it here — in the rubric or `src/prompt.ts` — before touching the Knowledge Map UI. A
pretty UI on top of an inconsistent evaluator is worse than no UI: it makes the flakiness
look authoritative.

## Design notes

- **Rubrics are fixed, not model-generated** (`src/rubrics.ts`). The same model that grades
  an explanation should not also invent what it's graded against — that's how you get score
  drift between runs. Concepts per topic are decided once, by us.
- **`evidence` is required per concept.** The model must quote what the student said to
  justify each status, not just assert "understood". This is both a hallucination check and
  future UI content.
- **`temperature: 0`** on every provider call — determinism matters far more than creativity
  here.
- **Prompt-injection resistance is tested** (`REC-05`): the explanation field is treated as
  data to grade, never as instructions, and the system prompt says so explicitly.
- **Schema validation with one retry** (`src/evaluate.ts`): if the model's JSON doesn't
  parse or doesn't match the shape, the error is fed back to the model once before giving up.

## Next steps (only after `test:consistency` looks solid)

1. Wire the Socratic follow-up loop (re-evaluate after the student answers `next_question`).
2. Build the Knowledge Map UI on top of this exact JSON shape — no schema changes needed.
3. Add topics beyond the three seeded here.
