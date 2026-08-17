import { evaluate } from "../src/evaluate.js";
import { CASES } from "./cases.js";

function fmtStatus(s: string): string {
  switch (s) {
    case "understood":
      return "✅";
    case "partial":
      return "🟡";
    case "missing":
      return "🔴";
    case "misconception":
      return "⚠️ ";
    default:
      return s;
  }
}

async function main() {
  let pass = 0;
  let fail = 0;

  for (const tc of CASES) {
    process.stdout.write(`\n=== ${tc.id} (${tc.topic}) ===\n`);
    process.stdout.write(`explanation: "${tc.explanation}"\n`);
    process.stdout.write(`note: ${tc.note}\n`);

    try {
      const result = await evaluate({
        topic: tc.topic,
        explanation: tc.explanation,
        confidence: tc.confidence,
      });

      const [lo, hi] = tc.expectedScoreRange;
      const inRange = result.score >= lo && result.score <= hi;
      if (inRange) pass++;
      else fail++;

      process.stdout.write(
        `score: ${result.score}  (expected ${lo}-${hi})  ${inRange ? "PASS" : "FAIL"}\n`
      );
      process.stdout.write(`confidence_gap: ${result.confidence_gap}\n`);
      for (const c of result.concepts) {
        process.stdout.write(`  ${fmtStatus(c.status)} ${c.name} — ${c.feedback}\n`);
      }
      if (result.misconceptions.length) {
        for (const m of result.misconceptions) {
          process.stdout.write(`  ⚠️  misconception: ${m.claim}\n`);
        }
      }
      process.stdout.write(`next_question: ${result.next_question}\n`);
    } catch (err) {
      fail++;
      process.stdout.write(`ERROR: ${err instanceof Error ? err.message : String(err)}\n`);
    }
  }

  process.stdout.write(`\n\n${pass}/${pass + fail} cases within expected score range.\n`);
  if (fail > 0) process.exitCode = 1;
}

main();
