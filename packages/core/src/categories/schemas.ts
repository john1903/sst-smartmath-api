import { z } from "zod";
import {
  LanguageCode,
  LanguageCodeSchema,
  pickTranslation,
} from "../i18n/language";
import { pageOfSchema } from "../pagination/page";

export const CATEGORY_PK = "CATEGORY";
export const categorySK = (id: string) => `CAT#${id}`;

export const CategoryItemSchema = z.object({
  PK: z.literal(CATEGORY_PK),
  SK: z.string(),
  entityType: z.literal("category"),
  id: z.string().min(1).max(128),
  translations: z.record(LanguageCodeSchema, z.string().min(1)),
});

export const CategorySchema = z.object({
  id: z.string().min(1).max(128),
  name: z.string(),
});

export const PageOfCategorySchema = pageOfSchema(CategorySchema);

export interface CategoryItem extends z.infer<typeof CategoryItemSchema> {}
export interface Category extends z.infer<typeof CategorySchema> {}
export interface PageOfCategory extends z.infer<typeof PageOfCategorySchema> {}

export function toCategoryDto(item: CategoryItem, lang: LanguageCode): Category {
  return {
    id: item.id,
    name: pickTranslation(item.translations, lang),
  };
}
