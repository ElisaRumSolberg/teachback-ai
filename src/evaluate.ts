import { getRubric } from "./rubrics.js";
import { SYSTEM_PROMPT, buildUserPrompt } from "./prompt.js";
import { callLLM } from "./provider.js";
import { TeachBackEvaluation, type TeachBackEvaluation as TeachBackEvaluationT } from "./schema.js";

export interface EvaluateInput {
  topic: string;
  explanation: string;
  confidence: number;
}

function extractJson(raw: string): unknown {
  // Models sometimes wrap JSON in ```json fences despite instructions not to.
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const text = fenced ? fenced[1] : raw;
  return JSON.parse(text);
}

/**
 * Evaluates a student's explanation of `topic` against the fixed rubric for that topic.
 * Validates the model's output against the schema and retries once with the parse
 * error fed back to the model if the first response doesn't conform.
 */
export async function evaluate(input: EvaluateInput): Promise<TeachBackEvaluationT> {
  const { topic, explanation, confidence } = input;

  if (confidence < 0 || confidence > 100 || !Number.isFinite(confidence)) {
    throw new Error("confidence must be a number between 0 and 100.");
  }
  if (!explanation || !explanation.trim()) {
    throw new Error("explanation must not be empty.");
  }

  const rubric = getRubric(topic);
  const userPrompt = buildUserPrompt({ rubric, explanation, confidence });

  let lastError: string | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    const prompt =
      attempt === 0
        ? userPrompt
        : `${userPrompt}\n\nYour previous response was invalid: ${lastError}\nReturn ONLY the corrected JSON object, matching the schema exactly.`;

    const raw = await callLLM(SYSTEM_PROMPT, prompt);

    try {
      const parsed = extractJson(raw);
      const result = TeachBackEvaluation.parse(parsed);

      if (result.concepts.length !== rubric.required_concepts.length) {
        lastError = `Expected exactly ${rubric.required_concepts.length} concepts (one per required concept), got ${result.concepts.length}.`;
        continue;
      }

      return result;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }

  throw new Error(`Model did not return a valid evaluation after retry. Last error: ${lastError}`);
}
