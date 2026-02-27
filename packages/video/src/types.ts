import { z } from "zod";

export const ScriptDetailSchema = z.object({
  indicatorName: z.string(),
  status: z.enum(["normal", "high", "low"]),
  explanation: z.string(),
  advice: z.string().optional(),
});

export const VideoScriptSchema = z.object({
  summary: z.string(),
  details: z.array(ScriptDetailSchema),
  suggestions: z.string(),
  outro: z.string(),
});

export const VideoTemplateSchema = z.object({
  script: VideoScriptSchema,
  reportType: z.enum(["BLOOD_ROUTINE", "BIOCHEMISTRY", "PHYSICAL_EXAM"]),
  senderName: z.string(),
  audioSrc: z.string().optional(),
});

export type ScriptDetail = z.infer<typeof ScriptDetailSchema>;
export type VideoScript = z.infer<typeof VideoScriptSchema>;
export type VideoTemplateProps = z.infer<typeof VideoTemplateSchema>;
