import { z } from "zod";
import { DifficultyLevelSchema, ExerciseTypeSchema } from "../exercises/schemas";
import { FeedbackStatusSchema } from "./schemas";

const IdString = z.string().min(1).max(128);

// Pure filter-membership index: denormalized replica of the filterable
// fields from both Exercises and Answers, keyed so listMyExercises can
// resolve "which exercise ids match feedbackStatus + other filters" without
// scanning Answers. Never a source of display content — callers hydrate
// title/maxPoints etc. from the live Exercises/Answers rows.
export const ExerciseAnswerFilterIndexItemSchema = z.object({
  userId: z.string().min(1),
  exerciseId: IdString,
  feedbackStatus: FeedbackStatusSchema,
  categoryId: IdString,
  exerciseType: ExerciseTypeSchema,
  difficultyLevel: DifficultyLevelSchema,
  titleSearchable: z.string(),
});
export interface ExerciseAnswerFilterIndexItem
  extends z.infer<typeof ExerciseAnswerFilterIndexItemSchema> {}
