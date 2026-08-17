import { z } from "zod";

export const ConceptStatus = z.enum(["understood", "partial", "missing", "misconception"]);

export const ConceptEvaluation = z.object({
  name: z.string(),
  status: ConceptStatus,
  evidence: z.string().nullable(),
  feedback: z.string(),
});

export const Misconception = z.object({
  claim: z.string(),
  correction_needed: z.string(),
});

export const TeachBackEvaluation = z.object({
  topic: z.string(),
  confidence: z.number().min(0).max(100),
  score: z.number().min(0).max(100),
  confidence_gap: z.number(),
  concepts: z.array(ConceptEvaluation),
  misconceptions: z.array(Misconception),
  summary: z.string(),
  next_question: z.string(),
});

export type ConceptStatus = z.infer<typeof ConceptStatus>;
export type ConceptEvaluation = z.infer<typeof ConceptEvaluation>;
export type TeachBackEvaluation = z.infer<typeof TeachBackEvaluation>;
