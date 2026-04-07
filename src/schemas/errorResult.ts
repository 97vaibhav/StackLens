import { z } from "zod";

export const ErrorResultSchema = z.object({
  summary: z.string().max(200),
  severity: z.enum(["crash", "warning", "silent"]),
  language: z.string().max(50),
  root_cause: z.object({
    file: z.string().max(500).nullable(),
    line: z.number().int().min(0).max(1_000_000).nullable(),
    reason: z.string().max(1000),
  }),
  fix: z.object({
    before: z.string().max(2000),
    after: z.string().max(2000),
    explanation: z.string().max(1000),
  }),
  common_causes: z.array(z.string().max(500)).max(10),
  docs_link: z.string().url().nullable(),
});

export type ErrorResult = z.infer<typeof ErrorResultSchema>;
