import { z } from "zod";
import {
  LanguageCode,
  pickTranslation,
  TranslationsSchema,
} from "../i18n/language";

export const CategoryItemSchema = z.object({
  id: z.string().min(1).max(128),
  translations: TranslationsSchema,
});

export const CategorySchema = z.object({
  id: z.string().min(1).max(128),
  name: z.string(),
});

export interface CategoryItem extends z.infer<typeof CategoryItemSchema> {}
export interface Category extends z.infer<typeof CategorySchema> {}

export function toCategoryDto(item: CategoryItem, lang: LanguageCode): Category {
  return {
    id: item.id,
    name: pickTranslation(item.translations, lang),
  };
}
