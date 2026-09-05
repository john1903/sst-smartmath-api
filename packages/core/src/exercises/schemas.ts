import { z } from "zod";
import { LanguageCodeSchema } from "../i18n/language";
import type { FileDto } from "../files/schemas";

const StoredTranslationsSchema = z.record(LanguageCodeSchema, z.string().min(1));

const StoredIllustrationSchema = z.object({
  id: z.string().min(1).max(128),
  fileName: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(127),
  s3Key: z.string().min(1),
});
export type StoredIllustration = z.infer<typeof StoredIllustrationSchema>;

export const ExerciseTypeSchema = z.enum([
  "singleChoice",
  "multipleChoice",
  "trueFalse",
  "matching",
  "openEnded",
]);
export type ExerciseType = z.infer<typeof ExerciseTypeSchema>;

export const DifficultyLevelSchema = z.enum(["easy", "medium", "hard"]);
export type DifficultyLevel = z.infer<typeof DifficultyLevelSchema>;

const OptionsMap = z.record(z.string().min(1).max(4), z.string().min(1));
const StatementsMap = z.record(z.string().min(1).max(4), z.string().min(1));

const TranslationBase = z.object({
  languageCode: LanguageCodeSchema,
  title: z.string().min(1).max(255),
  description: z.string().min(1).max(2048),
});

export const TranslationSingleChoiceSchema = TranslationBase.extend({
  exerciseType: z.literal("singleChoice"),
  options: OptionsMap,
  solution: z.string().min(1),
});

export const TranslationMultipleChoiceSchema = TranslationBase.extend({
  exerciseType: z.literal("multipleChoice"),
  options: OptionsMap,
  solution: z.array(z.string().min(1)).min(1),
});

export const TranslationTrueFalseSchema = TranslationBase.extend({
  exerciseType: z.literal("trueFalse"),
  statements: StatementsMap,
  solution: z.record(z.string().min(1).max(4), z.boolean()),
});

export const TranslationMatchingSchema = TranslationBase.extend({
  exerciseType: z.literal("matching"),
  optionsRowFirst: OptionsMap,
  optionsRowSecond: OptionsMap,
  solution: z.record(z.string().min(1).max(4), z.number().int()),
});

export const TranslationOpenEndedSchema = TranslationBase.extend({
  exerciseType: z.literal("openEnded"),
  solution: z.string().min(1).max(2048),
  steps: z.array(z.string().min(1)).min(1),
});

export function validateTranslationInvariants(
  translations: ExerciseTranslation[],
): { field: string; message: string }[] {
  const errors: { field: string; message: string }[] = [];
  for (let i = 0; i < translations.length; i++) {
    const t = translations[i];
    const prefix = `translations[${i}]`;
    switch (t.exerciseType) {
      case "singleChoice":
        if (!Object.keys(t.options).includes(t.solution)) {
          errors.push({
            field: `${prefix}.solution`,
            message: "solution must be a key in options",
          });
        }
        break;
      case "multipleChoice":
        if (new Set(t.solution).size !== t.solution.length) {
          errors.push({
            field: `${prefix}.solution`,
            message: "solution entries must be unique",
          });
        }
        if (!t.solution.every((k) => Object.keys(t.options).includes(k))) {
          errors.push({
            field: `${prefix}.solution`,
            message: "solution entries must all be keys in options",
          });
        }
        break;
      case "trueFalse":
        if (
          !Object.keys(t.solution).every((k) =>
            Object.keys(t.statements).includes(k),
          )
        ) {
          errors.push({
            field: `${prefix}.solution`,
            message: "solution keys must all appear in statements",
          });
        }
        break;
      case "matching":
        if (
          !Object.keys(t.solution).every((k) =>
            Object.keys(t.optionsRowFirst).includes(k),
          )
        ) {
          errors.push({
            field: `${prefix}.solution`,
            message: "solution keys must all appear in optionsRowFirst",
          });
        }
        break;
    }
  }
  return errors;
}

export const ExerciseTranslationSchema = z.discriminatedUnion("exerciseType", [
  TranslationSingleChoiceSchema,
  TranslationMultipleChoiceSchema,
  TranslationTrueFalseSchema,
  TranslationMatchingSchema,
  TranslationOpenEndedSchema,
]);
export type ExerciseTranslation = z.infer<typeof ExerciseTranslationSchema>;

const IdString = z.string().min(1).max(128);

