import { evaluate } from "../src/evaluate.js";
import { CASES } from "./cases.js";

const RUNS = Number(process.env.CONSISTENCY_RUNS || 5);
const SCORE_RANGE_THRESHOLD = 10; // max acceptable (max-min) score spread across identical runs
// Case IDs to stress-test for consistency. Default covers the demo case (BS-02)
// plus one case per topic; override with CONSISTENCY_CASES="BS-02,REC-02".
const caseIds = (process.env.CONSISTENCY_CASES || "BS-02,REC-02,SQL-01").split(",").map((s) => s.trim());

function mode(values: string[]): string {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) || 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

async function main() {
  let anyUnstable = false;

  for (const id of caseIds) {
    const tc = CASES.find((c) => c.id === id);
    if (!tc) {
      console.log(`Unknown case id: ${id}`);
      continue;
    }

    console.log(`\n=== Consistency check: ${tc.id} (${tc.topic}), ${RUNS} runs ===`);
    console.log(`explanation: "${tc.explanation}"`);

    const scores: number[] = [];
    const conceptStatusesByName = new Map<string, string[]>();

    for (let i = 0; i < RUNS; i++) {
      const result = await evaluate({
        topic: tc.topic,
        explanation: tc.explanation,
        confidence: tc.confidence,
      });
      scores.push(result.score);
      for (const c of result.concepts) {
        const list = conceptStatusesByName.get(c.name) || [];
        list.push(c.status);
        conceptStatusesByName.set(c.name, list);
      }
      process.stdout.write(`  run ${i + 1}: score=${result.score}\n`);
    }

    const min = Math.min(...scores);
    const max = Math.max(...scores);
    const range = max - min;
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((a, b) => a + (b - mean) ** 2, 0) / scores.length;
    const stddev = Math.sqrt(variance);

    const unstable = range > SCORE_RANGE_THRESHOLD;
    if (unstable) anyUnstable = true;

    console.log(
      `score: min=${min} max=${max} range=${range} mean=${mean.toFixed(1)} stddev=${stddev.toFixed(1)}  ${
        unstable ? `UNSTABLE (range > ${SCORE_RANGE_THRESHOLD})` : "stable"
      }`
    );

    console.log("concept classification stability:");
    for (const [name, statuses] of conceptStatusesByName) {
      const m = mode(statuses);
      const agreement = statuses.filter((s) => s === m).length / statuses.length;
      const flag = agreement < 0.8 ? "  <-- FLAKY" : "";
      console.log(`  ${name}: ${statuses.join(", ")}  (${Math.round(agreement * 100)}% agree on "${m}")${flag}`);
    }
  }

  if (anyUnstable) {
    console.log("\nSome cases exceeded the score-range threshold. Tighten the rubric/prompt before building UI on top of this.");
    process.exitCode = 1;
  } else {
    console.log("\nAll checked cases were within the acceptable score range across repeated runs.");
  }
}

main();
