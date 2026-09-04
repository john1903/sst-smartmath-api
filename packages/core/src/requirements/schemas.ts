import { z } from "zod";
import {
  LanguageCode,
  pickTranslation,
  TranslationsSchema,
} from "../i18n/language";

export const RequirementItemSchema = z.object({
  id: z.string().min(1).max(128),
  categoryId: z.string().min(1).max(128),
  translations: TranslationsSchema,
});

export const RequirementSchema = z.object({
  id: z.string().min(1).max(128),
  categoryId: z.string().min(1).max(128),
  definition: z.string(),
});

export interface RequirementItem extends z.infer<typeof RequirementItemSchema> {}
export interface Requirement extends z.infer<typeof RequirementSchema> {}

export function toRequirementDto(
  item: RequirementItem,
  lang: LanguageCode,
): Requirement {
  return {
    id: item.id,
    categoryId: item.categoryId,
    definition: pickTranslation(item.translations, lang),
  };
}