const CreateExerciseBaseSchema = z.object({
  categoryId: IdString,
  detailedRequirementIds: z.array(IdString).min(1),
  illustrationIds: z.array(IdString).optional(),
  difficultyLevel: DifficultyLevelSchema,
  maxPoints: z.number().positive(),
  translations: z.array(ExerciseTranslationSchema).min(1),
});

export const CreateExerciseRequestSchema = CreateExerciseBaseSchema.superRefine(
  (body, ctx) => runRequestInvariants(body, ctx),
);
export type CreateExerciseRequest = z.infer<typeof CreateExerciseRequestSchema>;

function runRequestInvariants(
  body: {
    detailedRequirementIds?: string[];
    translations?: ExerciseTranslation[];
  },
  ctx: z.RefinementCtx,
) {
  if (body.translations && body.translations.length > 0) {
    const firstType = body.translations[0].exerciseType;
    if (!body.translations.every((t) => t.exerciseType === firstType)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["translations"],
        message: "all translations must share the same exerciseType",
      });
    }
    const seenLangs = new Set<string>();
    for (const t of body.translations) {
      if (seenLangs.has(t.languageCode)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["translations"],
          message: `duplicate translation for language ${t.languageCode}`,
        });
      }
      seenLangs.add(t.languageCode);
    }
  }
  if (
    body.detailedRequirementIds &&
    new Set(body.detailedRequirementIds).size !==
      body.detailedRequirementIds.length
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["detailedRequirementIds"],
      message: "detailedRequirementIds must be unique",
    });
  }
}

export const UpdateExerciseRequestSchema = z
  .object({
    categoryId: IdString,
    detailedRequirementIds: z.array(IdString).min(1),
    illustrationIds: z.array(IdString),
    difficultyLevel: DifficultyLevelSchema,
    maxPoints: z.number().positive(),
    translations: z.array(ExerciseTranslationSchema).min(1),
  })
  .partial()
  .superRefine((body, ctx) => runRequestInvariants(body, ctx));
export type UpdateExerciseRequest = z.infer<typeof UpdateExerciseRequestSchema>;

export const ExerciseItemSchema = z.object({
  id: IdString,
  exerciseType: ExerciseTypeSchema,
  difficultyLevel: DifficultyLevelSchema,
  maxPoints: z.number().positive(),
  categoryId: IdString,
  categoryTranslations: StoredTranslationsSchema,
  detailedRequirementIds: z.array(IdString).min(1),
  detailedRequirementTranslations: z.record(IdString, StoredTranslationsSchema),
  illustrations: z.array(StoredIllustrationSchema).default([]),
  translations: z.record(LanguageCodeSchema, z.unknown()),
  titleSearchable: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export interface ExerciseItem extends z.infer<typeof ExerciseItemSchema> {}

export interface ExerciseAdminDto {
  id: string;
  exerciseType: ExerciseType;
  difficultyLevel: DifficultyLevel;
  maxPoints: number;
  categoryId: string;
  detailedRequirementIds: string[];
  illustrations?: FileDto[];
  translations: ExerciseTranslation[];
}

export async function toExerciseAdminDto(
  item: ExerciseItem,
  presignUri: (s3Key: string) => Promise<string>,
): Promise<ExerciseAdminDto> {
  const translations = Object.entries(item.translations).map(
    ([languageCode, payload]) => ({
      ...(payload as Omit<ExerciseTranslation, "languageCode">),
      languageCode: languageCode as ExerciseTranslation["languageCode"],
    }),
  ) as ExerciseTranslation[];
  const illustrations: FileDto[] = await Promise.all(
    item.illustrations.map(async (ill) => ({
      id: ill.id,
      fileName: ill.fileName,
      uri: await presignUri(ill.s3Key),
      mimeType: ill.mimeType,
    })),
  );
  return {
    id: item.id,
    exerciseType: item.exerciseType,
    difficultyLevel: item.difficultyLevel,
    maxPoints: item.maxPoints,
    categoryId: item.categoryId,
    detailedRequirementIds: item.detailedRequirementIds,
    illustrations: illustrations.length ? illustrations : undefined,
    translations,
  };
}

export function titleSearchableFrom(
  translations: ExerciseTranslation[],
): string {
  return translations
    .map((t) => t.title.toLowerCase())
    .join(" ")
    .trim();
}

export function splitTranslation(t: ExerciseTranslation): {
  languageCode: string;
  payload: Omit<ExerciseTranslation, "languageCode">;
} {
  const { languageCode, ...payload } = t;
  return { languageCode, payload };
}
