import { z } from "zod";

export const FeedbackStatusSchema = z.enum([
  "correct",
  "pending",
  "incorrect",
  "failed",
  "completed",
  "incomplete",
]);
export type FeedbackStatus = z.infer<typeof FeedbackStatusSchema>;

const IdString = z.string().min(1).max(128);

// ISO 8601 duration, e.g. "PT1M30S". Mirrors the `duration` format used by
// the OpenAPI contract for completionTime.
const DurationSchema = z
  .string()
  .regex(
    /^P(?!$)(\d+Y)?(\d+M)?(\d+W)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+(\.\d+)?S)?)?$/,
    "must be an ISO 8601 duration",
  );

// Snapshot of the submitted answer plus the solution at grading time (except
// openEnded, which is graded asynchronously elsewhere).
export const AnswerPayloadSchema = z.discriminatedUnion("exerciseType", [
  z.object({
    exerciseType: z.literal("singleChoice"),
    answer: z.string(),
    solution: z.string(),
  }),
  z.object({
    exerciseType: z.literal("multipleChoice"),
    answer: z.array(z.string()),
    solution: z.array(z.string()),
  }),
  z.object({
    exerciseType: z.literal("trueFalse"),
    answer: z.record(z.string(), z.boolean()),
    solution: z.record(z.string(), z.boolean()),
  }),
  z.object({
    exerciseType: z.literal("matching"),
    answer: z.record(z.string(), z.number().int()),
    solution: z.record(z.string(), z.number().int()),
  }),
  z.object({
    exerciseType: z.literal("openEnded"),
    answerFileIds: z.array(IdString),
    feedback: z.string().optional(),
    solution: z.string().optional(),
  }),
]);
export type AnswerPayload = z.infer<typeof AnswerPayloadSchema>;

export const AnswerItemSchema = z.object({
  userId: z.string().min(1),
  exerciseId: IdString,
  id: IdString,
  feedbackStatus: FeedbackStatusSchema,
  points: z.number().min(0),
  submittedAt: z.string(),
  completionTime: DurationSchema,
  answerPayload: AnswerPayloadSchema,
  version: z.number().int().positive(),
});
export interface AnswerItem extends z.infer<typeof AnswerItemSchema> {}

export interface AnswerListItemDto {
  id: string;
  feedbackStatus: FeedbackStatus;
  points: number;
  submittedAt: string;
}

export function toAnswerListItemDto(item: AnswerItem): AnswerListItemDto {
  return {
    id: item.id,
    feedbackStatus: item.feedbackStatus,
    points: item.points,
    submittedAt: item.submittedAt,
  };
}

export interface AnswerDto {
  id: string;
  exerciseId: string;
  exerciseType: z.infer<typeof AnswerPayloadSchema>["exerciseType"];
  feedbackStatus: FeedbackStatus;
  points: number;
  submittedAt: string;
  completionTime: string;
  answer?: string | string[] | Record<string, boolean> | Record<string, number>;
  solution?: string | string[] | Record<string, boolean> | Record<string, number>;
  answerFileIds?: string[];
  feedback?: string;
}

export function toAnswerDto(item: AnswerItem): AnswerDto {
  const payload = item.answerPayload;
  const base = {
    id: item.id,
    exerciseId: item.exerciseId,
    exerciseType: payload.exerciseType,
    feedbackStatus: item.feedbackStatus,
    points: item.points,
    submittedAt: item.submittedAt,
    completionTime: item.completionTime,
  };
  if (payload.exerciseType === "openEnded") {
    return {
      ...base,
      answerFileIds: payload.answerFileIds,
      ...(payload.feedback !== undefined ? { feedback: payload.feedback } : {}),
      ...(payload.solution !== undefined ? { solution: payload.solution } : {}),
    };
  }
  return { ...base, answer: payload.answer, solution: payload.solution };
}
