import { z } from "zod";

export const PageMetadataSchema = z.object({
  number: z.number().int().nonnegative(),
  size: z.number().int().nonnegative(),
  totalElements: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});

export interface PageMetadata extends z.infer<typeof PageMetadataSchema> {}

export function pageOfSchema<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    content: z.array(item),
    page: PageMetadataSchema,
  });
}
