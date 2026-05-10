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

export interface PageSlice<T> {
  content: T[];
  page: PageMetadata;
}

export function paginate<T>(
  items: T[],
  page: number,
  size: number,
): PageSlice<T> {
  const totalElements = items.length;
  const totalPages = totalElements === 0 ? 0 : Math.ceil(totalElements / size);
  const content = items.slice(page * size, page * size + size);
  return {
    content,
    page: { number: page, size, totalElements, totalPages },
  };
}
